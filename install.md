# Raspberry Pi Installation Guide (Debian Bookworm)

This guide walks you through setting up **Kids Remote** on a Raspberry Pi starting from a minimal Debian installation (e.g., Raspberry Pi OS Lite).

## 1. Initial Setup

1.  **Flash the OS**: Download "Raspberry Pi OS Lite" and flash it to your SD card using Raspberry Pi Imager.
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

## 3. Application Setup

1.  **Clone Repository**:
    ```bash
    cd ~
    git clone https://github.com/cawado/kids-remote.git
    cd kids-remote
    ```

2.  **Install & Build**:
    ```bash
    # Install dependencies for both frontend and backend
    npm run setup
    
    # Build the frontend application
    npm run build
    ```

3.  **Configure Environment**:
    copy the `.env-demo` file to `.env`:
    ```bash
    cp .env-demo .env
    nano .env
    ```
    *Fill in your Spotify credentials and default device name.*

## 4. Setup Kiosk Mode

We will configure the system to auto-login and launch the application in fullscreen kiosk mode.

1.  **Configure Openbox**:
    Create the autostart config directory and file.
    ```bash
    mkdir -p ~/.config/openbox
    nano ~/.config/openbox/autostart
    ```

2.  **Add Startup Commands**:
    Paste this into `~/.config/openbox/autostart`:
    ```bash
    # Prevent screen blanking (optional, remove if you want screen to sleep)
    xset s off
    xset -dpms
    xset s noblank

    # Launch Chromium in Kiosk mode
    # --kiosk: Fullscreen, no bars
    # --check-for-update-interval=31536000: Disable update checks
    chromium-browser --noerrdialogs --disable-infobars --kiosk --check-for-update-interval=31536000 http://localhost:3000
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

## 6. Accessing the Admin Panel

Once the system is running, the **Admin Interface** is accessible from any device on your local network.

1.  Find the IP address of your Raspberry Pi:
    ```bash
    hostname -I
    ```
2.  Open a browser on your phone or laptop and navigate to:
    `http://<YOUR-PI-IP>:3000/admin` (or port 4200 if running dev mode)

Here you can:
- **Manage Albums**: Add new content from Spotify.
- **Assign Rooms**: Control which albums appear in which room.
- **Voice Transmission**: Send text-to-speech messages to the system.

## 7. Reboot

```bash
sudo reboot
```
The Pi should reboot, log in automatically, start the X server, and launch the Kids Remote interface.
