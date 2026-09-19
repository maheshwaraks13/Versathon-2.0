import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dbAdapter from './db/index.js';
import reportRoutes from './routes/reportRoutes.js';
import authRoutes from './routes/authRoutes.js';
import historyRoutes from './routes/historyRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/history', historyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MedClear Backend API' });
});

// Initialize DB and start server
async function startServer() {
  try {
    await dbAdapter.connect();
    await dbAdapter.initSchema();

    app.listen(PORT, () => {
      console.log(`[MedClear Backend] Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[MedClear Backend] Server initialization failed:', err);
    process.exit(1);
  }
}

startServer();
