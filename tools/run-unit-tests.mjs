import { readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const testDir = join(repoRoot, "tests", "unit");
const testFiles = collectTestFiles(testDir);

ensureWorkspacePackageStubs();
runTypeScriptBuild();
runNodeTests();

function ensureWorkspacePackageStubs() {
  run(process.execPath, [join(repoRoot, "tools", "ensure-workspace-package-stubs.mjs")], {
    label: "Workspace package stub generation"
  });
}

function runTypeScriptBuild() {
  run(process.execPath, [join(repoRoot, "tools", "build-workspace.mjs"), "--force", "--pretty", "false"], {
    label: "TypeScript build"
  });
}

function runNodeTests() {
  const env = { ...process.env };
  if (process.argv.includes("--coverage")) {
    if (process.env.ACS_ENABLE_V8_COVERAGE === "1") {
      const coverageDir = join(repoRoot, "coverage", "unit");
      rmSync(coverageDir, { recursive: true, force: true });
      env.NODE_V8_COVERAGE = coverageDir;
    } else {
      console.warn("Coverage collection is disabled by default on this Node 18 Windows runtime because NODE_V8_COVERAGE crashes the process. Set ACS_ENABLE_V8_COVERAGE=1 on a verified runtime to emit V8 coverage JSON.");
    }
  }

  run(process.execPath, ["--test", ...testFiles], {
    label: "Node unit tests",
    env
  });
}

function collectTestFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectTestFiles(path);
    }
    return entry.name.endsWith(".test.mjs") ? [path] : [];
  }).sort();
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: options.env ?? process.env,
    stdio: "inherit",
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error(`${options.label} failed with exit code ${result.status ?? "unknown"}.`);
  }
}
