const axios = require("axios");

const ADMOB_BASE_URL = "https://admob.googleapis.com/v1";

/**
 * Ensures account identifier has the accounts/ prefix
 */
function normalizeAccountName(publisherAccountId) {
  if (!publisherAccountId) return "";
  let cleanId = publisherAccountId.trim();
  if (!cleanId.startsWith("accounts/")) {
    if (!cleanId.startsWith("pub-")) {
      cleanId = `pub-${cleanId}`;
    }
    cleanId = `accounts/${cleanId}`;
  }
  return cleanId;
}

/**
 * Fetch list of AdMob publisher accounts
 */
async function getPublisherAccounts(accessToken) {
  const response = await axios.get(`${ADMOB_BASE_URL}/accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  return response.data?.account || [];
}

/**
 * Fetch registered AdMob apps for an account
 */
async function getApps(accessToken, publisherAccountId) {
  const accountName = normalizeAccountName(publisherAccountId);
  if (!accountName) {
    throw new Error("Publisher Account ID is required to fetch AdMob apps.");
  }

  const response = await axios.get(`${ADMOB_BASE_URL}/${accountName}/apps`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const rawApps = response.data?.apps || [];
  return rawApps.map((app) => ({
    appId: app.appId || "",
    name: app.manualAppInfo?.displayName || app.appStoreInfo?.displayName || "AdMob App",
    platform: (app.platform || "ANDROID").toUpperCase(),
    resourceName: app.name,
  }));
}

/**
 * Fetch available AdMob ad units for an account
 */
async function getAdUnits(accessToken, publisherAccountId) {
  const accountName = normalizeAccountName(publisherAccountId);
  if (!accountName) {
    throw new Error("Publisher Account ID is required to fetch AdMob ad units.");
  }

  const response = await axios.get(`${ADMOB_BASE_URL}/${accountName}/adUnits`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const rawUnits = response.data?.adUnits || [];
  return rawUnits.map((unit) => ({
    adUnitId: unit.adUnitId || "",
    name: unit.displayName || "Ad Unit",
    adFormat: unit.adFormat || "UNKNOWN",
    appId: unit.appId || "",
    resourceName: unit.name,
  }));
}

/**
 * Query AdMob Network Report API for performance and earnings
 */
async function generateNetworkReport(accessToken, publisherAccountId, startDateObj, endDateObj) {
  const accountName = normalizeAccountName(publisherAccountId);
  if (!accountName) {
    throw new Error("Publisher Account ID is required to generate network report.");
  }

  const requestPayload = {
    reportSpec: {
      dateRange: {
        startDate: {
          year: startDateObj.getFullYear(),
          month: startDateObj.getMonth() + 1,
          day: startDateObj.getDate(),
        },
        endDate: {
          year: endDateObj.getFullYear(),
          month: endDateObj.getMonth() + 1,
          day: endDateObj.getDate(),
        },
      },
      dimensions: ["DATE"],
      metrics: [
        "IMPRESSIONS",
        "CLICKS",
        "ESTIMATED_EARNINGS",
        "AD_REQUESTS",
        "MATCHED_REQUESTS",
        "MATCH_RATE",
      ],
    },
  };

  const response = await axios.post(
    `${ADMOB_BASE_URL}/${accountName}/networkReport:generate`,
    requestPayload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const rawRows = Array.isArray(response.data) ? response.data : [];
  const parsedRecords = [];

  for (const item of rawRows) {
    if (item.row) {
      const row = item.row;
      const rawDate = row.dimensionValues?.DATE?.value || "";
      // Formatted date YYYY-MM-DD from YYYYMMDD
      const formattedDate =
        rawDate.length === 8
          ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
          : rawDate;

      const impressions = Number(row.metricValues?.IMPRESSIONS?.integerValue || 0);
      const adRequests = Number(row.metricValues?.AD_REQUESTS?.integerValue || 0);
      const matchedRequests = Number(row.metricValues?.MATCHED_REQUESTS?.integerValue || 0);
      const matchRate = Number(row.metricValues?.MATCH_RATE?.doubleValue || 0) * 100;
      const clicks = Number(row.metricValues?.CLICKS?.integerValue || 0);
      const microsEarnings = Number(row.metricValues?.ESTIMATED_EARNINGS?.microsValue || 0);
      const estimatedEarnings = microsEarnings / 1000000;

      parsedRecords.push({
        date: formattedDate,
        impressions,
        adRequests,
        matchedRequests,
        matchRate,
        clicks,
        estimatedEarnings,
      });
    }
  }

  return parsedRecords;
}

module.exports = {
  getPublisherAccounts,
  getApps,
  getAdUnits,
  generateNetworkReport,
};
