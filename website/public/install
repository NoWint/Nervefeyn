#!/bin/sh

set -eu

VERSION="${1:-latest}"
INSTALL_BIN_DIR="${FEYNMAN_INSTALL_BIN_DIR:-$HOME/.local/bin}"
INSTALL_APP_DIR="${FEYNMAN_INSTALL_APP_DIR:-$HOME/.local/share/nervefeyn}"
SKIP_PATH_UPDATE="${FEYNMAN_INSTALL_SKIP_PATH_UPDATE:-0}"
path_action="already"
path_profile=""

step() {
  printf '==> %s\n' "$1"
}

run_with_spinner() {
  label="$1"
  shift

  if [ ! -t 2 ]; then
    step "$label"
    "$@"
    return
  fi

  "$@" &
  pid=$!
  frame=0

  set +e
  while kill -0 "$pid" 2>/dev/null; do
    case "$frame" in
      0) spinner='|' ;;
      1) spinner='/' ;;
      2) spinner='-' ;;
      *) spinner='\\' ;;
    esac
    printf '\r==> %s %s' "$label" "$spinner" >&2
    frame=$(( (frame + 1) % 4 ))
    sleep 0.1
  done
  wait "$pid"
  status=$?
  set -e

  printf '\r\033[2K' >&2
  if [ "$status" -ne 0 ]; then
    printf '==> %s 失败\n' "$label" >&2
    return "$status"
  fi

  step "$label"
}

normalize_version() {
  case "$1" in
    "")
      printf 'latest\n'
      ;;
    latest | stable)
      printf 'latest\n'
      ;;
    edge)
      echo "edge 通道已下线。请使用默认安装器获取最新 tagged 发布,或传入精确版本号。" >&2
      exit 1
      ;;
    v*)
      printf '%s\n' "${1#v}"
      ;;
    *)
      printf '%s\n' "$1"
      ;;
  esac
}

download_file() {
  url="$1"
  output="$2"

  if command -v curl >/dev/null 2>&1; then
    if [ -t 2 ]; then
      curl -fL --progress-bar "$url" -o "$output"
    else
      curl -fsSL "$url" -o "$output"
    fi
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    if [ -t 2 ]; then
      wget --show-progress -O "$output" "$url"
    else
      wget -q -O "$output" "$url"
    fi
    return
  fi

  echo "安装 Nervefeyn 需要 curl 或 wget。" >&2
  exit 1
}

download_text() {
  url="$1"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -q -O - "$url"
    return
  fi

  echo "安装 Nervefeyn 需要 curl 或 wget。" >&2
  exit 1
}

add_to_path() {
  path_action="already"
  path_profile=""

  case ":$PATH:" in
    *":$INSTALL_BIN_DIR:"*)
      return
      ;;
  esac

  if [ "$SKIP_PATH_UPDATE" = "1" ]; then
    path_action="skipped"
    return
  fi

  profile="${FEYNMAN_INSTALL_SHELL_PROFILE:-$HOME/.profile}"
  if [ -z "${FEYNMAN_INSTALL_SHELL_PROFILE:-}" ]; then
    case "${SHELL:-}" in
      */zsh)
        profile="$HOME/.zshrc"
        ;;
      */bash)
        profile="$HOME/.bashrc"
        ;;
    esac
  fi

  path_profile="$profile"
  path_line="export PATH=\"$INSTALL_BIN_DIR:\$PATH\""
  if [ -f "$profile" ] && grep -F "$path_line" "$profile" >/dev/null 2>&1; then
    path_action="configured"
    return
  fi

  {
    printf '\n# Added by Nervefeyn installer\n'
    printf '%s\n' "$path_line"
  } >>"$profile"
  path_action="added"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "安装 Nervefeyn 需要 $1。" >&2
    exit 1
  fi
}

warn_command_conflict() {
  expected_path="$INSTALL_BIN_DIR/nervefeyn"
  resolved_path="$(command -v nervefeyn 2>/dev/null || true)"

  if [ -z "$resolved_path" ]; then
    return
  fi

  if [ "$resolved_path" != "$expected_path" ]; then
    step "警告:当前 shell 将 nervefeyn 解析到 $resolved_path"
    step "立即运行:export PATH=\"$INSTALL_BIN_DIR:\$PATH\" && hash -r && nervefeyn"
    step "或直接启动:$expected_path"

    step "如果该路径是旧包管理器安装,请移除它,或将 $INSTALL_BIN_DIR 放到 PATH 最前。"
  fi
}

resolve_release_metadata() {
  normalized_version="$(normalize_version "$VERSION")"

  if [ "$normalized_version" = "latest" ]; then
    release_page="$(download_text "https://github.com/NoWint/Nervefeyn/releases/latest")"
    resolved_version="$(printf '%s\n' "$release_page" | sed -n 's@.*releases/tag/v\([0-9][^"<>[:space:]]*\).*@\1@p' | head -n 1)"

    if [ -z "$resolved_version" ]; then
      echo "无法解析最新的 Nervefeyn 发布版本。" >&2
      exit 1
    fi
  else
    resolved_version="$normalized_version"
  fi

  bundle_name="nervefeyn-${resolved_version}-${asset_target}"
  archive_name="${bundle_name}.${archive_extension}"
  download_url="${FEYNMAN_INSTALL_BASE_URL:-https://github.com/NoWint/Nervefeyn/releases/download/v${resolved_version}}/${archive_name}"

  printf '%s\n%s\n%s\n%s\n' "$resolved_version" "$bundle_name" "$archive_name" "$download_url"
}

case "$(uname -s)" in
  Darwin)
    os="darwin"
    ;;
  Linux)
    os="linux"
    ;;
  *)
    echo "install.sh 仅支持 macOS 与 Linux。Windows 请使用 install.ps1。" >&2
    exit 1
    ;;
esac

case "$(uname -m)" in
  x86_64 | amd64)
    arch="x64"
    ;;
  arm64 | aarch64)
    arch="arm64"
    ;;
  *)
    echo "不支持该架构:$(uname -m)" >&2
    exit 1
    ;;
esac

require_command mktemp
require_command tar

asset_target="$os-$arch"
archive_extension="tar.gz"
release_metadata="$(resolve_release_metadata)"
resolved_version="$(printf '%s\n' "$release_metadata" | sed -n '1p')"
bundle_name="$(printf '%s\n' "$release_metadata" | sed -n '2p')"
archive_name="$(printf '%s\n' "$release_metadata" | sed -n '3p')"
download_url="$(printf '%s\n' "$release_metadata" | sed -n '4p')"

step "正在为 ${asset_target} 安装 Nervefeyn ${resolved_version}"

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT INT TERM

archive_path="$tmp_dir/$archive_name"
step "正在下载 ${archive_name}"
if ! download_file "$download_url" "$archive_path"; then
  cat >&2 <<EOF
下载 ${archive_name} 失败:
  ${download_url}

GitHub 发布中缺少 ${asset_target} 包。
这通常意味着发布已存在,但未上传全部平台包。

可选方案:
  - 等待发布完成后再试
  - 显式传入最新已发布版本,例如:
    curl -fsSL https://nervefeyn.dev/install | bash -s -- 0.2.31
EOF
  exit 1
fi

mkdir -p "$INSTALL_APP_DIR"
rm -rf "$INSTALL_APP_DIR/$bundle_name"
run_with_spinner "正在解压 ${archive_name}" tar -xzf "$archive_path" -C "$INSTALL_APP_DIR"

mkdir -p "$INSTALL_BIN_DIR"
step "正在将 nervefeyn 链接到 $INSTALL_BIN_DIR"
cat >"$INSTALL_BIN_DIR/nervefeyn" <<EOF
#!/bin/sh
set -eu
exec "$INSTALL_APP_DIR/$bundle_name/nervefeyn" "\$@"
EOF
chmod 0755 "$INSTALL_BIN_DIR/nervefeyn"

add_to_path

case "$path_action" in
  added)
    step "已为未来 shell 更新 PATH(写入 $path_profile)"
    step "立即运行:export PATH=\"$INSTALL_BIN_DIR:\$PATH\" && hash -r && nervefeyn"
    ;;
  configured)
    step "PATH 已在未来 shell 中配置(位于 $path_profile)"
    step "立即运行:export PATH=\"$INSTALL_BIN_DIR:\$PATH\" && hash -r && nervefeyn"
    ;;
  skipped)
    step "已跳过 PATH 更新"
    step "立即运行:export PATH=\"$INSTALL_BIN_DIR:\$PATH\" && hash -r && nervefeyn"
    ;;
  *)
    step "$INSTALL_BIN_DIR 已在 PATH 中"
    step "运行:hash -r && nervefeyn"
    ;;
esac

warn_command_conflict

printf 'Nervefeyn %s 安装成功。\n' "$resolved_version"
