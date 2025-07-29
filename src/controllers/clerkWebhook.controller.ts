import { Request, Response } from 'express';
import { verifyClerkSignature } from '../utils/verifyClerkSignature';
import { handleUserCreated } from '../services/clerkWebhook.service';

export const clerkWebhookHandler = async (req: Request, res: Response) => {
  const signature = req.headers['svix-signature'] as string;
  const rawBody = req.body.toString();

  if (!verifyClerkSignature(rawBody, signature)) {
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(rawBody);
  const { type, data } = event;

  try {
    if (type === 'user.created') {
      await handleUserCreated(data);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
