import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const packageJson = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
);

test("package manifest ships standalone bundle without duplicate static root", () => {
  assert.ok(Array.isArray(packageJson.files));
  assert.ok(packageJson.files.includes(".next/standalone"));
  assert.ok(!packageJson.files.includes(".next/static"));
  assert.ok(!packageJson.files.includes(".next-package"));
});

test("package manifest exposes verification scripts", () => {
  assert.equal(typeof packageJson.scripts?.test, "string");
  assert.equal(typeof packageJson.scripts?.["test:smoke"], "string");
  assert.equal(typeof packageJson.scripts?.typecheck, "string");
  assert.equal(typeof packageJson.scripts?.["prepare:publish-dir"], "string");
  assert.equal(typeof packageJson.scripts?.["pack:check"], "string");
});

test("@lobehub/icons is declared as a dependency", () => {
  assert.ok(
    packageJson.dependencies?.["@lobehub/icons"],
    "@lobehub/icons must be in dependencies — provider icons depend on it",
  );
});

test("provider-logo uses @lobehub/icons not text labels", () => {
  const require = createRequire(import.meta.url);
  const logoSrc = fs.readFileSync(
    path.join(process.cwd(), "src/components/setup/provider-logo.tsx"),
    "utf8",
  );
  assert.ok(
    logoSrc.includes("@lobehub/icons"),
    "provider-logo.tsx must import from @lobehub/icons",
  );
  assert.ok(
    !logoSrc.includes('label:') && !logoSrc.match(/label:\s*["'][A-Z]/),
    "provider-logo.tsx must not use text label fallbacks",
  );
});
