param(
  [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"

function Normalize-Version {
  param([string]$RequestedVersion)

  if (-not $RequestedVersion) {
    return "latest"
  }

  switch ($RequestedVersion.ToLowerInvariant()) {
    "latest" { return "latest" }
    "stable" { return "latest" }
    "edge" { throw "edge 通道已下线。请使用默认安装器获取最新 tagged 发布,或传入精确版本号。" }
    default { return $RequestedVersion.TrimStart("v") }
  }
}

function Resolve-LatestReleaseVersion {
  $page = Invoke-WebRequest -Uri "https://github.com/NoWint/Nervefeyn/releases/latest"
  $match = [regex]::Match($page.Content, 'releases/tag/v([0-9][^"''<>\s]*)')
  if (-not $match.Success) {
    throw "无法解析最新的 Nervefeyn 发布版本。"
  }

  return $match.Groups[1].Value
}

function Resolve-ReleaseMetadata {
  param(
    [string]$RequestedVersion,
    [string]$AssetTarget,
    [string]$BundleExtension
  )

  $normalizedVersion = Normalize-Version -RequestedVersion $RequestedVersion

  if ($normalizedVersion -eq "latest") {
    $resolvedVersion = Resolve-LatestReleaseVersion
  } else {
    $resolvedVersion = $normalizedVersion
  }

  $bundleName = "nervefeyn-$resolvedVersion-$AssetTarget"
  $archiveName = "$bundleName.$BundleExtension"
  $baseUrl = if ($env:FEYNMAN_INSTALL_BASE_URL) { $env:FEYNMAN_INSTALL_BASE_URL } else { "https://github.com/NoWint/Nervefeyn/releases/download/v$resolvedVersion" }

  return [PSCustomObject]@{
    ResolvedVersion = $resolvedVersion
    BundleName = $bundleName
    ArchiveName = $archiveName
    DownloadUrl = "$baseUrl/$archiveName"
  }
}

function Get-ArchSuffix {
  # 优先使用 PROCESSOR_ARCHITECTURE,它在 Windows 上始终可用。
  # RuntimeInformation::OSArchitecture 需要 .NET 4.7.1+,在某些
  # Windows PowerShell 5.1 会话中可能未加载。
  $envArch = $env:PROCESSOR_ARCHITECTURE
  if ($envArch) {
    switch ($envArch) {
      "AMD64" { return "x64" }
      "ARM64" { return "arm64" }
    }
  }

  try {
    $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
    switch ($arch.ToString()) {
      "X64" { return "x64" }
      "Arm64" { return "arm64" }
    }
  } catch {}

  throw "不支持该架构:$envArch"
}

$archSuffix = Get-ArchSuffix
$assetTarget = "win32-$archSuffix"
$release = Resolve-ReleaseMetadata -RequestedVersion $Version -AssetTarget $assetTarget -BundleExtension "zip"
$resolvedVersion = $release.ResolvedVersion
$bundleName = $release.BundleName
$archiveName = $release.ArchiveName
$downloadUrl = $release.DownloadUrl

$installRoot = Join-Path $env:LOCALAPPDATA "Programs\nervefeyn"
$installBinDir = Join-Path $installRoot "bin"
$bundleDir = Join-Path $installRoot $bundleName

$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("nervefeyn-install-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmpDir | Out-Null

try {
  $archivePath = Join-Path $tmpDir $archiveName
  Write-Host "==> 正在下载 $archiveName"
  try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
  } catch {
    throw @"
下载 $archiveName 失败:
  $downloadUrl

GitHub 发布中缺少 win32-$archSuffix 包。
这通常意味着发布已存在,但未上传全部平台包。

可选方案:
  - 等待发布完成后再试
  - 显式传入最新已发布版本,例如:
    & ([scriptblock]::Create((irm https://nervefeyn.dev/install.ps1))) -Version 0.2.31
"@
  }

  New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
  if (Test-Path $bundleDir) {
    Remove-Item -Recurse -Force $bundleDir
  }

  Write-Host "==> 正在解压 $archiveName"
  Expand-Archive -LiteralPath $archivePath -DestinationPath $installRoot -Force

  New-Item -ItemType Directory -Path $installBinDir -Force | Out-Null

  $shimPath = Join-Path $installBinDir "nervefeyn.cmd"
  $shimPs1Path = Join-Path $installBinDir "nervefeyn.ps1"
  Write-Host "==> 正在将 nervefeyn 链接到 $installBinDir"
  @"
@echo off
CALL "$bundleDir\nervefeyn.cmd" %*
"@ | Set-Content -Path $shimPath -Encoding ASCII

  @"
`$BundleDir = "$bundleDir"
& "`$BundleDir\node\node.exe" "`$BundleDir\app\bin\nervefeyn.js" @args
"@ | Set-Content -Path $shimPs1Path -Encoding UTF8

  $currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $alreadyOnPath = $false
  if ($currentUserPath) {
    $alreadyOnPath = $currentUserPath.Split(';') -contains $installBinDir
  }
  if (-not $alreadyOnPath) {
    $updatedPath = if ([string]::IsNullOrWhiteSpace($currentUserPath)) {
      $installBinDir
    } else {
      "$currentUserPath;$installBinDir"
    }
    [Environment]::SetEnvironmentVariable("Path", $updatedPath, "User")
    Write-Host "已更新用户 PATH。请新开一个 shell 运行 nervefeyn。"
  } else {
    Write-Host "$installBinDir 已在 PATH 中。"
  }

  $resolvedCommand = Get-Command nervefeyn -ErrorAction SilentlyContinue
  if ($resolvedCommand -and $resolvedCommand.Source -ne $shimPath) {
    Write-Warning "当前 shell 将 nervefeyn 解析到 $($resolvedCommand.Source)"
    Write-Host "请新开 shell,或运行:`$env:Path = '$installBinDir;' + `$env:Path"
    Write-Host "然后运行:nervefeyn"
    Write-Host "如果该路径是旧包管理器安装,请移除它,或将 $installBinDir 放到 PATH 最前。"
  }

  Write-Host "Nervefeyn $resolvedVersion 安装成功。"
} finally {
  if (Test-Path $tmpDir) {
    Remove-Item -Recurse -Force $tmpDir
  }
}
