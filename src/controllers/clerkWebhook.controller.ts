import { Webhook } from 'svix';
import { Request, Response } from 'express';
import { handleUserCreated } from '../services/clerkWebhook.service';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

export const clerkWebhookHandler = async (req: Request, res: Response) => {
  try {
    // Ensure we have a raw buffer
    const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
    
    // Get headers - ensure they exist
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('Missing required headers:', { svixId, svixTimestamp, svixSignature });
      return res.status(400).json({ error: 'Missing required headers' });
    }

    const headers = {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    };

    console.log('Webhook verification attempt:', {
      payloadLength: payload.length,
      headers,
      secretExists: !!WEBHOOK_SECRET
    });

    const wh = new Webhook(WEBHOOK_SECRET);
    const evt = wh.verify(payload, headers) as { type: string; data: any }; 

    const { type, data } = evt;
    console.log('Webhook event:', { type });

    if (type === 'user.created') {
      await handleUserCreated(data);
      console.log('User created successfully');
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook verification failed:', {
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
      headers: {
        'svix-id': req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature'],
      }
    });
    
    res.status(400).json({
      error: 'Webhook verification failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};