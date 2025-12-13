"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const sonos_1 = require("./services/sonos");
const errorHandler_1 = require("./middleware/errorHandler");
const albums_1 = __importDefault(require("./routes/albums"));
const sonos_2 = __importDefault(require("./routes/sonos"));
const spotify_1 = __importDefault(require("./routes/spotify"));
const health_1 = __importDefault(require("./routes/health"));
const app = (0, express_1.default)();
const port = config_1.config.port;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Initialize Services
(0, sonos_1.initSonos)().catch(console.error);
// Routes
app.use('/health', health_1.default);
app.use('/albums', albums_1.default);
app.use('/spotify', spotify_1.default);
app.use('/', sonos_2.default); // /play, /pause, /devices are at root level currently
// Serve Frontend
const frontendPath = path_1.default.join(__dirname, '../../frontend/dist/client/browser');
app.use(express_1.default.static(frontendPath));
app.get(/.*/, (req, res) => {
    res.sendFile(path_1.default.join(frontendPath, 'index.html'));
});
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
app.listen(port, () => {
    console.log(`Sonos server listening at http://localhost:${port}`);
});
