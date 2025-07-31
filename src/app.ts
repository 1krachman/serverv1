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

// Debug middleware - should be first
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Health check route - should be early and simple
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 'not set'
  });
});

// Debug endpoint (remove in production)
app.get('/debug/env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: process.env.PORT || 'not set',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? 'Set (length: ' + process.env.CLERK_SECRET_KEY.length + ')' : 'Missing',
    DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
    // Add other env vars you need
  });
});

// Basic middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
}));

app.use(cors({
  origin: true, 
  credentials: true,
}));


app.use('/webhook', clerkWebhookRoute);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// API Routes
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/', healthRoutes);

// Catch-all route for debugging
app.use('*', (req, res) => {
  console.log(`Unmatched route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    availableRoutes: [
      'GET /health',
      'GET /api/users/:id',
      'POST /api/users',
      'GET /api/videos',
      'POST /webhook/clerk'
    ]
  });
});

// Global error handler - should be last
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`Error on ${req.method} ${req.url}:`, err.stack);
  
  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

export default app;