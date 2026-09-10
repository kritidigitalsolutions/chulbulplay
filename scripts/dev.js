const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const services = ["backend", "frontend"];
const children = [];
let isStopping = false;

function stop(exitCode = 0) {
  if (isStopping) return;
  isStopping = true;

  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }

  process.exitCode = exitCode;
}

for (const service of services) {
  const child = spawn(npm, ["run", "dev"], {
    cwd: path.join(root, service),
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  children.push(child);
  child.on("error", (error) => {
    console.error(`Could not start ${service}: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!isStopping) {
      console.error(`${service} stopped unexpectedly (exit code ${code ?? "unknown"}).`);
      stop(code || 1);
    }
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
