#!/bin/sh
APP_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$APP_DIR"
ELECTRON="$APP_DIR/node_modules/.bin/electron"
case "${XDG_CURRENT_DESKTOP:-}" in
  *KDE*)
    if [ "${XDG_SESSION_TYPE:-}" = "wayland" ]; then
      exec env -u WAYLAND_DISPLAY GRAB2TEXT_WAYLAND=1 XDG_SESSION_TYPE=x11 "$ELECTRON" --ozone-platform=x11 .
    fi
    ;;
esac
exec "$ELECTRON" .
