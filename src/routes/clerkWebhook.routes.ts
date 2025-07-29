import express from 'express';
import { clerkWebhookHandler } from '../controllers/clerkWebhook.controller';
import bodyParser from 'body-parser';

const router = express.Router();

router.post(
  '/webhook/clerk',
  bodyParser.raw({ type: 'application/json' }), 
  clerkWebhookHandler
);

export default router;
