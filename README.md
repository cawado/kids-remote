# Kids Remote

A Sonos controller application for Kids, designed to run on a Raspberry Pi with a touch display.

## Structure
- **backend**: Node.js implementation using `sonos` and `spotify-web-api-node`. Serves the frontend.
- **frontend**: Angular application (Client).

## Installation & Setup

For detailed installation instructions, including Raspberry Pi setup, please refer to [INSTALL.md](install.md).

## Quick Start (Development)

To run both backend and frontend in development mode (with live reload):

1.  **Install dependencies:**
    ```bash
    npm run setup
    ```

2.  **Start development server:**
    ```bash
    npm run dev
    ```
    - Backend runs on `http://localhost:3000` (default)
    - Frontend runs on `http://localhost:4200` (proxied or standalone)
