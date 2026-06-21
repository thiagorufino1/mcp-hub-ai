import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publishDir = join(root, ".npm-package");
const sourcePackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const staticSource = existsSync(join(root, ".next-package", "static"))
  ? join(root, ".next-package", "static")
  : join(root, ".next", "static");

const runtimePackage = {
  name: sourcePackage.name,
  version: sourcePackage.version,
  private: false,
  description: sourcePackage.description,
  license: sourcePackage.license,
  author: sourcePackage.author,
  repository: sourcePackage.repository,
  homepage: sourcePackage.homepage,
  bugs: sourcePackage.bugs,
  publishConfig: sourcePackage.publishConfig,
  bin: sourcePackage.bin,
  files: [
    ".next/standalone",
    "bin",
  ],
  engines: sourcePackage.engines,
  keywords: sourcePackage.keywords,
  dependencies: {
    open: sourcePackage.dependencies.open,
  },
};

rmSync(publishDir, { force: true, recursive: true });
mkdirSync(publishDir, { recursive: true });

cpSync(join(root, "bin"), join(publishDir, "bin"), { recursive: true });
cpSync(join(root, ".next", "standalone"), join(publishDir, ".next", "standalone"), {
  recursive: true,
});
cpSync(
  staticSource,
  join(publishDir, ".next", "standalone", ".next-package", "static"),
  { recursive: true },
);
cpSync(join(root, "README.md"), join(publishDir, "README.md"));
cpSync(join(root, "LICENSE"), join(publishDir, "LICENSE"));

writeFileSync(
  join(publishDir, "package.json"),
  `${JSON.stringify(runtimePackage, null, 2)}\n`,
);
