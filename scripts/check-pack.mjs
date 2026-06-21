import { execSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const standaloneServerPath = join(root, ".next", "standalone", "server.js");
const publishDir = join(root, ".npm-package");

function extractLastJsonArray(raw) {
  const trimmed = raw.trim();

  for (let index = trimmed.lastIndexOf("["); index >= 0; index = trimmed.lastIndexOf("[", index - 1)) {
    const candidate = trimmed.slice(index);
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue searching for the JSON payload emitted by npm.
    }
  }

  throw new Error(`Could not parse npm pack JSON output.\n${raw}`);
}

try {
  if (!existsSync(standaloneServerPath)) {
    execSync("npm run build:package", {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
  }

  if (!existsSync(standaloneServerPath)) {
    throw new Error("Standalone server.js was not produced by build:package.");
  }

  if (!existsSync(publishDir)) {
    execSync("node scripts/prepare-publish-dir.mjs", {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
  }

  const raw = execSync("npm pack --dry-run --json --ignore-scripts .", {
    cwd: publishDir,
    encoding: "utf8",
  });

  const [result] = extractLastJsonArray(raw);

  if (!result) {
    console.error("npm pack --dry-run returned no result.");
    process.exit(1);
  }

  const entries = result.files.map((file) => file.path);
  const duplicatedStatic = entries.some((filePath) => filePath.startsWith(".next/static/"));
  const bundledStatic = entries.some((filePath) =>
    filePath.startsWith(".next/standalone/.next-package/static/"),
  );
  const runtimeManifest = result.files.find((file) => file.path === "package.json");

  if (!bundledStatic) {
    console.error("Pack check failed: standalone static assets are missing.");
    process.exit(1);
  }

  if (duplicatedStatic) {
    console.error("Pack check failed: duplicate .next/static files detected outside standalone bundle.");
    process.exit(1);
  }

  if (result.unpackedSize > 50 * 1024 * 1024) {
    console.error(
      `Pack check failed: unpacked size too large (${result.unpackedSize} bytes).`,
    );
    process.exit(1);
  }

  if (!runtimeManifest) {
    console.error("Pack check failed: runtime package.json is missing from the tarball.");
    process.exit(1);
  }

  console.log(
    `Pack check OK. package=${result.name}@${result.version} files=${result.files.length} unpacked=${result.unpackedSize}`,
  );
} finally {
  // No-op. Build artifacts are intentionally left in place for inspection.
}
