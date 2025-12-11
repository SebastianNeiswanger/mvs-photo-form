#!/bin/bash

# Source shell profile to get PATH (for bun, cargo, etc.)
if [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
elif [ -f "$HOME/.zshrc" ]; then
    source "$HOME/.zshrc"
elif [ -f "$HOME/.profile" ]; then
    source "$HOME/.profile"
fi

# Also add common paths for bun and cargo if not already in PATH
export PATH="$HOME/.bun/bin:$HOME/.cargo/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
APP_NAME="MVS Photo Form Filler"
REPO_NAME="MVS-form-filler"

echo "========================================"
echo "  MVS Photo Form Filler - Update"
echo "========================================"
echo ""

# Change to the script's directory (should be the repo)
cd "$SCRIPT_DIR"

# Validate we're in the correct repo directory
CURRENT_DIR_NAME="$(basename "$SCRIPT_DIR")"
if [ "$CURRENT_DIR_NAME" != "$REPO_NAME" ]; then
    echo "ERROR: Script is not in the expected $REPO_NAME directory."
    echo "Script location: $SCRIPT_DIR"
    echo "Expected directory name: $REPO_NAME"
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

# Validate this is a git repository
if [ ! -d ".git" ]; then
    echo "ERROR: $SCRIPT_DIR is not a git repository."
    echo "The .git directory was not found."
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

echo "Repository: $SCRIPT_DIR"
echo ""

echo "Pulling latest changes..."
git pull
if [ $? -ne 0 ]; then
    echo "ERROR: git pull failed!"
    read -p "Press Enter to close..."
    exit 1
fi
echo ""

echo "Building app (this may take a few minutes)..."
bun run tauri:build
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    read -p "Press Enter to close..."
    exit 1
fi
echo ""

echo "Installing..."
./install.sh
if [ $? -ne 0 ]; then
    echo "ERROR: Install failed!"
    read -p "Press Enter to close..."
    exit 1
fi
echo ""

echo "========================================"
echo "  Update complete!"
echo "========================================"
echo ""

# Reopen the installed app
echo "Reopening app..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    "$PARENT_DIR/$APP_NAME.AppImage" &
    APP_PID=$!
elif [[ "$OSTYPE" == "darwin"* ]]; then
    open "$PARENT_DIR/$APP_NAME.app"
fi

# Wait a moment for the app to start
sleep 2

# Check if the app started successfully (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if kill -0 $APP_PID 2>/dev/null; then
        echo "App started successfully!"
    else
        echo "WARNING: App may not have started correctly."
    fi
fi

echo ""
echo "Update complete!"
read -p "Press Enter to close this terminal..."
