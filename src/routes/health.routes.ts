import express from 'express';
import * as healthController from '../controllers/health.controller';

const router = express.Router();

router.get('/health', healthController.getHealthStatus);

// Database connection health endpoint
router.get('/health/db', healthController.getDatabaseHealth);

export default router;