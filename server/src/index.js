import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';

export { connectDB };
import { errorHandler, sanitize } from './middleware.js';
import { serverRoot } from './paths.js';
import authRoutes from './routes/auth.js';
import athleteRoutes from './routes/athletes.js';
import clubRoutes from './routes/clubs.js';
import teamRoutes from './routes/teams.js';
import tournamentRoutes, { matchRouter } from './routes/tournaments.js';
import opportunityRoutes, { applicationRouter } from './routes/opportunities.js';
import performanceRoutes from './routes/performance.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import platformRoutes from './routes/platform.js';

dotenv.config({ path: path.join(serverRoot, '.env') });

export const app = express();

const allowed = new Set(
  `${process.env.CLIENT_URL || 'http://localhost:5173'},https://garissa-sport-connect.onrender.com`
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowed.has(origin) || process.env.NODE_ENV !== 'production') return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(sanitize);
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(serverRoot, 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'Garissa SportsConnect API' });
});

app.use('/api', platformRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRouter);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/applications', applicationRouter);
app.use('/api/statistics', performanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

const clientDist = path.resolve(serverRoot, '../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

export async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing. Copy server/.env.example to server/.env.');
    process.exit(1);
  }
  await connectDB();
  if (process.env.NODE_ENV !== 'production' && process.env.AUTO_SEED !== 'false' && process.env.NODE_ENV !== 'test') {
    const { User } = await import('./models.js');
    const existing = await User.countDocuments();
    if (existing === 0) {
      const { seedDatabase } = await import('./seed.js');
      await seedDatabase();
      console.log('Demo data seeded.');
    }
  }
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Garissa SportsConnect API listening on port ${port}`);
  });
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
const self = path.resolve(fileURLToPath(import.meta.url));
if (invoked === self) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
