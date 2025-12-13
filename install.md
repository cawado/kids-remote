# Raspberry Pi Installation Guide (Debian Minimal)

This guide walks you through setting up "Kids Remote" on a Raspberry Pi starting from a minimal Debian installation (e.g., Raspberry Pi OS Lite).

## 1. Initial Setup (clean install)

1.  **Flash the OS**: Download "Raspberry Pi OS Lite" (Legacy or latest, usually Bookworm) and flash it to your SD card using Raspberry Pi Imager.
    - Set hostname (e.g., `kids-remote`).
    - Enable SSH.
    - Configure Wi-Fi or skip if using Ethernet.

2.  **Boot & Login**: Insert SD card and boot. Login via SSH.
    ```bash
    ssh pi@kids-remote.local
    ```

3.  **Update System**:
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

## 2. Install Dependencies

1.  **System Utilities**:
    ```bash
    sudo apt install -y git curl unzip build-essential
    ```

2.  **Node.js (v18+)**:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    ```
    Verify: `node -v` (should be v18+).

3.  **Display & GUI (Minimal)**:
    Since we are using the Lite OS, we need a minimal X server and window manager.
    ```bash
    # Install X server, Openbox (window manager), and Chromium browser
    sudo apt install -y --no-install-recommends xserver-xorg x11-xserver-utils xinit openbox chromium-browser xserver-xorg-input-libinput
    ```
    *Note: `xserver-xorg-input-libinput` is typically needed for touchscreens.*

## 3. Application Setup

1.  **Clone Repository**:
    ```bash
    cd ~
    git clone https://github.com/your-username/kids-remote.git
    cd kids-remote
    ```

2.  **Install & Build**:
    ```bash
    # Install dependencies
    npm run setup
    
    # Build
    npm run build
    ```

3.  **Configure Environment**:
    ```bash
    cp .env-demo .env
    nano .env
    ```
    *Fill in your Spotify credentials and default device name.*

## 4. Setup Kiosk Mode

We will verify X starts automatically and launches our app.

1.  **Configure Openbox**:
    Create the autostart config directory and file.
    ```bash
    mkdir -p ~/.config/openbox
    nano ~/.config/openbox/autostart
    ```

2.  **Add Startup Commands**:
    Paste this into `~/.config/openbox/autostart`:
    ```bash
    # Disable screen saver/blanking
    xset s off
    xset s noblank
    xset -dpms

    # Start the application backend (recommend systemd for reliability, see below)
    # cd ~/kids-remote && npm start & 

    # Launch Chromium in Kiosk mode
    # --kiosk: Fullscreen, no bars
    # --noerrdialogs: Suppress error bubbles
    # --disable-infobars: Remove "Chrome is being controlled..."
    chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:3000
    ```

3.  **Auto-login & Start X**:
    Edit `raspi-config` to boot into Console Autologin:
    ```bash
    sudo raspi-config
    ```
    *System Options -> Boot / Auto Login -> Console Autologin*

    Then, add `startx` to `.bash_profile` to start X on login:
    ```bash
    nano ~/.bash_profile
    ```
    Add to the bottom:
    ```bash
    [[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && startx -- -nocursor
    ```
    *(The `-- -nocursor` hides the mouse cursor which is good for touch screens)*

## 5. Systemd Service (Backend)

For reliability, run the backend as a service so it starts before the browser.

1.  **Create Service File**:
    ```bash
    sudo nano /etc/systemd/system/kids-remote.service
    ```

2.  **Content**:
    ```ini
    [Unit]
    Description=Kids Remote Server
    After=network.target

    [Service]
    ExecStart=/usr/bin/npm start
    WorkingDirectory=/home/pi/kids-remote
    StandardOutput=inherit
    StandardError=inherit
    Restart=always
    User=pi
    Environment=NODE_ENV=production

    [Install]
    WantedBy=multi-user.target
    ```

3.  **Enable Service**:
    ```bash
    sudo systemctl enable kids-remote.service
    sudo systemctl start kids-remote.service
    ```

## 6. Reboot

```bash
sudo reboot
```

The Pi should reboot, log in automatically, start the X server, and launch Chromium in full screen pointing to your running application.
