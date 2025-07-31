import express from 'express';
import { clerkWebhookHandler } from '../controllers/clerkWebhook.controller';

const router = express.Router();

router.post(
  '/webhook/clerk',
  express.raw({ type: 'application/json' }), 
  clerkWebhookHandler
);

export default router;