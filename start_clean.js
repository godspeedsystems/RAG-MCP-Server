#!/usr/bin/env node

const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

try {
  // Path to package root
   const isWindows = os.platform() === "win32";
  const pkgRoot = path.join(path.resolve(__dirname, ".."),"rag-mcp");
  // const entryFile = path.join("dist", "index.js");
  if(isWindows){
    execSync(`node dist\\index.js`, { stdio: "inherit", cwd: pkgRoot });
  }
  else{
    execSync(`node dist/index.js`, { stdio: "inherit", cwd: pkgRoot });

  }
} catch (err) {
  console.error("Failed to execute script:", err.message);
  process.exit(1);
}
