import { copyFile, mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

const candidateDirs = [
  path.join(".next", "types"),
  path.join(".next", "dev", "types"),
  path.join(".next-package", "types"),
  path.join(".next-package", "dev", "types"),
];

const stub = "export {};\n";

for (const dir of candidateDirs) {
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) {
      continue;
    }

    const target = path.join(dir, "routes.js");
    const declarations = path.join(dir, "routes.js.d.ts");
    const sourceDeclarations = path.join(dir, "routes.d.ts");
    let current = null;
    try {
      current = await readFile(target, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }

    if (current !== stub) {
      await mkdir(dir, { recursive: true });
      await writeFile(target, stub, "utf8");
    }

    try {
      await copyFile(sourceDeclarations, declarations);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}
