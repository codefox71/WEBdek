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
  apt install -y nodejs npm python3-pip x11-apps xterm dbus-x11 xvfb rsync ca-certificates curl gnupg python-gi-dev python3-dev build-essential pkg-config libxkbfile-dev libxres-dev libxrandr-dev libxcomposite-dev libxdamage-dev libxtst-dev libxfixes-dev libxrender-dev libx11-dev libxext-dev libx264-dev libvpx-dev libxxhash-dev libgtk-3-dev libgirepository1.0-dev libgdk-pixbuf2.0-dev libpango1.0-dev libcairo2-dev libdbus-1-dev
}

install_xpra() {
  if command -v xpra >/dev/null 2>&1; then
    return
  fi

  echo "xpra is not available as an apt package on this distribution, using PyPI fallback..."
  python3 -m pip install --upgrade pip setuptools wheel
  python3 -m pip install xpra || {
    echo "PyPI xpra install failed. Please ensure the required X11 build dependencies are installed and try again."
    exit 1
  }
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
