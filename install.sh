#!/usr/bin/env bash
set -e

PROJECT_DIR="/opt/WEBdek"
USER_NAME="${SUDO_USER:-$(whoami)}"

if [[ "$EUID" -ne 0 ]]; then
  echo "This script must be run with sudo to install and configure WEBdek."
  exec sudo bash "$0" "$@"
fi

install_base_packages() {
  apt update
  apt install -y nodejs npm x11-apps xterm dbus-x11 xvfb rsync ca-certificates curl gnupg
}

install_xpra() {
  if command -v xpra >/dev/null 2>&1; then
    return
  fi

  echo "Checking for xpra package availability..."
  if ! apt-cache policy xpra | grep -q 'Candidate:'; then
    echo "xpra package not found in current apt sources. Adding the official xpra repository..."

    release="$(grep -E '^VERSION_CODENAME=' /etc/os-release | cut -d= -f2)"
    if [[ -z "$release" ]]; then
      release="$(lsb_release -cs 2>/dev/null || true)"
    fi
    if [[ -z "$release" ]]; then
      echo "Unable to determine Ubuntu release codename. Please install xpra manually."
      exit 1
    fi

    mkdir -p /etc/apt/keyrings
    curl -fsSL https://xpra.org/gpg.asc | gpg --dearmor -o /etc/apt/keyrings/xpra.gpg
    cat > /etc/apt/sources.list.d/xpra.list <<EOF

deb [signed-by=/etc/apt/keyrings/xpra.gpg] https://xpra.org/ ${release} main
EOF
    apt update
  fi

  if ! apt install -y xpra; then
    echo "xpra install failed; attempting python3-xpra fallback package..."
    apt install -y python3-xpra
  fi
}

echo "Installing required packages..."
install_base_packages
install_xpra

mkdir -p "$PROJECT_DIR"
rsync -a --exclude='node_modules' --exclude='.git' /workspaces/WEBdek/ "$PROJECT_DIR/"

cd "$PROJECT_DIR"
npm install --production

cat > /etc/systemd/system/webdek.service <<EOF
[Unit]
Description=WEBdek web-based desktop environment
After=network.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${PROJECT_DIR}
ExecStart=/usr/bin/node ${PROJECT_DIR}/server.js
Restart=on-failure
Environment=HOME=/home/${USER_NAME}
Environment=DISPLAY=:100

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable webdek.service
systemctl restart webdek.service

echo "WEBdek installed and systemd service enabled."
echo "Open http://localhost:3000 in your browser to access the desktop UI."
