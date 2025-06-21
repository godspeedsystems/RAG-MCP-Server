// fix-line-endings.js
const fs = require("fs");
const path = require("path");

const targetFile = path.join(__dirname, "start_clean.sh");

if (!fs.existsSync(targetFile)) {
  console.error("❌ start_clean.sh not found.");
  process.exit(1);
}

let content = fs.readFileSync(targetFile, "utf8");

// Replace Windows CRLF (\r\n) with Unix LF (\n)
content = content.replace(/\r\n/g, "\n");

// Optional: also trim trailing whitespace
content = content.replace(/[ \t]+$/gm, "");

fs.writeFileSync(targetFile, content, "utf8");
// console.log("Converted line endings in start_clean.sh to Unix format.");
