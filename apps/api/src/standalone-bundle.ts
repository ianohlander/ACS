import type { AdventurePackage } from "@acs/domain";
import type { StandaloneBundleFile, StandaloneBundleManifest, StandalonePlayableArtifact } from "@acs/publishing";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const runtimeBundleFiles = [
  { diskPath: "apps/web/styles.css", bundlePath: "styles.css", contentType: "text/css; charset=utf-8" },
  { diskPath: "apps/web/dist/index.js", bundlePath: "dist/index.js", contentType: "text/javascript; charset=utf-8" },
  { diskPath: "apps/web/dist/sampleAdventure.js", bundlePath: "dist/sampleAdventure.js", contentType: "text/javascript; charset=utf-8" },
  { diskPath: "packages/domain/dist/index.js", bundlePath: "packages/domain/dist/index.js", contentType: "text/javascript; charset=utf-8" },
  { diskPath: "packages/content-schema/dist/index.js", bundlePath: "packages/content-schema/dist/index.js", contentType: "text/javascript; charset=utf-8" },
  { diskPath: "packages/default-content/dist/index.js", bundlePath: "packages/default-content/dist/index.js", contentType: "text/javascript; charset=utf-8" },
  { diskPath: "packages/project-api/dist/index.js", bundlePath: "packages/project-api/dist/index.js", contentType: "text/javascript; charset=utf-8" },
  { diskPath: "packages/runtime-core/dist/index.js", bundlePath: "packages/runtime-core/dist/index.js", contentType: "text/javascript; charset=utf-8" },
  { diskPath: "packages/runtime-2d/dist/index.js", bundlePath: "packages/runtime-2d/dist/index.js", contentType: "text/javascript; charset=utf-8" },
  { diskPath: "packages/persistence/dist/index.js", bundlePath: "packages/persistence/dist/index.js", contentType: "text/javascript; charset=utf-8" },
  { diskPath: "packages/validation/dist/index.js", bundlePath: "packages/validation/dist/index.js", contentType: "text/javascript; charset=utf-8" }
] as const;

export async function buildStandaloneBundle(artifact: StandalonePlayableArtifact): Promise<StandaloneBundleManifest> {
  const copiedFiles = await Promise.all(runtimeBundleFiles.map((file) => readStandaloneBundleFile(file.diskPath, file.bundlePath, file.contentType)));
  return {
    entryFile: "index.html",
    files: [
      createHtmlShellFile(artifact.adventure),
      createAdventurePackageFile(artifact.adventure),
      createMetadataFile(artifact),
      createDistributionManifestFile(artifact),
      ...copiedFiles
    ]
  };
}

async function readStandaloneBundleFile(
  diskPath: string,
  bundlePath: string,
  contentType: string
): Promise<StandaloneBundleFile> {
  const contents = await readFile(join(repoRoot, diskPath), "utf8");
  return {
    path: bundlePath,
    contentType,
    contents
  };
}

function createHtmlShellFile(adventure: AdventurePackage): StandaloneBundleFile {
  return {
    path: "index.html",
    contentType: "text/html; charset=utf-8",
    contents: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(adventure.metadata.title)}</title>
    <link rel="stylesheet" href="./styles.css" />
    <script type="importmap">
      {
        "imports": {
          "@acs/domain": "./packages/domain/dist/index.js",
          "@acs/content-schema": "./packages/content-schema/dist/index.js",
          "@acs/default-content": "./packages/default-content/dist/index.js",
          "@acs/project-api": "./packages/project-api/dist/index.js",
          "@acs/runtime-core": "./packages/runtime-core/dist/index.js",
          "@acs/runtime-2d": "./packages/runtime-2d/dist/index.js",
          "@acs/persistence": "./packages/persistence/dist/index.js",
          "@acs/validation": "./packages/validation/dist/index.js"
        }
      }
    </script>
  </head>
  <body>
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow"><span id="app-version">Standalone Playable</span></p>
          <h1>${escapeHtml(adventure.metadata.title)}</h1>
        </div>
        <div class="button-row">
          <div class="runtime-toolbar">
            <label class="visual-mode-control">
              <span>Visual Mode</span>
              <select id="visual-mode">
                <option value="classic-acs">Classic ACS</option>
                <option value="debug-grid">Debug Grid</option>
              </select>
            </label>
            <label class="visual-mode-control">
              <span>Classic Size</span>
              <select id="classic-scale">
                <option value="1.5">Compact</option>
                <option value="2">Large</option>
                <option value="2.5">Extra Large</option>
              </select>
            </label>
            <div class="statusline">
              <span id="map-name">Map</span>
              <span id="player-pos">(0, 0)</span>
            </div>
          </div>
        </div>
      </header>

      <main class="layout">
        <section class="playfield-card">
          <canvas id="game-canvas" width="384" height="384"></canvas>
          <div id="dialogue-overlay" class="dialogue hidden">
            <p id="dialogue-speaker" class="dialogue-speaker"></p>
            <p id="dialogue-text" class="dialogue-text"></p>
            <button id="dialogue-continue" class="dialogue-button" type="button">Continue (Enter / E)</button>
          </div>
        </section>

        <aside class="sidebar">
          <section class="panel">
            <h2>Adventure Intro</h2>
            <p id="presentation-summary">Loading presentation...</p>
          </section>
          <section class="panel">
            <h2>Objective</h2>
            <p id="objective-text">Loading quest objective...</p>
          </section>
          <section class="panel">
            <h2>Session Source</h2>
            <p id="source-status" class="save-status">Loading standalone bundle...</p>
          </section>
          <section class="panel">
            <h2>Controls</h2>
            <ul>
              <li><code>WASD</code> or arrow keys move</li>
              <li><code>E</code> interacts</li>
              <li><code>Q</code> inspects</li>
              <li><code>Enter</code>, <code>Space</code>, or <code>E</code> advances dialogue</li>
              <li>In Classic ACS mode, arrow keys scroll long dialogue before continuing</li>
            </ul>
          </section>
          <section class="panel">
            <h2>Save Session</h2>
            <div class="button-row">
              <button id="save-button" class="action-button" type="button">Save</button>
              <button id="load-button" class="action-button" type="button">Load</button>
              <button id="reset-button" class="action-button ghost" type="button">Reset</button>
            </div>
            <p id="save-status" class="save-status">Checking local save...</p>
          </section>
          <section class="panel">
            <h2>State</h2>
            <dl class="state-grid">
              <div><dt>Turn</dt><dd id="turn-count">0</dd></div>
              <div><dt>Party</dt><dd id="party-summary">Hero</dd></div>
              <div><dt>Profile</dt><dd id="profile-summary">none</dd></div>
              <div><dt>Flags</dt><dd id="flag-summary">none</dd></div>
              <div><dt>Inventory</dt><dd id="inventory-summary">empty</dd></div>
            </dl>
          </section>
          <section class="panel">
            <h2>Event Log</h2>
            <ol id="event-log" class="event-log"></ol>
          </section>
        </aside>
      </main>
    </div>

    <script type="module" src="./dist/index.js?package=./bundle/adventure-package.json&standalone=1"></script>
  </body>
</html>
`
  };
}

function createAdventurePackageFile(adventure: AdventurePackage): StandaloneBundleFile {
  return {
    path: "bundle/adventure-package.json",
    contentType: "application/json; charset=utf-8",
    contents: `${JSON.stringify(adventure, null, 2)}\n`
  };
}

function createMetadataFile(artifact: StandalonePlayableArtifact): StandaloneBundleFile {
  return {
    path: "bundle/standalone-metadata.json",
    contentType: "application/json; charset=utf-8",
    contents: `${JSON.stringify({
      schemaVersion: artifact.schemaVersion,
      artifactKind: artifact.artifactKind,
      source: artifact.source,
      runtimeAssets: artifact.runtimeAssets,
      distribution: artifact.distribution
    }, null, 2)}\n`
  };
}

function createDistributionManifestFile(artifact: StandalonePlayableArtifact): StandaloneBundleFile {
  return {
    path: "bundle/distribution-manifest.json",
    contentType: "application/json; charset=utf-8",
    contents: `${JSON.stringify(artifact.distributionManifest, null, 2)}\n`
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
