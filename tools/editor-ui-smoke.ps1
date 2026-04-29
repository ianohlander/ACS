param(
  [string]$RepoRoot = "H:\My Drive\Repos\ACS",
  [int]$WebPort = 4330,
  [int]$DebugPort = 9340
)

$ErrorActionPreference = "Stop"

$browserCandidates = @(
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
  "C:\Program Files\Google\Chrome\Application\chrome.exe"
)
$browserPath = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browserPath) {
  throw "No supported Chromium browser was found."
}

$serverProcess = $null
$edgeProcess = $null
$webSocket = $null
$userDataDir = Join-Path $env:TEMP ("acs-editor-ui-smoke-" + [Guid]::NewGuid().ToString("N"))

function Wait-ForHttp($uri) {
  $deadline = (Get-Date).AddSeconds(20)
  do {
    try {
      Invoke-WebRequest -Uri $uri -UseBasicParsing -TimeoutSec 2 | Out-Null
      return
    } catch {
      Start-Sleep -Milliseconds 250
    }
  } while ((Get-Date) -lt $deadline)

  throw "Timed out waiting for $uri"
}

function Start-LocalServer {
  $env:PORT = [string]$WebPort
  $script:serverProcess = Start-Process -FilePath "node" -ArgumentList ".\apps\web\server.mjs" -WorkingDirectory $RepoRoot -PassThru -WindowStyle Hidden
  Wait-ForHttp "http://127.0.0.1:$WebPort/apps/web/editor.html"
}

function Start-Edge {
  New-Item -ItemType Directory -Force $userDataDir | Out-Null
  $argString = "--headless=new --disable-gpu --no-sandbox --remote-debugging-address=127.0.0.1 --remote-debugging-port=$DebugPort --remote-allow-origins=* --user-data-dir=`"$userDataDir`" --window-size=1440,1100 http://127.0.0.1:$WebPort/apps/web/editor.html"
  $script:edgeProcess = Start-Process -FilePath $browserPath -ArgumentList $argString -PassThru
  Wait-ForHttp "http://127.0.0.1:$DebugPort/json/version"
}

function Connect-Cdp {
  $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json"
  $target = $targets | Where-Object { $_.url -like "*editor.html*" } | Select-Object -First 1
  if (-not $target) {
    throw "No editor target found in Chromium debugging endpoint."
  }

  $script:webSocket = [System.Net.WebSockets.ClientWebSocket]::new()
  $script:webSocket.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()
  $script:cdpId = 0
}

function Receive-CdpMessage {
  $buffer = New-Object byte[] 1048576
  $segment = [ArraySegment[byte]]::new($buffer)
  $builder = New-Object System.Text.StringBuilder
  do {
    $result = $script:webSocket.ReceiveAsync($segment, [Threading.CancellationToken]::None).Result
    $chunk = [Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
    [void]$builder.Append($chunk)
  } while (-not $result.EndOfMessage)

  $text = $builder.ToString()
  if ($text) {
    return $text | ConvertFrom-Json
  }
  return $null
}

function Invoke-Cdp($method, $params = @{}) {
  $script:cdpId += 1
  $payload = @{
    id = $script:cdpId
    method = $method
    params = $params
  } | ConvertTo-Json -Depth 32 -Compress

  $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
  $segment = [ArraySegment[byte]]::new($bytes)
  $script:webSocket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).Wait()

  while ($true) {
    $message = Receive-CdpMessage
    if ($message -and $message.id -eq $script:cdpId) {
      if ($message.error) {
        throw ($message.error | ConvertTo-Json -Depth 10)
      }
      return $message
    }
  }
}

function Eval-Js($expression) {
  $response = Invoke-Cdp "Runtime.evaluate" @{
    expression = $expression
    awaitPromise = $true
    returnByValue = $true
  }
  return $response.result.result.value
}

function Wait-ForCondition($expression, $description) {
  $deadline = (Get-Date).AddSeconds(10)
  do {
    try {
      if (Eval-Js $expression) {
        return
      }
    } catch {
      # Keep polling while the page initializes.
    }
    Start-Sleep -Milliseconds 200
  } while ((Get-Date) -lt $deadline)

  throw "Timed out waiting for $description"
}

function Assert-True($condition, $message) {
  if (-not $condition) {
    throw "UI smoke assertion failed: $message"
  }
  Write-Host "PASS: $message"
}

try {
  Start-LocalServer
  Start-Edge
  Connect-Cdp
  Invoke-Cdp "Page.enable" | Out-Null
  Invoke-Cdp "Runtime.enable" | Out-Null
  Wait-ForCondition "document.querySelector('#map-select')?.options.length > 0 && document.querySelector('#tile-select')?.options.length > 0" "editor startup and select population"

  $result = Eval-Js @"
(async () => {
  const setSelectValue = (selector, value) => {
    const element = document.querySelector(selector);
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 150));
  const visible = (selector) => !document.querySelector(selector).classList.contains('hidden');
  const clickArea = (area) => document.querySelector('[data-editor-area="' + area + '"]').click();

  clickArea('map');
  await settle();
  setSelectValue('#edit-mode', 'tiles');
  await settle();
  const terrain = {
    tilePickerVisible: visible('#tile-picker-wrap'),
    entityPickerHidden: !visible('#entity-picker-wrap'),
    exitPickerHidden: !visible('#exit-picker-wrap'),
    tileOptionCount: document.querySelector('#tile-select').options.length
  };

  setSelectValue('#edit-mode', 'entities');
  await settle();
  const entities = {
    tilePickerHidden: !visible('#tile-picker-wrap'),
    entityPickerVisible: visible('#entity-picker-wrap'),
    entityDefinitionVisible: visible('#entity-definition-picker-wrap')
  };

  setSelectValue('#edit-mode', 'exits');
  await settle();
  const exits = {
    tilePickerHidden: !visible('#tile-picker-wrap'),
    entityPickerHidden: !visible('#entity-picker-wrap'),
    exitPickerVisible: visible('#exit-picker-wrap')
  };

  clickArea('test');
  await settle();
  const publishing = {
    releaseLabelPresent: Boolean(document.querySelector('#release-label-input')),
    releaseNotesPresent: Boolean(document.querySelector('#release-notes-input')),
    releaseHandoffButtonPresent: Boolean(document.querySelector('#preview-release-handoff-button')),
    releaseHandoffButtonDisabled: document.querySelector('#preview-release-handoff-button')?.disabled ?? false,
    forkablePreviewButtonPresent: Boolean(document.querySelector('#preview-forkable-button')),
    forkableButtonPresent: Boolean(document.querySelector('#export-forkable-button')),
    forkablePreviewButtonDisabled: document.querySelector('#preview-forkable-button')?.disabled ?? false,
    previewButtonPresent: Boolean(document.querySelector('#preview-standalone-button')),
    standaloneButtonPresent: Boolean(document.querySelector('#export-standalone-button')),
    forkableButtonDisabled: document.querySelector('#export-forkable-button')?.disabled ?? false,
    previewButtonDisabled: document.querySelector('#preview-standalone-button')?.disabled ?? false,
    standaloneButtonDisabled: document.querySelector('#export-standalone-button')?.disabled ?? false,
    forkablePreviewStatusText: document.querySelector('#forkable-preview-status')?.textContent ?? '',
    forkablePreviewListCount: document.querySelectorAll('#forkable-preview-list li').length,
    previewStatusText: document.querySelector('#standalone-preview-status')?.textContent ?? '',
    previewListCount: document.querySelectorAll('#standalone-preview-list li').length,
    releaseHandoffStatusText: document.querySelector('#release-handoff-status')?.textContent ?? '',
    releaseHandoffListCount: document.querySelectorAll('#release-handoff-list li').length,
    artifactComparisonStatusText: document.querySelector('#artifact-comparison-status')?.textContent ?? '',
    artifactComparisonListCount: document.querySelectorAll('#artifact-comparison-list li').length
  };

  clickArea('libraries');
  await settle();
  setSelectValue('#library-view-select', 'assets');
  await settle();
  const grouping = document.querySelector('#pixel-preview-grouping');
  const palettePreview = document.querySelector('#pixel-palette-preview');
  const assets = {
    groupingCanvasPresent: Boolean(grouping),
    groupingCanvasWidth: grouping?.width,
    groupingCanvasHeight: grouping?.height,
    palettePreviewVisible: Boolean(palettePreview) && visible('#pixel-palette-preview'),
    palettePreviewLabel: document.querySelector('#pixel-palette-preview-label')?.textContent ?? ''
  };

  return { terrain, entities, exits, publishing, assets };
})()
"@

  Assert-True $result.terrain.tilePickerVisible "Terrain mode shows Tile Brush controls"
  Assert-True $result.terrain.entityPickerHidden "Terrain mode hides entity controls"
  Assert-True $result.terrain.exitPickerHidden "Terrain mode hides exit controls"
  Assert-True ($result.terrain.tileOptionCount -gt 0) "Terrain mode has populated tile brush options"
  Assert-True $result.entities.tilePickerHidden "Entity mode hides tile controls"
  Assert-True $result.entities.entityPickerVisible "Entity mode shows entity controls"
  Assert-True $result.entities.entityDefinitionVisible "Entity mode shows entity definition controls"
  Assert-True $result.exits.tilePickerHidden "Exit mode hides tile controls"
  Assert-True $result.exits.entityPickerHidden "Exit mode hides entity controls"
  Assert-True $result.exits.exitPickerVisible "Exit mode shows exit controls"
  Assert-True $result.publishing.releaseLabelPresent "Test and Publish shows the release label field"
  Assert-True $result.publishing.releaseNotesPresent "Test and Publish shows the release notes field"
  Assert-True $result.publishing.releaseHandoffButtonPresent "Test and Publish shows the release handoff preview button"
  Assert-True $result.publishing.forkablePreviewButtonPresent "Test and Publish shows the forkable preview button"
  Assert-True $result.publishing.forkableButtonPresent "Test and Publish shows the forkable export button"
  Assert-True $result.publishing.previewButtonPresent "Test and Publish shows the standalone preview button"
  Assert-True $result.publishing.standaloneButtonPresent "Test and Publish shows the standalone export button"
  Assert-True $result.publishing.releaseHandoffButtonDisabled "Release handoff preview stays disabled before a release is available"
  Assert-True $result.publishing.forkablePreviewButtonDisabled "Forkable preview stays disabled before a release is available"
  Assert-True $result.publishing.forkableButtonDisabled "Export buttons stay disabled before a release is available"
  Assert-True $result.publishing.previewButtonDisabled "Standalone preview stays disabled before a release is available"
  Assert-True $result.publishing.standaloneButtonDisabled "Standalone export stays disabled before a release is available"
  Assert-True ($result.publishing.releaseHandoffStatusText.Length -gt 0) "Release handoff panel renders helpful status text"
  Assert-True ($result.publishing.releaseHandoffListCount -gt 0) "Release handoff panel renders an initial summary list"
  Assert-True ($result.publishing.forkablePreviewStatusText.Length -gt 0) "Forkable preview panel renders helpful status text"
  Assert-True ($result.publishing.forkablePreviewListCount -gt 0) "Forkable preview panel renders an initial summary list"
  Assert-True ($result.publishing.previewStatusText.Length -gt 0) "Standalone preview panel renders helpful status text"
  Assert-True ($result.publishing.previewListCount -gt 0) "Standalone preview panel renders an initial summary list"
  Assert-True ($result.publishing.artifactComparisonStatusText.Length -gt 0) "Artifact comparison panel renders helpful status text"
  Assert-True ($result.publishing.artifactComparisonListCount -gt 0) "Artifact comparison panel renders an initial comparison list"
  Assert-True $result.assets.groupingCanvasPresent "Assets mode renders grouping preview canvas"
  Assert-True ($result.assets.groupingCanvasWidth -eq 32 -and $result.assets.groupingCanvasHeight -eq 32) "Grouping preview renders a 4 by 4 tile canvas for 8 by 8 sprites"
  Assert-True $result.assets.palettePreviewVisible "Assets mode renders visible paint-color preview"
  Assert-True ($result.assets.palettePreviewLabel.Length -gt 0) "Paint-color preview has readable label text"
  Write-Host "ACS editor UI smoke passed."
} finally {
  if ($webSocket) {
    $webSocket.Dispose()
  }
  if ($edgeProcess -and -not $edgeProcess.HasExited) {
    Stop-Process -Id $edgeProcess.Id -Force
  }
  if ($serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force
  }
  if (Test-Path $userDataDir) {
    Start-Sleep -Milliseconds 500
    Remove-Item -LiteralPath $userDataDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
