import { spawn, spawnSync } from "child_process";

const port = 3310;
const baseUrl = `http://127.0.0.1:${port}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${url}/chat`, { redirect: "manual" });
      if (response.ok || response.status === 307 || response.status === 308) {
        return true;
      }
    } catch {
      // Server not ready yet.
    }

    await sleep(500);
  }

  return false;
}

const child = spawn(process.execPath, ["bin/mcp-portal.mjs", "--port", String(port), "--no-open"], {
  env: {
    ...process.env,
    FORCE_COLOR: "0",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";

child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});

child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

let success = false;
try {
  const ready = await waitForReady(baseUrl);

  if (!ready) {
    throw new Error(`Smoke test timed out.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }

  const response = await fetch(`${baseUrl}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId: "smoke", feedback: "up", content: "ok" }),
  });

  if (!response.ok) {
    throw new Error(`Smoke test API request failed with HTTP ${response.status}.`);
  }

  console.log(`Smoke test OK at ${baseUrl}`);
  success = true;
} catch (err) {
  console.error(err);
} finally {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch (e) {
      child.kill("SIGKILL");
    }
  }
  await new Promise((resolve) => {
    child.once("close", resolve);
    setTimeout(resolve, 2000);
  });
  process.exit(success ? 0 : 1);
}
