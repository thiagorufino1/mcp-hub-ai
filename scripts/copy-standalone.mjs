import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const buildDir = join(root, ".next-package");
const standaloneSource = join(buildDir, "standalone");
const standaloneTarget = join(root, ".next", "standalone");
const runtimeDir = join(standaloneTarget, ".next-package");

function pruneStandaloneArtifacts(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "cache" || entry.name === "diagnostics") {
        rmSync(entryPath, { force: true, recursive: true });
        continue;
      }

      pruneStandaloneArtifacts(entryPath);
      continue;
    }

    if (
      entry.name.endsWith(".map") ||
      entry.name.endsWith(".nft.json") ||
      entry.name === "trace" ||
      entry.name === "trace-build"
    ) {
      rmSync(entryPath, { force: true });
    }
  }
}

if (!existsSync(standaloneSource)) {
  console.error("Error: .next-package/standalone not found. Run `npm run build:package` first.");
  process.exit(1);
}

rmSync(standaloneTarget, { force: true, recursive: true });
mkdirSync(join(root, ".next"), { recursive: true });
cpSync(standaloneSource, standaloneTarget, { recursive: true });

const publicDir = join(root, "public");
if (existsSync(publicDir)) {
  cpSync(publicDir, join(standaloneTarget, "public"), { recursive: true });
}

cpSync(join(buildDir, "static"), join(runtimeDir, "static"), {
  recursive: true,
});

cpSync(join(buildDir, "server"), join(runtimeDir, "server"), {
  recursive: true,
});

for (const entry of readdirSync(standaloneTarget)) {
  if (entry === ".env" || entry.startsWith(".env.")) {
    rmSync(join(standaloneTarget, entry), { force: true });
  }
}

pruneStandaloneArtifacts(standaloneTarget);

console.log("Standalone assets copied successfully.");
