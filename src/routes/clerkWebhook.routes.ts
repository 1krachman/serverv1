import express from 'express';
import { clerkWebhookHandler } from '../controllers/clerkWebhook.controller';

const router = express.Router();

router.post(
  '/',
  express.raw({ type: 'application/json' }), 
  clerkWebhookHandler
);

export default router;