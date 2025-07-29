import { Webhook } from 'svix';
import { Request, Response } from 'express';
import { handleUserCreated } from '../services/clerkWebhook.service';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

export const clerkWebhookHandler = async (req: Request, res: Response) => {
  const payload = req.body; // raw buffer
  // Convert headers to the required format (string keys and values)
  const headers = {
    'svix-id': req.headers['svix-id'] as string,
    'svix-timestamp': req.headers['svix-timestamp'] as string,
    'svix-signature': req.headers['svix-signature'] as string,
  };

  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    const evt = wh.verify(payload, headers) as { type: string; data: any }; 

    const { type, data } = evt;

    if (type === 'user.created') {
      await handleUserCreated(data);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: 'Invalid signature' });
  }
};
