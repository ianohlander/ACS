param(
  [string]$RepoRoot = "H:\My Drive\Repos\ACS",
  [int]$WebPort = 4318,
  [int]$DebugPort = 9326
)

$ErrorActionPreference = "Stop"

$assetsDir = Join-Path $RepoRoot "docs\assets"
New-Item -ItemType Directory -Force $assetsDir | Out-Null

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
$userDataDir = Join-Path $env:TEMP ("acs-relay-tutorial-" + [Guid]::NewGuid().ToString("N"))

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
  if (Test-Path $userDataDir) {
    Remove-Item -LiteralPath $userDataDir -Recurse -Force
  }
  New-Item -ItemType Directory -Force $userDataDir | Out-Null

  $argString = "--headless=new --disable-gpu --no-sandbox --remote-debugging-address=127.0.0.1 --remote-debugging-port=$DebugPort --remote-allow-origins=* --user-data-dir=`"$userDataDir`" --window-size=1440,1100 http://127.0.0.1:$WebPort/apps/web/editor.html"
  $script:edgeProcess = Start-Process -FilePath $browserPath -ArgumentList $argString -PassThru
  Wait-ForHttp "http://127.0.0.1:$DebugPort/json/version"
}

function Connect-Cdp {
  $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json"
  $target = $targets | Where-Object { $_.url -like "*editor.html*" } | Select-Object -First 1
  if (-not $target) {
    throw "No editor target found in Edge debugging endpoint."
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

function Wait-ForSelector($selector) {
  $escaped = ($selector -replace "\\", "\\") -replace "'", "\'"
  Eval-Js @"
new Promise((resolve, reject) => {
  const deadline = Date.now() + 8000;
  const tick = () => {
    if (document.querySelector('$escaped')) { resolve(true); return; }
    if (Date.now() > deadline) { reject(new Error('Missing selector: $escaped')); return; }
    setTimeout(tick, 100);
  };
  tick();
})
"@ | Out-Null
}

function Wait-ForJsCondition($expression, $description) {
  $deadline = (Get-Date).AddSeconds(10)
  do {
    try {
      $result = Eval-Js $expression
      if ($result) {
        return
      }
    } catch {
      # Keep polling until the editor finishes the async render pass.
    }
    Start-Sleep -Milliseconds 200
  } while ((Get-Date) -lt $deadline)

  throw "Timed out waiting for $description"
}

function Eval-Step($expression) {
  Eval-Js $expression | Out-Null
  Start-Sleep -Milliseconds 350
}

function Capture-Selector($name, $selector, $padding = 12) {
  $safeSelector = ($selector -replace "\\", "\\") -replace "'", "\'"
  Eval-Js @"
(() => {
  const el = document.querySelector('$safeSelector');
  if (!el) throw new Error('Missing selector: $safeSelector');
  el.scrollIntoView({ block: 'start', inline: 'center' });
  return true;
})()
"@ | Out-Null
  Start-Sleep -Milliseconds 400
  $clip = Eval-Js @"
(() => {
  const el = document.querySelector('$safeSelector');
  if (!el) throw new Error('Missing selector: $safeSelector');
  const r = el.getBoundingClientRect();
  const pad = $padding;
  return {
    x: Math.max(0, window.scrollX + r.left - pad),
    y: Math.max(0, window.scrollY + r.top - pad),
    width: Math.min(1320, r.width + pad * 2),
    height: Math.min(1600, r.height + pad * 2),
    scale: 1
  };
})()
"@
  Start-Sleep -Milliseconds 250
  $response = Invoke-Cdp "Page.captureScreenshot" @{
    format = "png"
    captureBeyondViewport = $true
    clip = @{
      x = [double]$clip.x
      y = [double]$clip.y
      width = [double]$clip.width
      height = [double]$clip.height
      scale = 1
    }
  }
  $path = Join-Path $assetsDir "$name.png"
  [IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($response.result.data))
}

function Capture-Full($name) {
  $response = Invoke-Cdp "Page.captureScreenshot" @{
    format = "png"
    captureBeyondViewport = $false
  }
  $path = Join-Path $assetsDir "$name.png"
  [IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($response.result.data))
}

function Run-RelayWalkthrough {
  Invoke-Cdp "Page.enable" | Out-Null
  Invoke-Cdp "Runtime.enable" | Out-Null
  Wait-ForSelector "#title-input"

  Eval-Step "document.querySelector('#reset-draft-button').click();"
  Wait-ForJsCondition "document.querySelector('#map-select')?.options.length > 0 && document.querySelector('#tile-select')?.options.length > 0" "editor reset and initial option population"
  Eval-Step "document.querySelector('[data-editor-area=""adventure""]').click();"
  Capture-Full "tutorial-ui-01-editor-open"

  Eval-Step @"
document.querySelector('[data-editor-area="adventure"]').click();
const title = document.querySelector('#title-input');
title.value = 'Relay Station Alecto';
title.dispatchEvent(new Event('input', { bubbles: true }));
const description = document.querySelector('#description-input');
description.value = 'A derelict orbital relay must be reawakened before its failing AI loses the final star map.';
description.dispatchEvent(new Event('input', { bubbles: true }));
"@
  Capture-Selector "tutorial-ui-02-adventure-identity" "#adventure-setup"

  Eval-Step "document.querySelector('[data-editor-area=""world""]').click();"
  Capture-Selector "tutorial-ui-03-world-atlas-empty" "#world-atlas"

  New-RelayMap "Access Ring" "local" "steel_deck"
  Capture-Selector "tutorial-ui-04-create-access-ring" "#world-atlas"

  New-RelayMap "Data Core Chamber" "interior" "steel_deck"
  Capture-Selector "tutorial-ui-05-create-data-core" "#world-atlas"

  New-RelayMap "Airlock Annex" "interior" "steel_deck"
  Capture-Selector "tutorial-ui-06-create-airlock" "#world-atlas"

  Eval-Step @"
document.querySelector('[data-editor-area="map"]').click();
selectOptionByText('#workspace-map-select', 'Access Ring');
setSelectValue('#edit-mode', 'tiles');
setSelectValue('#tile-select', 'steel_deck');
paintCells(['1,1','2,1','3,1','4,1','5,1','6,1','1,2','6,2','1,3','2,3','3,3','4,3','5,3','6,3']);
setSelectValue('#tile-select', 'data_terminal');
paintCells(['2,2']);
setSelectValue('#tile-select', 'teleport_pad');
paintCells(['6,2']);
setSelectValue('#tile-select', 'force_field');
paintCells(['4,2']);
"@
  Capture-Selector "tutorial-ui-07-paint-access-ring" "#map-workspace"

  Eval-Step @"
selectOptionByText('#workspace-map-select', 'Data Core Chamber');
setSelectValue('#edit-mode', 'tiles');
setSelectValue('#tile-select', 'steel_deck');
paintCells(['1,1','2,1','3,1','4,1','1,2','2,2','3,2','4,2','1,3','2,3','3,3','4,3']);
setSelectValue('#tile-select', 'data_terminal');
paintCells(['3,2']);
setSelectValue('#tile-select', 'door');
paintCells(['1,3']);
"@
  Capture-Selector "tutorial-ui-08-paint-data-core" "#map-workspace"

  Eval-Step @"
selectOptionByText('#workspace-map-select', 'Airlock Annex');
setSelectValue('#edit-mode', 'tiles');
setSelectValue('#tile-select', 'steel_deck');
paintCells(['1,1','2,1','3,1','1,2','2,2','3,2']);
setSelectValue('#tile-select', 'signpost');
paintCells(['2,1']);
"@
  Capture-Selector "tutorial-ui-09-paint-airlock" "#map-workspace"

  Eval-Step @"
selectOptionByText('#workspace-map-select', 'Access Ring');
setSelectValue('#edit-mode', 'entities');
selectOptionByText('#entity-definition-select', 'Starship AI');
document.querySelector('#entity-instance-name-input').value = 'Station AI Alecto';
document.querySelector('#entity-instance-name-input').dispatchEvent(new Event('input', { bubbles: true }));
setSelectValue('#entity-instance-behavior-select', 'idle');
clickCell('1,1');
"@
  Capture-Selector "tutorial-ui-10-place-station-ai" "#map-workspace"

  Eval-Step @"
setSelectValue('#entity-select', '');
document.querySelector('#entity-select').dispatchEvent(new Event('change', { bubbles: true }));
selectOptionByText('#entity-definition-select', 'Security Drone');
document.querySelector('#entity-instance-name-input').value = 'Pad Sentry Drone';
document.querySelector('#entity-instance-name-input').dispatchEvent(new Event('input', { bubbles: true }));
setSelectValue('#entity-instance-behavior-select', 'guard');
clickCell('5,2');
"@
  Capture-Selector "tutorial-ui-11-place-pad-sentry" "#map-workspace"

  Eval-Step @"
document.querySelector('[data-editor-area="libraries"]').click();
setSelectValue('#library-view-select', 'quests');
"@
  Capture-Selector "tutorial-ui-12-quest-library" "#libraries"

  Eval-Step @"
document.querySelector('[data-editor-area="logic"]').click();
selectOptionByText('#logic-map-select', 'Access Ring');
"@
  Capture-Selector "tutorial-ui-13-logic-panel" "#logic-quests"

  Eval-Step @"
document.querySelector('[data-editor-area="map"]').click();
selectOptionByText('#workspace-map-select', 'Data Core Chamber');
setSelectValue('#edit-mode', 'exits');
selectOptionByText('#exit-target-map-select', 'Access Ring');
document.querySelector('#exit-target-x-input').value = '1';
document.querySelector('#exit-target-y-input').value = '1';
clickCell('1,3');
"@
  Capture-Selector "tutorial-ui-14-link-data-core-exit" "#map-workspace"
  Capture-Selector "tutorial-ui-17-selected-cell-inspector" ".dependency-panel"

  Eval-Step "document.querySelector('[data-editor-area=""test""]').click();"
  Capture-Selector "tutorial-ui-15-diagnostics" "#test-publish"

  Eval-Step @"
document.querySelector('#rename-search-input').value = 'Oracle';
document.querySelector('#rename-search-input').dispatchEvent(new Event('input', { bubbles: true }));
document.querySelector('#rename-replacement-input').value = 'Station AI Alecto';
document.querySelector('#rename-replacement-input').dispatchEvent(new Event('input', { bubbles: true }));
document.querySelector('#rename-preview-button').click();
"@
  Capture-Selector "tutorial-ui-18-display-rename-preview" ".reskin-card"

  Capture-Full "tutorial-ui-16-ready-to-playtest"
}

function New-RelayMap($name, $kind, $fill) {
  $safeName = $name.Replace("'", "\'")
  Eval-Step @"
document.querySelector('#new-map-name-input').value = '$safeName';
document.querySelector('#new-map-name-input').dispatchEvent(new Event('input', { bubbles: true }));
setSelectValue('#new-map-kind-select', '$kind');
document.querySelector('#new-map-width-input').value = '8';
document.querySelector('#new-map-height-input').value = '8';
document.querySelector('#new-map-fill-input').value = '$fill';
document.querySelector('#create-map-button').click();
"@
  Wait-ForJsCondition "Array.from(document.querySelector('#map-select')?.options ?? []).some((option) => option.textContent.includes('$safeName'))" "map creation for $name"
}

try {
  Start-LocalServer
  Start-Edge
  Connect-Cdp
  Eval-Js @"
window.setSelectValue = (selector, value) => {
  const element = document.querySelector(selector);
  if (!element) throw new Error('Missing select: ' + selector);
  element.value = value;
  element.dispatchEvent(new Event('change', { bubbles: true }));
};
window.selectOptionByText = (selector, text) => {
  const element = document.querySelector(selector);
  if (!element) throw new Error('Missing select: ' + selector);
  const option = Array.from(element.options).find((candidate) => candidate.textContent.includes(text));
  if (!option) throw new Error('Missing option containing ' + text + ' in ' + selector);
  element.value = option.value;
  element.dispatchEvent(new Event('change', { bubbles: true }));
};
window.clickCell = (cell) => {
  const button = document.querySelector('[data-cell="' + cell + '"]');
  if (!button) throw new Error('Missing cell: ' + cell);
  button.click();
};
window.paintCells = (cells) => {
  for (const cell of cells) {
    const button = document.querySelector('[data-cell="' + cell + '"]');
    if (!button) throw new Error('Missing cell: ' + cell);
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
    button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 1 }));
  }
};
true;
"@ | Out-Null
  Run-RelayWalkthrough
  Write-Host "Captured Relay tutorial screenshots in $assetsDir"
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
}
