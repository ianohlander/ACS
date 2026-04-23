import { statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = process.argv.slice(2);

ensureWorkspacePackageStubs();
runTypeScriptBuild();

function ensureWorkspacePackageStubs() {
  run(process.execPath, [join(repoRoot, "tools", "ensure-workspace-package-stubs.mjs")], {
    label: "Workspace package stub generation"
  });
}

function runTypeScriptBuild() {
  run(process.execPath, [resolveTypeScriptCompiler(), "-b", join(repoRoot, "tsconfig.json"), ...args], {
    label: "TypeScript build"
  });
}

function resolveTypeScriptCompiler() {
  const candidates = [
    process.env.ACS_TSC,
    join(repoRoot, "node_modules", "typescript", "lib", "tsc.js"),
    "C:/Codex/tools/tsc-runner/node_modules/typescript/lib/tsc.js"
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (statSync(candidate).size > 0) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("No working TypeScript compiler found. Set ACS_TSC to a valid tsc.js path.");
}

function run(command, commandArgs, options) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
    windowsHide: true
  });

  if (result.status !== 0) {
    throw new Error(`${options.label} failed with exit code ${result.status ?? "unknown"}.`);
  }
}
