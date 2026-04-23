import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workspaceRoots = ["apps", "packages"];

ensureWorkspacePackageStubs();

function ensureWorkspacePackageStubs() {
  for (const workspace of collectWorkspacePackages()) {
    writeWorkspaceStub(workspace);
  }
}

function collectWorkspacePackages() {
  return workspaceRoots.flatMap((rootName) => {
    const rootPath = join(repoRoot, rootName);
    return readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(rootPath, entry.name))
      .filter(hasPackageJson)
      .map((packagePath) => {
        const packageJson = JSON.parse(readFileSync(join(packagePath, "package.json"), "utf8"));
        return {
          name: packageJson.name,
          packagePath,
          type: packageJson.type ?? "module"
        };
      })
      .filter((workspace) => typeof workspace.name === "string" && workspace.name.startsWith("@acs/"));
  });
}

function writeWorkspaceStub(workspace) {
  const stubPath = join(repoRoot, "node_modules", ...workspace.name.split("/"));
  mkdirSync(stubPath, { recursive: true });

  const stubPackageJson = {
    name: workspace.name,
    version: "0.1.0",
    type: workspace.type,
    main: toPackageJsonPath(relative(stubPath, join(workspace.packagePath, "dist", "index.js"))),
    types: toPackageJsonPath(relative(stubPath, join(workspace.packagePath, "dist", "index.d.ts")))
  };

  writeFileSync(join(stubPath, "package.json"), `${JSON.stringify(stubPackageJson, null, 2)}\n`);
}

function hasPackageJson(packagePath) {
  try {
    return statSync(join(packagePath, "package.json")).isFile();
  } catch {
    return false;
  }
}

function toPackageJsonPath(path) {
  const normalized = path.split(sep).join("/");
  return normalized.startsWith(".") ? normalized : `./${normalized}`;
}
