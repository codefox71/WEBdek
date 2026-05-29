# WEBdek

WEBdek is a Linux web-based desktop environment that supports basic X11 app forwarding into the browser.

## Features

- Web UI with a customizable dock
- Mac-like window button styling for the browser shell
- X11 forwarding via Xvfb, x11vnc, and noVNC
- `install.sh` configures a systemd service to start WEBdek at boot

## Install

Run:

```bash
sudo bash install.sh
```

Then open:

```bash
http://localhost:3000
```

## Customization

- Edit `server.js` to modify the built-in app list.
- Update `public/app.css` to change the dock or window styling.
- The web UI is served from `public/index.html`, `public/app.css`, and `public/app.js`.

## Notes

- The install script installs `nodejs`, `npm`, and basic X11 utilities.
- The desktop backend is now provided by `x11vnc`, `noVNC`, and `python3-websockify` instead of xpra.
- The installer also installs `xvfb` so the desktop can run on a headless machine without an attached display.
- The systemd service runs `WEBdek` at boot and starts the webserver on port `3000`.
