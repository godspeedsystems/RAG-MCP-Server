#!/usr/bin/env node

const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

try {
  // Path to package root
  const pkgRoot = path.join(path.resolve(__dirname, ".."),"rag-node");


  // Change working directory to the package root

  if (os.platform() === "win32") {
    const batPath = path.join(pkgRoot, "start_clean.bat");
    console.log(`Running (Windows): ${batPath}`);
    execSync(`start_clean.bat`, { stdio: "inherit", cwd: pkgRoot });
  } else {
    const shPath = path.join(pkgRoot, "start_clean.sh");
    if (!fs.existsSync(shPath)) {
      throw new Error("start_clean.sh not found");
    }
    console.log(`Running (Unix): ${shPath}`);
    execSync(`chmod +x start_clean.sh`, { stdio: "inherit", cwd: pkgRoot }); 
    execSync(`bash start_clean.sh`, { stdio: "inherit" ,cwd: pkgRoot});
  }
} catch (err) {
  console.error("Failed to execute start_clean script:", err.message);
  process.exit(1);
}
