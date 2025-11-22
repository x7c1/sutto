#!/bin/bash

# Install common Ubuntu system dependencies
set -euo pipefail

echo "Installing common Ubuntu system dependencies..."

sudo apt-get update
sudo apt-get install -y \
    build-essential \
    curl \
    pkg-config \
    libssl-dev \
    yq \
    jq

echo "Common Ubuntu dependencies installed successfully!"

