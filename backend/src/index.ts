import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initSonos } from './services/sonos';
import { errorHandler } from './middleware/errorHandler';
import albumRoutes from './routes/albums';
import sonosRoutes from './routes/sonos';
import spotifyRoutes from './routes/spotify';

const app = express();
const port = config.port;

app.use(express.json());
app.use(cors());

// Initialize Services
initSonos().catch(console.error);

// Routes
app.use('/albums', albumRoutes);
app.use('/spotify', spotifyRoutes);
app.use('/', sonosRoutes); // /play, /pause, /devices are at root level currently

// Serve Frontend
const frontendPath = path.join(__dirname, '../../frontend/dist/client/browser');
app.use(express.static(frontendPath));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Sonos server listening at http://localhost:${port}`);
});
