#!/bin/bash

echo "Starting Kids Remote Update..."

# 1. Pull latest changes
echo "Pulling latest changes from git..."
git pull

# 2. Install dependencies
echo "Installing dependencies..."
npm run setup

# 3. Build Application
echo "Building application..."
npm run build

# 4. Restart Service
echo "Restarting Systemd service..."
sudo systemctl restart kids-remote.service

echo "Update completed successfully!"
