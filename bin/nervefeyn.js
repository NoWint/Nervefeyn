#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MIN_NODE_VERSION = "22.19.0";
const MAX_NODE_MAJOR = 25;
const PREFERRED_NODE_MAJOR = 24;

function parseNodeVersion(version) {
  const [major = "0", minor = "0", patch = "0"] = version.replace(/^v/, "").split(".");
  return {
    major: Number.parseInt(major, 10) || 0,
    minor: Number.parseInt(minor, 10) || 0,
    patch: Number.parseInt(patch, 10) || 0,
  };
}

function compareNodeVersions(left, right) {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

const parsedNodeVersion = parseNodeVersion(process.versions.node);
if (compareNodeVersions(parsedNodeVersion, parseNodeVersion(MIN_NODE_VERSION)) < 0 || parsedNodeVersion.major > MAX_NODE_MAJOR) {
  const isWindows = process.platform === "win32";
  console.error(`nervefeyn 支持 Node.js ${MIN_NODE_VERSION} through ${MAX_NODE_MAJOR}.x (detected ${process.versions.node}).`);
  console.error(parsedNodeVersion.major > MAX_NODE_MAJOR
    ? "此 Node 版本暂不支持。"
    : isWindows
      ? "从以下地址安装受支持的 Node.js 版本: https://nodejs.org, or use the standalone installer:"
      : `切换到受支持的 Node 版本: \`nvm install ${PREFERRED_NODE_MAJOR} && nvm use ${PREFERRED_NODE_MAJOR}\`, or use the standalone installer:`);
  console.error(isWindows
    ? "irm https://nervefeyn.dev/install.ps1 | iex"
    : "curl -fsSL https://nervefeyn.dev/install | bash");
  process.exit(1);
}
const here = import.meta.dirname;

await import(pathToFileURL(resolve(here, "..", "scripts", "patch-embedded-pi.mjs")).href);
await import(pathToFileURL(resolve(here, "..", "dist", "index.js")).href);
