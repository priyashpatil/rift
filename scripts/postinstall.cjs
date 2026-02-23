const { createWriteStream, chmodSync, mkdirSync } = require("fs");
const { join } = require("path");
const https = require("https");

const VERSION = require("../package.json").version;

const PLATFORMS = {
  "darwin-arm64": "rift-darwin-arm64",
  "darwin-x64": "rift-darwin-x64",
  "linux-x64": "rift-linux-x64",
  "linux-arm64": "rift-linux-arm64",
};

const key = `${process.platform}-${process.arch}`;
const asset = PLATFORMS[key];

if (!asset) {
  console.error(`Unsupported platform: ${process.platform}-${process.arch}`);
  process.exit(1);
}

const url = `https://github.com/priyashpatil/rift/releases/download/v${VERSION}/${asset}`;
const dest = join(__dirname, "..", "bin", "rift");

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }
        const file = createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          chmodSync(dest, 0o755);
          resolve();
        });
      })
      .on("error", reject);
  });
}

download(url)
  .then(() => console.log("rift: installed binary for", key))
  .catch((err) => {
    console.error("rift: failed to download binary:", err.message);
    console.error(`You can download manually from: ${url}`);
    process.exit(1);
  });
