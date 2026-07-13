param(
  [string]$Version = "latest",
  [ValidateSet("Codex", "User", "Repo", "OpenCode")]
  [string]$Scope = "Codex",
  [string]$TargetDir = ""
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

function Resolve-VersionMetadata {
  param([string]$RequestedVersion)

  $normalizedVersion = Normalize-Version -RequestedVersion $RequestedVersion

  if ($normalizedVersion -eq "latest") {
    $resolvedVersion = Resolve-LatestReleaseVersion
  } else {
    $resolvedVersion = $normalizedVersion
  }

  return [PSCustomObject]@{
    ResolvedVersion = $resolvedVersion
    GitRef = "v$resolvedVersion"
    DownloadUrl = if ($env:FEYNMAN_INSTALL_SKILLS_ARCHIVE_URL) { $env:FEYNMAN_INSTALL_SKILLS_ARCHIVE_URL } else { "https://github.com/NoWint/Nervefeyn/archive/refs/tags/v$resolvedVersion.zip" }
  }
}

function Resolve-InstallDir {
  param(
    [string]$ResolvedScope,
    [string]$ResolvedTargetDir
  )

  if ($ResolvedTargetDir) {
    return $ResolvedTargetDir
  }

  if ($ResolvedScope -eq "Repo") {
    return Join-Path (Get-Location) ".agents\skills\nervefeyn"
  }
  if ($ResolvedScope -eq "OpenCode") {
    return Join-Path (Get-Location) ".opencode\skills\nervefeyn"
  }

  $codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
  return Join-Path $codexHome "skills\nervefeyn"
}

$metadata = Resolve-VersionMetadata -RequestedVersion $Version
$resolvedVersion = $metadata.ResolvedVersion
$downloadUrl = $metadata.DownloadUrl
$installDir = Resolve-InstallDir -ResolvedScope $Scope -ResolvedTargetDir $TargetDir

$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("nervefeyn-skills-install-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmpDir | Out-Null

try {
  $archivePath = Join-Path $tmpDir "nervefeyn-skills.zip"
  $extractDir = Join-Path $tmpDir "extract"

  Write-Host "==> 正在下载 Nervefeyn 技能 $resolvedVersion"
  Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath

  Write-Host "==> 正在解压技能"
  Expand-Archive -LiteralPath $archivePath -DestinationPath $extractDir -Force

  $sourceRoot = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
  if (-not $sourceRoot) {
    throw "找不到解压后的 Nervefeyn 归档。"
  }

  $skillsSource = Join-Path $sourceRoot.FullName "skills"
  $promptsSource = Join-Path $sourceRoot.FullName "prompts"
  if (-not (Test-Path $skillsSource) -or -not (Test-Path $promptsSource)) {
    throw "在下载的归档中找不到打包的技能资源。"
  }

  $installParent = Split-Path $installDir -Parent
  if ($installParent) {
    New-Item -ItemType Directory -Path $installParent -Force | Out-Null
  }

  if (Test-Path $installDir) {
    Remove-Item -Recurse -Force $installDir
  }

  New-Item -ItemType Directory -Path $installDir -Force | Out-Null
  Copy-Item -Path (Join-Path $skillsSource "*") -Destination $installDir -Recurse -Force
  New-Item -ItemType Directory -Path (Join-Path $installDir "prompts") -Force | Out-Null
  Copy-Item -Path (Join-Path $promptsSource "*") -Destination (Join-Path $installDir "prompts") -Recurse -Force
  Copy-Item -Path (Join-Path $sourceRoot.FullName "AGENTS.md") -Destination (Join-Path $installDir "AGENTS.md") -Force
  Copy-Item -Path (Join-Path $sourceRoot.FullName "CONTRIBUTING.md") -Destination (Join-Path $installDir "CONTRIBUTING.md") -Force

  Write-Host "==> 技能已安装到 $installDir"
  if ($Scope -eq "Repo") {
    Write-Host "仓库本地技能将从 .agents/skills 自动发现。"
  } elseif ($Scope -eq "OpenCode") {
    Write-Host "OpenCode 项目技能将从 .opencode/skills 发现。"
  } else {
    Write-Host "Codex 用户技能将从 `$CODEX_HOME/skills 发现。"
  }

  Write-Host "Nervefeyn 技能 $resolvedVersion 安装成功。"
} finally {
  if (Test-Path $tmpDir) {
    Remove-Item -Recurse -Force $tmpDir
  }
}
