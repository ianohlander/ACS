param(
  [string]$RepoRoot = "H:\My Drive\Repos\ACS",
  [int]$WebPort = (Get-Random -Minimum 4300 -Maximum 4899),
  [int]$DebugPort = (Get-Random -Minimum 9300 -Maximum 9899)
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
$userDataDir = Join-Path $env:TEMP ("acs-runtime-ui-e2e-" + [Guid]::NewGuid().ToString("N"))

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
  Wait-ForHttp "http://127.0.0.1:$WebPort/apps/web/index.html"
}

function Start-Edge {
  New-Item -ItemType Directory -Force $userDataDir | Out-Null
  $arguments = @(
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=$DebugPort",
    "--remote-allow-origins=*",
    "--user-data-dir=$userDataDir",
    "--window-size=1440,1100",
    "http://127.0.0.1:$WebPort/apps/web/index.html"
  )
  $script:edgeProcess = Start-Process -FilePath $browserPath -ArgumentList $arguments -PassThru
  Wait-ForHttp "http://127.0.0.1:$DebugPort/json/version"
}

function Connect-Cdp {
  $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json"
  $target = $targets | Where-Object { $_.url -like "*index.html*" } | Select-Object -First 1
  if (-not $target) {
    throw "No runtime target found in Chromium debugging endpoint."
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
  if ($response.result.exceptionDetails) {
    $details = $response.result.exceptionDetails
    $description = $details.text
    if ($details.exception -and $details.exception.description) {
      $description = $details.exception.description
    }
    throw "JavaScript evaluation failed: $description"
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
      # Keep polling while the runtime initializes.
    }
    Start-Sleep -Milliseconds 200
  } while ((Get-Date) -lt $deadline)

  try {
    $diagnostic = Eval-Js "({ href: location.href, readyState: document.readyState, title: document.title, appVersion: document.querySelector('#app-version')?.textContent ?? '', body: document.body?.innerText?.slice(0, 500) ?? '' })"
    Write-Host ("DEBUG wait diagnostic: " + ($diagnostic | ConvertTo-Json -Depth 5 -Compress))
  } catch {
    Write-Host ("DEBUG wait diagnostic failed: " + $_.Exception.Message)
  }
  throw "Timed out waiting for $description"
}

function Assert-True($condition, $message) {
  if (-not $condition) {
    throw "Runtime UI E2E assertion failed: $message"
  }
  Write-Host "PASS: $message"
}

try {
  Start-LocalServer
  Start-Edge
  Connect-Cdp
  Invoke-Cdp "Page.enable" | Out-Null
  Invoke-Cdp "Runtime.enable" | Out-Null
  Wait-ForCondition "document.querySelector('#source-status')?.textContent.includes('Playing') && document.querySelector('#map-name')?.textContent !== 'Map' && document.querySelector('#player-pos')?.textContent.includes('1, 1') && document.querySelector('#game-canvas')?.width > 0" "runtime startup"

  $result = Eval-Js @'
(async () => {
  const settle = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitFor = async (predicate, description) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 3000) {
      if (predicate()) {
        return;
      }
      await settle(50);
    }
    throw new Error(`Timed out waiting for ${description}`);
  };
  const text = (selector) => document.querySelector(selector)?.textContent ?? '';
  const hidden = (selector) => document.querySelector(selector)?.classList.contains('hidden') ?? true;
  const key = async (value) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true }));
    await settle();
  };
  const setSelectValue = async (selector, value) => {
    const element = document.querySelector(selector);
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(250);
  };
  const click = async (selector, ms = 250) => {
    document.querySelector(selector).click();
    await settle(ms);
  };

  const startup = {
    version: text('#app-version'),
    canvasWidth: document.querySelector('#game-canvas').width,
    canvasHeight: document.querySelector('#game-canvas').height,
    mapName: text('#map-name'),
    playerPos: text('#player-pos'),
    objective: text('#objective-text'),
    sourceStatus: text('#source-status')
  };

  await setSelectValue('#visual-mode', 'debug-grid');
  await waitFor(
    () => window.localStorage.getItem('acs:runtime-visual-mode') === 'debug-grid',
    'visual mode preference persistence'
  );
  await setSelectValue('#classic-scale', '2.5');
  await waitFor(
    () => window.localStorage.getItem('acs:runtime-classic-scale') === '2.5',
    'classic scale preference persistence'
  );
  const mode = {
    visualMode: document.querySelector('#visual-mode').value,
    classicScale: document.querySelector('#classic-scale').value,
    storedVisualMode: window.localStorage.getItem('acs:runtime-visual-mode'),
    storedClassicScale: window.localStorage.getItem('acs:runtime-classic-scale')
  };

  await key('ArrowRight');
  await key('ArrowDown');
  const afterMove = {
    playerPos: text('#player-pos'),
    turn: text('#turn-count')
  };

  await key('e');
  const afterInteract = {
    overlayVisible: !hidden('#dialogue-overlay'),
    dialogueSpeaker: text('#dialogue-speaker'),
    dialogueText: text('#dialogue-text'),
    eventLog: text('#event-log'),
    flags: text('#flag-summary'),
    objective: text('#objective-text')
  };

  await key('Enter');
  const afterDialogueAdvance = {
    overlayHidden: hidden('#dialogue-overlay'),
    eventLog: text('#event-log')
  };

  await click('#save-button', 500);
  const afterSave = {
    saveStatus: text('#save-status'),
    playerPos: text('#player-pos')
  };
  await key('ArrowLeft');
  const afterSaveMove = {
    playerPos: text('#player-pos')
  };
  await click('#reset-button');
  const afterReset = {
    playerPos: text('#player-pos'),
    saveStatus: text('#save-status')
  };
  await click('#load-button', 500);
  const afterLoad = {
    playerPos: text('#player-pos'),
    saveStatus: text('#save-status')
  };

  return { startup, mode, afterMove, afterInteract, afterDialogueAdvance, afterSave, afterSaveMove, afterReset, afterLoad };
})()
'@

  Assert-True ($result.startup.version.Length -gt 0) "Runtime header renders app version"
  Assert-True ($result.startup.canvasWidth -gt 0 -and $result.startup.canvasHeight -gt 0) "Runtime canvas is initialized"
  Assert-True ($result.startup.mapName.Length -gt 0) "Runtime map name renders"
  Assert-True ($result.startup.objective.Length -gt 0) "Runtime objective panel renders"
  Assert-True ($result.mode.visualMode -eq "debug-grid") "Visual Mode select switches to Debug Grid"
  Assert-True ($result.mode.classicScale -eq "2.5") "Classic Size select switches to Extra Large"
  Assert-True ($result.mode.storedVisualMode -eq "debug-grid") "Visual mode preference is persisted"
  Assert-True ($result.mode.storedClassicScale -eq "2.5") "Classic size preference is persisted"
  Assert-True ($result.afterMove.playerPos -match "2, 2") "Keyboard movement updates player position"
  Assert-True ([int]$result.afterMove.turn -ge 2) "Keyboard movement advances turns"
  Assert-True $result.afterInteract.overlayVisible "Debug mode shows dialogue overlay after interaction"
  Assert-True ($result.afterInteract.dialogueText.Length -gt 0) "Dialogue overlay renders dialogue text"
  Assert-True ($result.afterInteract.eventLog -match "Trigger fired") "Interaction records trigger event in event log"
  Assert-True ($result.afterInteract.flags -match "quest_started") "Interaction updates flag summary"
  Assert-True ($result.afterDialogueAdvance.overlayHidden) "Enter advances and closes dialogue"
  Assert-True ($result.afterDialogueAdvance.eventLog -match "Dialogue ended") "Dialogue advance records dialogue end event"
  Assert-True ($result.afterSave.saveStatus -match "Saved") "Save button persists a runtime session"
  Assert-True ($result.afterSaveMove.playerPos -ne $result.afterSave.playerPos) "Keyboard movement changes position after saving"
  Assert-True ($result.afterReset.playerPos -match "1, 1") "Reset button returns to start position"
  Assert-True ($result.afterLoad.saveStatus -match "Loaded save") "Load button restores saved session"
  Assert-True ($result.afterLoad.playerPos -eq $result.afterSave.playerPos) "Load restores the saved player position"
  Write-Host "ACS runtime UI E2E passed."
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
