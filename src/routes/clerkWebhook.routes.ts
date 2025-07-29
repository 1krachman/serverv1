import express from 'express';
import bodyParser from 'body-parser';
import { clerkWebhookHandler } from '../controllers/clerkWebhook.controller';

const router = express.Router();

router.post(
  '/webhook/clerk',
  bodyParser.raw({ type: 'application/json' }),
  clerkWebhookHandler
);

export default router;
