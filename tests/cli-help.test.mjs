import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const cliPath = path.join(process.cwd(), "bin", "mcp-portal.mjs");

test("CLI help exits cleanly and documents options", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /mcp-hub/i);
  assert.match(result.stdout, /--port <number>/);
  assert.match(result.stdout, /--host <address>/);
  assert.match(result.stdout, /--no-open/);
});

test("CLI rejects non-local host binding", () => {
  const result = spawnSync(process.execPath, [cliPath, "--host", "0.0.0.0"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing unsafe non-local host/i);
});
