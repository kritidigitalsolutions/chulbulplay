const fs = require("fs/promises");
const https = require("https");
const path = require("path");

const { fetch: nodeFetch, AbortController: NodeAbortController } = globalThis;
let fetchImpl = nodeFetch;
let AbortControllerImpl = NodeAbortController;

if (!fetchImpl || !AbortControllerImpl) {
  try {
    const {
      fetch: undiciFetch,
      AbortController: UndiciAbortController,
    } = require("undici");

    fetchImpl = fetchImpl || undiciFetch;
    AbortControllerImpl = AbortControllerImpl || UndiciAbortController;
  } catch {
    // undici is optional when Node 18+ globals are available
  }
}

if (!fetchImpl || !AbortControllerImpl) {
  throw new Error(
    "Global fetch and AbortController are required. Use Node 18+ or install undici."
  );
}

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const normalizeStorageHost = (value) => {
  if (value) {
    return String(value)
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
  }

  return "storage.bunnycdn.com";
};

const getStorageHosts = (storageHost) => {
  return [...new Set([storageHost, "storage.bunnycdn.com"].filter(Boolean))];
};

let discoveredConfigPromise = null;

const getArrayResponseItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.Items)) return payload.Items;
  return [];
};

const selectStorageZone = (zones) => {
  const activeZones = zones.filter((zone) => !zone.Deleted);

  if (!activeZones.length) {
    throw new Error("No active Bunny storage zones found for BUNNY_ACCESS_KEY");
  }

  if (activeZones.length === 1) {
    return activeZones[0];
  }

  const zonesWithPullZone = activeZones.filter((zone) => {
    return Array.isArray(zone.PullZones) && zone.PullZones.length > 0;
  });

  if (zonesWithPullZone.length === 1) {
    return zonesWithPullZone[0];
  }

  return zonesWithPullZone[0] || activeZones[0];
};

const selectCdnUrl = (zone) => {
  const pullZones = Array.isArray(zone.PullZones) ? zone.PullZones : [];
  const enabledPullZone = pullZones.find((pullZone) => {
    return pullZone?.Enabled && !pullZone?.Suspended;
  }) || pullZones[0];

  const hostnames = Array.isArray(enabledPullZone?.Hostnames)
    ? enabledPullZone.Hostnames
    : [];

  const hostname =
    hostnames.find((item) => item?.IsSystemHostname)?.Value ||
    hostnames.find((item) => item?.Value)?.Value ||
    (enabledPullZone?.Name ? `${enabledPullZone.Name}.b-cdn.net` : "");

  if (!hostname) {
    throw new Error("No Bunny pull zone hostname found for the selected storage zone");
  }

  return normalizeBaseUrl(`https://${hostname}`);
};

const discoverConfigFromBunny = async (accountAccessKey) => {
  const response = await fetchImpl("https://api.bunny.net/storagezone", {
    headers: {
      AccessKey: accountAccessKey,
    },
  });

  if (!response.ok) {
    const message = await readResponseBody(response);
    throw new Error(
      `Bunny config discovery failed (${response.status}): ${message || response.statusText}`
    );
  }

  const zones = getArrayResponseItems(await response.json());
  const envStorageZone = String(process.env.BUNNY_STORAGE_ZONE || "").trim();
  const selectedZone = envStorageZone
    ? zones.find((zone) => String(zone.Name || "").trim() === envStorageZone)
    : selectStorageZone(zones);

  if (!selectedZone) {
    throw new Error(`Bunny storage zone not found: ${envStorageZone}`);
  }

  const storageHost = normalizeStorageHost(selectedZone.StorageHostname);
  const storageAccessKey = String(selectedZone.Password || "").trim();

  if (!storageAccessKey) {
    throw new Error("Selected Bunny storage zone is missing an upload password");
  }

  return {
    storageZone: String(selectedZone.Name || "").trim(),
    accessKey: storageAccessKey,
    storageHost,
    storageHosts: getStorageHosts(storageHost),
    cdnUrl: selectCdnUrl(selectedZone),
  };
};

const encodePathPart = (part) => {
  try {
    return encodeURIComponent(decodeURIComponent(part));
  } catch {
    return encodeURIComponent(part);
  }
};

const getConfig = () => {
  const storageZone = String(process.env.BUNNY_STORAGE_ZONE || "").trim();
  const accessKey = String(process.env.BUNNY_ACCESS_KEY || "").trim();
  const storageHost = normalizeStorageHost(process.env.BUNNY_STORAGE_HOST);
  const cdnUrl = normalizeBaseUrl(process.env.BUNNY_CDN_URL);

  const missing = [];
  if (!accessKey) missing.push("BUNNY_ACCESS_KEY");

  if (missing.length) {
    throw new Error(`Missing Bunny CDN config: ${missing.join(", ")}`);
  }

  if (!storageZone || !cdnUrl) {
    return null;
  }

  return {
    storageZone,
    accessKey,
    storageHost,
    storageHosts: getStorageHosts(storageHost),
    cdnUrl,
  };
};

const getConfigAsync = async () => {
  const staticConfig = getConfig();
  if (staticConfig) {
    return staticConfig;
  }

  if (!discoveredConfigPromise) {
    discoveredConfigPromise = discoverConfigFromBunny(
      String(process.env.BUNNY_ACCESS_KEY || "").trim()
    );
  }

  return discoveredConfigPromise;
};

const getClientUploadConfig = async () => {
  const {
    storageZone,
    accessKey,
    storageHosts,
    cdnUrl,
  } = await getConfigAsync();

  return {
    storageZone,
    accessKey,
    storageHost: storageHosts[0],
    storageHosts,
    cdnUrl,
  };
};

const sanitizeRemotePath = (remotePath) => {
  const normalized = String(remotePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const parts = normalized.split("/").filter(Boolean);

  if (
    !parts.length ||
    parts.some((part) => part === "." || part === "..")
  ) {
    throw new Error("Invalid Bunny remote path");
  }

  return parts.map(encodePathPart).join("/");
};

const buildPublicUrl = (remotePath) => {
  const { cdnUrl } = getConfig() || {};
  if (!cdnUrl) {
    throw new Error("Bunny CDN URL is not available until config discovery completes");
  }
  return `${cdnUrl}/${sanitizeRemotePath(remotePath)}`;
};

const withUploadTimeout = async (uploadRequest) => {
  const controller = new AbortControllerImpl();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 30 * 60 * 1000);

  try {
    return await uploadRequest(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const requestWithHostFallback = async ({
  hosts,
  storageZone,
  remotePath,
  requestOptions,
}) => {
  let lastResponse = null;

  for (const host of hosts) {
    const requestUrl = `https://${host}/${storageZone}/${remotePath}`;
    const response = await requestOptions(requestUrl);

    if (response.ok || response.status !== 401) {
      return response;
    }

    lastResponse = response;
  }

  return lastResponse;
};

const readResponseBody = (response) => {
  if (typeof response.text === "function") {
    return response.text().catch(() => "");
  }

  return Promise.resolve(response.body || "");
};

const uploadStreamRequest = ({
  stream,
  uploadUrl,
  headers,
  timeoutMs = 30 * 60 * 1000,
}) => {
  return new Promise((resolve, reject) => {
    const req = https.request(uploadUrl, {
      method: "PUT",
      headers,
      timeout: timeoutMs,
    }, (res) => {
      let body = "";

      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          body,
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Bunny upload timed out"));
    });

    req.on("error", reject);
    stream.on("error", reject);
    stream.pipe(req);
  });
};

const uploadBufferToBunny = async ({
  buffer,
  remotePath,
  contentType = "application/octet-stream",
}) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Bunny upload buffer is required");
  }

  const {
    storageZone,
    accessKey,
    storageHosts,
  } = await getConfigAsync();

  const safeRemotePath = sanitizeRemotePath(remotePath);

  const response = await requestWithHostFallback({
    hosts: storageHosts,
    storageZone,
    remotePath: safeRemotePath,
    requestOptions: (uploadUrl) => withUploadTimeout((signal) => fetchImpl(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: accessKey,
        "Content-Type": contentType,
      },
      body: buffer,
      signal,
    })),

  });

  if (!response.ok) {
    const message = await readResponseBody(response);
    throw new Error(
      `Bunny upload failed (${response.status}): ${message || response.statusText}`
    );
  }

  return {
    path: safeRemotePath,
    url: `${(await getConfigAsync()).cdnUrl}/${safeRemotePath}`,
  };
};

const uploadStreamToBunny = async ({
  stream,
  remotePath,
  contentType = "application/octet-stream",
  contentLength,
}) => {
  const {
    storageZone,
    accessKey,
    storageHosts,
  } = await getConfigAsync();

  const safeRemotePath = sanitizeRemotePath(remotePath);

  const headers = {
    AccessKey: accessKey,
    "Content-Type": contentType,
  };

  if (contentLength) {
    headers["Content-Length"] = String(contentLength);
  }
  console.log("BUNNY_ACCESS_KEY:", process.env.BUNNY_ACCESS_KEY?.substring(0, 8));
  console.log("BUNNY_STORAGE_ZONE:", process.env.BUNNY_STORAGE_ZONE);
  console.log("BUNNY_STORAGE_HOST:", process.env.BUNNY_STORAGE_HOST);

  const uploadUrl = `https://${storageHosts[0]}/${storageZone}/${safeRemotePath}`;
  const response = await uploadStreamRequest({
    stream,
    uploadUrl,
    headers,
  });

  if (!response.ok) {
    const message = await readResponseBody(response);
    throw new Error(
      `Bunny upload failed (${response.status}): ${message || response.statusText}`
    );
  }

  return {
    path: safeRemotePath,
    url: `${(await getConfigAsync()).cdnUrl}/${safeRemotePath}`,
  };
};

const uploadFileToBunny = async ({
  filePath,
  remotePath,
  contentType,
}) => {
  const buffer = await fs.readFile(filePath);

  return uploadBufferToBunny({
    buffer,
    remotePath,
    contentType,
  });
};

const uploadMulterFileToBunny = async (file, remoteFolder = "") => {
  if (!file) {
    return null;
  }

  const fileName = file.filename || `${Date.now()}-${file.originalname}`;
  const remotePath = path.posix.join(
    String(remoteFolder || "").replace(/\\/g, "/"),
    fileName
  );

  if (file.buffer) {
    return uploadBufferToBunny({
      buffer: file.buffer,
      remotePath,
      contentType: file.mimetype,
    });
  }

  return uploadFileToBunny({
    filePath: file.path,
    remotePath,
    contentType: file.mimetype,
  });
};

const deleteFromBunny = async (remotePathOrUrl) => {
  const {
    storageZone,
    accessKey,
    storageHosts,
    cdnUrl,
  } = await getConfigAsync();

  let remotePath = String(remotePathOrUrl || "");

  if (remotePath.startsWith(cdnUrl)) {
    remotePath = remotePath.slice(cdnUrl.length);
  }

  const safeRemotePath = sanitizeRemotePath(remotePath);

  const response = await requestWithHostFallback({
    hosts: storageHosts,
    storageZone,
    remotePath: safeRemotePath,
    requestOptions: (deleteUrl) => fetchImpl(deleteUrl, {
      method: "DELETE",
      headers: {
        AccessKey: accessKey,
      },
    }),
  });

  if (!response.ok && response.status !== 404) {
    const message = await readResponseBody(response);
    throw new Error(
      `Bunny delete failed (${response.status}): ${message || response.statusText}`
    );
  }

  return true;
};

module.exports = {
  buildPublicUrl,
  deleteFromBunny,
  getClientUploadConfig,
  uploadBufferToBunny,
  uploadFileToBunny,
  uploadMulterFileToBunny,
  uploadStreamToBunny,
};
