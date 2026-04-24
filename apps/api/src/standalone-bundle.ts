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
      createReadmeHtmlFile(artifact),
      createReadmeTextFile(artifact),
      createAdventurePackageFile(artifact.adventure),
      createMetadataFile(artifact),
      createDistributionManifestFile(artifact),
      createWindowsLauncherScriptFile(artifact),
      createWindowsLauncherCommandFile(artifact),
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

function createReadmeHtmlFile(artifact: StandalonePlayableArtifact): StandaloneBundleFile {
  return {
    path: artifact.distributionManifest.handoff.readmeHtml,
    contentType: "text/html; charset=utf-8",
    contents: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(artifact.adventure.metadata.title)} - Standalone Package Guide</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        font-family: Georgia, "Times New Roman", serif;
        background: #0f151b;
        color: #e9eef2;
        line-height: 1.6;
      }
      main {
        max-width: 860px;
        margin: 0 auto;
      }
      h1, h2 {
        margin-top: 0;
        color: #f5d547;
      }
      code {
        font-family: Consolas, monospace;
        color: #f5d547;
      }
      .panel {
        margin-top: 20px;
        padding: 18px 20px;
        border: 1px solid #324252;
        border-radius: 16px;
        background: #17212a;
      }
      ul {
        padding-left: 22px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(artifact.adventure.metadata.title)}</h1>
      <p>This is a standalone ACS runtime package. It is meant to be played without the editor.</p>

      <section class="panel">
        <h2>Fastest Way To Play</h2>
        <ul>
          <li>On Windows, run <code>${escapeHtml(artifact.distributionManifest.handoff.recommendedLaunchPath)}</code>.</li>
          <li>This starts a tiny local web server and opens the game in your default browser.</li>
          <li>If PowerShell asks for confirmation, allow the local script to run.</li>
        </ul>
      </section>

      <section class="panel">
        <h2>Other Ways To Play</h2>
        <ul>
          <li>You can host this folder with any simple static web server and open <code>index.html</code>.</li>
          <li>You can also publish the same exported bundle to a web host because it is a static web package.</li>
        </ul>
      </section>

      <section class="panel">
        <h2>What Is Inside</h2>
        <ul>
          <li><code>index.html</code> is the packaged play shell.</li>
          <li><code>bundle/adventure-package.json</code> contains the runtime adventure data.</li>
          <li><code>bundle/distribution-manifest.json</code> describes the packaged release and bundle metadata.</li>
          <li><code>launch/run-local.ps1</code> and <code>launch/run-local.cmd</code> are convenience launchers.</li>
        </ul>
      </section>

      <section class="panel">
        <h2>Current Limits</h2>
        <ul>
          ${artifact.distributionManifest.knownLimitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}
        </ul>
      </section>
    </main>
  </body>
</html>
`
  };
}

function createReadmeTextFile(artifact: StandalonePlayableArtifact): StandaloneBundleFile {
  return {
    path: artifact.distributionManifest.handoff.readmeText,
    contentType: "text/plain; charset=utf-8",
    contents: `${artifact.adventure.metadata.title}\n` +
      `Standalone ACS package\n\n` +
      `Fastest way to play on Windows:\n` +
      `- Run ${artifact.distributionManifest.handoff.recommendedLaunchPath}\n` +
      `- This starts a tiny local web server and opens the game in your default browser.\n\n` +
      `Other ways to play:\n` +
      `- Host this folder with any simple static web server and open index.html\n` +
      `- Publish the same bundle to a web host because it is a static web package\n\n` +
      `Included files:\n` +
      `- index.html\n` +
      `- bundle/adventure-package.json\n` +
      `- bundle/distribution-manifest.json\n` +
      `- launch/run-local.ps1\n` +
      `- launch/run-local.cmd\n\n` +
      `Known limitations:\n` +
      artifact.distributionManifest.knownLimitations.map((item) => `- ${item}`).join("\n") +
      `\n`
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

function createWindowsLauncherScriptFile(artifact: StandalonePlayableArtifact): StandaloneBundleFile {
  return {
    path: artifact.distributionManifest.launcher.windowsPowerShellScript,
    contentType: "text/plain; charset=utf-8",
    contents: `param(
  [int]$Port = ${artifact.distributionManifest.launcher.defaultPort},
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$prefix = "http://127.0.0.1:$Port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$contentTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg" = "image/svg+xml"
  ".ico" = "image/x-icon"
}

function Resolve-RequestPath([string]$absolutePath) {
  $relative = $absolutePath.TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($relative)) {
    return Join-Path $root "index.html"
  }

  $candidate = Join-Path $root ($relative -replace "/", "\\")
  if ((Test-Path $candidate) -and (Get-Item $candidate).PSIsContainer) {
    return Join-Path $candidate "index.html"
  }

  return $candidate
}

function Write-NotFound($response) {
  $response.StatusCode = 404
  $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
  $response.ContentType = "text/plain; charset=utf-8"
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
  $response.Close()
}

$listener.Start()
Write-Host "ACS standalone launcher serving $root at $prefix"
Write-Host "Press Ctrl+C to stop."

if (-not $NoBrowser) {
  Start-Process $prefix | Out-Null
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $target = Resolve-RequestPath $context.Request.Url.AbsolutePath
    if (-not (Test-Path $target -PathType Leaf)) {
      Write-NotFound $context.Response
      continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($target)
    $extension = [System.IO.Path]::GetExtension($target).ToLowerInvariant()
    $context.Response.ContentType = $contentTypes[$extension]
    if (-not $context.Response.ContentType) {
      $context.Response.ContentType = "application/octet-stream"
    }
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
`
  };
}

function createWindowsLauncherCommandFile(artifact: StandalonePlayableArtifact): StandaloneBundleFile {
  const scriptPath = artifact.distributionManifest.launcher.windowsPowerShellScript.split("/").pop() ?? "run-local.ps1";
  return {
    path: artifact.distributionManifest.launcher.windowsCommandScript,
    contentType: "text/plain; charset=utf-8",
    contents: `@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0${scriptPath}"
`
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
