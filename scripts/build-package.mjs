import { spawnSync } from "child_process";

const buildResult = spawnSync("npx", ["next", "build"], {
  env: {
    ...process.env,
    NEXT_DIST_DIR: ".next-package",
  },
  shell: true,
  stdio: "inherit",
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const fixTypesResult = spawnSync(process.execPath, ["scripts/fix-next-types.mjs"], {
  stdio: "inherit",
});

if (fixTypesResult.status !== 0) {
  process.exit(fixTypesResult.status ?? 1);
}

const copyResult = spawnSync(process.execPath, ["scripts/copy-standalone.mjs"], {
  stdio: "inherit",
});

process.exit(copyResult.status ?? 0);
