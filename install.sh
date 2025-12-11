#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
APP_NAME="MVS Photo Form Filler"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Copy and rename to stable filename
    cp "$SCRIPT_DIR/src-tauri/target/release/bundle/appimage/"*.AppImage "$PARENT_DIR/$APP_NAME.AppImage"
    chmod +x "$PARENT_DIR/$APP_NAME.AppImage"
    echo "Installed to: $PARENT_DIR/$APP_NAME.AppImage"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # Remove old version if exists, then copy
    rm -rf "$PARENT_DIR/$APP_NAME.app"
    cp -r "$SCRIPT_DIR/src-tauri/target/release/bundle/macos/"*.app "$PARENT_DIR/$APP_NAME.app"
    echo "Installed to: $PARENT_DIR/$APP_NAME.app"
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi
