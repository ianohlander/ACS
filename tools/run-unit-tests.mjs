import { readdirSync, rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const testDir = join(repoRoot, "tests", "unit");
const testFiles = collectTestFiles(testDir);

runTypeScriptBuild();
runNodeTests();

function runTypeScriptBuild() {
  const tsc = resolveTypeScriptCompiler();
  run(process.execPath, [tsc, "-b", join(repoRoot, "tsconfig.json"), "--force", "--pretty", "false"], {
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
