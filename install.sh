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
  apt install -y nodejs npm x11-apps xterm dbus-x11 xvfb rsync ca-certificates curl gnupg x11vnc novnc python3-websockify
}

echo "Installing required packages..."
install_base_packages

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
