import { Router } from 'express';
import axios from 'axios';

const router = Router();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = 'akademi-crypto://redirect'; // Harus sama persis dengan frontend

router.post('/discord/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).send('Code not provided');

  try {
    const tokenRes = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: CLIENT_ID ?? '',
        client_secret: CLIENT_SECRET ?? '',
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token } = tokenRes.data;

    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    res.json(userRes.data);
  } catch (err : any) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to authenticate with Discord' });
  }
});

export default router;
