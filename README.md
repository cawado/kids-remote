# Kids Remote

A kid-friendly Sonos controller application designed to run on a Raspberry Pi with a touch display. It provides a simple, visual interface for children to play their favorite albums and audiobooks, while offering a powerful "Aperture Science" themed Admin Panel for parents.

![Kids Remote Interface Placeholder](docs/kiosk-view.png)

## Features

### 👶 Kid-Friendly Interface
- **Visual Album Select**: Large, touch-friendly grid of album covers.
- **Simple Controls**: Play, Pause, Next Track, Volume Up/Down.
- **Room Selection**: Easily switch between predefined rooms (e.g., "Kids Room", "Living Room").
- **Kiosk Mode**: Designed to run fullscreen on a touch display.

### 🔬 Aperture Science Admin Panel (`/admin`)
- **Theme**: Full "Aperture Science Enrichment Center" aesthetic (Clinical White, Portal Blue, Hazard Orange).
- **Album Management**: Search Spotify and add new albums to the kids' library.
- **Bulk Operations**: Delete multiple albums or reassign them to specific rooms in batches.
- **Voice Transmission System (TTS)**: Send text-to-speech announcements to specific rooms (e.g., "Dinner is ready").
- **Asset Control**: Sort, filter, and manage the extensive album database.

### 🛠️ Technical Stack
- **Frontend**: Angular 19+ with Material Design Components.
- **Backend**: Node.js utilizing `sonos` and `spotify-web-api-node`.
- **Hardware Target**: Raspberry Pi 3/4/5 with 7" Touch Display (e.g., official RPi Screen).

## Structure

- **`backend/`**: Node.js Express server handling Sonos discovery, Spotify API communication, and local data persistence.
- **`frontend/`**: Angular client application providing the Kiosk UI and Admin Interface.

## Installation & Setup

For detailed installation instructions, specifically for setting up a Raspberry Pi from scratch, please refer to [INSTALL.md](install.md).

## Quick Start (Development)

To run the project locally for development:

1.  **Configure Environment**:
    Copy `.env-demo` to `.env` in the root directory and fill in your Spotify API credentials.
    ```bash
    cp .env-demo .env
    ```

2.  **Install Dependencies**:
    ```bash
    npm run setup
    ```

3.  **Start Development Servers**:
    ```bash
    npm run dev
    ```
    - **Backend**: `http://localhost:3000`
    - **Frontend**: `http://localhost:4200`
    - **Admin Panel**: `http://localhost:4200/admin`

## License

MIT
