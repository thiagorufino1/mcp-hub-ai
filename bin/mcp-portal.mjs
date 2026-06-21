#!/usr/bin/env node
import { spawn } from "child_process";
import { existsSync } from "fs";
import { createServer } from "net";
import { dirname, join } from "path";
import open from "open";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "..", ".next", "standalone", "server.js");
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const args = process.argv.slice(2);
const shouldOpenBrowser = !args.includes("--no-open");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  mcp-hub - local web UI for MCP servers and LLM chat

  Usage:
    npx @thiagorufino/mcp-hub [options]

  Options:
    --port <number>   Port to listen on (default: 3000, auto-increments if taken)
    --host <address>  Local host to bind to (default: 127.0.0.1)
    --no-open         Start server without opening the browser
    -h, --help        Show this help message

  Examples:
    npx @thiagorufino/mcp-hub
    npx @thiagorufino/mcp-hub --port 4000
    npx @thiagorufino/mcp-hub --host localhost --port 3000
    npx @thiagorufino/mcp-hub --no-open
`);
  process.exit(0);
}

const portFlagIndex = args.indexOf("--port");
const requestedPort =
  portFlagIndex !== -1 && args[portFlagIndex + 1]
    ? parseInt(args[portFlagIndex + 1], 10)
    : 3000;

const hostFlagIndex = args.indexOf("--host");
const requestedHost =
  hostFlagIndex !== -1 && args[hostFlagIndex + 1]
    ? args[hostFlagIndex + 1]
    : "127.0.0.1";

if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  console.error("Invalid --port value. Use integer between 1 and 65535.");
  process.exit(1);
}

if (!localHosts.has(requestedHost)) {
  console.error(
    `Refusing unsafe non-local host "${requestedHost}". Bind only to localhost, 127.0.0.1, or ::1.`,
  );
  process.exit(1);
}

if (!existsSync(serverPath)) {
  console.error(`Standalone server not found at ${serverPath}. Rebuild package before running.`);
  process.exit(1);
}

async function findFreePort(startPort, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : startPort;
      server.close(() => resolve(port));
    });
    server.on("error", () => resolve(findFreePort(startPort + 1, host)));
  });
}

async function waitForServer(url, maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

const port = await findFreePort(requestedPort, requestedHost);
const url = `http://${requestedHost === "::1" ? "[::1]" : requestedHost}:${port}`;

console.log(`\n  mcp-hub starting on ${url} ...\n`);

const child = spawn(process.execPath, [serverPath], {
  env: {
    ...process.env,
    PORT: String(port),
    HOSTNAME: requestedHost,
    NODE_ENV: "production",
  },
  stdio: "inherit",
});

child.on("error", (err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});

child.on("close", (code) => process.exit(code ?? 0));

const ready = await waitForServer(url);
if (ready) {
  if (shouldOpenBrowser) {
    console.log(`  Ready - opening ${url}\n`);
    await open(url).catch((error) => {
      console.error("  Browser open failed. Open manually:", url);
      console.error(`  Reason: ${error.message}`);
    });
  } else {
    console.log(`  Ready - browser auto-open disabled. Visit ${url}\n`);
  }
} else {
  console.error("  Server did not respond in time. Open manually:", url);
}
