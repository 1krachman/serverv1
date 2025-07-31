// app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import videoRoutes from './routes/videoRoutes';
import clerkWebhookRoute from './routes/clerkWebhook.routes';
import userRoutes from './routes/user.routes';
import healthRoutes from './routes/health.routes';


dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, 
  credentials: true,
}));


app.use(clerkWebhookRoute);


app.use(express.json());

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use(healthRoutes);

// Check incoming request
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
