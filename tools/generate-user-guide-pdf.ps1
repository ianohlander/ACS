param(
  [string]$BrowserPath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)

$ErrorActionPreference = 'Stop'
$base = (Get-Location).ProviderPath

$documents = @(
  @{ Html = Join-Path $base 'docs\user-guide.html'; Pdf = Join-Path $base 'docs\user-guide.pdf' },
  @{ Html = Join-Path $base 'docs\system-reference.html'; Pdf = Join-Path $base 'docs\system-reference.pdf' }
)

if (!(Test-Path -LiteralPath $BrowserPath)) {
  throw "Browser not found at $BrowserPath"
}

foreach ($document in $documents) {
  if (!(Test-Path -LiteralPath $document.Html)) {
    throw "HTML source not found: $($document.Html)"
  }

  $userDataDir = Join-Path $env:TEMP ("acs-doc-pdf-" + [Guid]::NewGuid().ToString("N"))
  $tempPdf = Join-Path $env:TEMP (([IO.Path]::GetFileNameWithoutExtension($document.Pdf)) + "-" + [Guid]::NewGuid().ToString("N") + ".pdf")
  New-Item -ItemType Directory -Force -Path $userDataDir | Out-Null

  try {
    $inputUrl = [System.Uri]::new((Resolve-Path -LiteralPath $document.Html).Path).AbsoluteUri
    $args = @(
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--allow-file-access-from-files',
      "--user-data-dir=$userDataDir",
      "--print-to-pdf=$tempPdf",
      $inputUrl
    )

    $process = Start-Process -FilePath $BrowserPath -ArgumentList $args -Wait -PassThru -WindowStyle Hidden
    if ($process.ExitCode -ne 0) {
      throw "PDF generation failed for $($document.Html) with exit code $($process.ExitCode)"
    }

    if (!(Test-Path -LiteralPath $tempPdf)) {
      throw "PDF was not created for $($document.Html)"
    }

    Move-Item -LiteralPath $tempPdf -Destination $document.Pdf -Force
    Write-Output "Generated PDF: $($document.Pdf)"
  }
  finally {
    Remove-Item -LiteralPath $tempPdf -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $userDataDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
