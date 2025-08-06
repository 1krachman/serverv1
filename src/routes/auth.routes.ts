import { Router } from 'express';
import axios from 'axios';

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = 'https://auth.expo.io/@kannajw/akademi-crypto';

// Validasi environment variables
if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
  console.error('❌ DISCORD_CLIENT_ID dan DISCORD_CLIENT_SECRET harus diset di .env file');
  process.exit(1);
}

// Endpoint untuk Discord OAuth callback
router.post('/discord/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code tidak ditemukan'
      });
    }

    console.log('📨 Menerima authorization code:', code.substring(0, 10) + '...');

    // Step 1: Tukar authorization code dengan access token
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, token_type, refresh_token } = tokenResponse.data;
    console.log('✅ Access token berhasil didapat');

    // Step 2: Dapatkan informasi user dari Discord
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
    });

    const discordUser = userResponse.data;
    console.log('👤 User data:', {
      id: discordUser.id,
      username: discordUser.username,
      email: discordUser.email
    });

    // Step 3: Di sini Anda bisa menyimpan user ke database
    // Contoh struktur data yang bisa disimpan:
    const userData = {
      discordId: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      email: discordUser.email,
      avatar: discordUser.avatar,
      verified: discordUser.verified,
      accessToken: access_token, // Simpan untuk API calls selanjutnya
      refreshToken: refresh_token,
      loginAt: new Date().toISOString()
    };

    // TODO: Simpan userData ke database Anda
    // await saveUserToDatabase(userData);

    // Step 4: Generate JWT token untuk autentikasi aplikasi (opsional)
    // const jwt = require('jsonwebtoken');
    // const appToken = jwt.sign(
    //   { userId: discordUser.id, email: discordUser.email },
    //   process.env.JWT_SECRET,
    //   { expiresIn: '7d' }
    // );

    // Response sukses ke aplikasi mobile
    res.json({
      success: true,
      message: 'Login Discord berhasil',
      user: {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        email: discordUser.email,
        avatar: discordUser.avatar ? 
          `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : 
          null,
        verified: discordUser.verified
      },
      // token: appToken // Uncomment jika menggunakan JWT
    });

  } catch (error : any) {
    console.error('❌ Error dalam Discord OAuth:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Gagal melakukan autentikasi Discord',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
