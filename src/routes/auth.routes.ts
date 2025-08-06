import { Router } from 'express';
import axios from 'axios';

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

// FIX: Corrected the redirect URI format
const DISCORD_REDIRECT_URI = 'exp://192.168.1.22:8081/--/auth/discord';

// Validasi environment variables
if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
  console.error('❌ DISCORD_CLIENT_ID dan DISCORD_CLIENT_SECRET harus diset di .env file');
  process.exit(1);
}

// Debug: Log environment variables (tanpa secret)
console.log('🔧 Environment Check:');
console.log('CLIENT_ID:', DISCORD_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('CLIENT_SECRET:', DISCORD_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('REDIRECT_URI:', DISCORD_REDIRECT_URI);

// Endpoint untuk Discord OAuth callback
router.post('/discord/callback', async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code tidak ditemukan'
      });
    }

    // Use the redirect_uri from the request if provided, otherwise use default
    const actualRedirectUri = redirect_uri || DISCORD_REDIRECT_URI;

    console.log('📨 Menerima authorization code:', code.substring(0, 10) + '...');
    console.log('🔧 Using CLIENT_ID:', DISCORD_CLIENT_ID);
    console.log('🔧 Using REDIRECT_URI:', actualRedirectUri);

    // Step 1: Tukar authorization code dengan access token
    const tokenData = {
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: actualRedirectUri,
    };

    console.log('🚀 Sending token request to Discord...');

    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams(tokenData),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000, // 15 second timeout
      }
    );

    const { access_token, token_type, refresh_token } = tokenResponse.data;
    console.log('✅ Access token berhasil didapat');

    // Step 2: Dapatkan informasi user dari Discord
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
      timeout: 10000, // 10 second timeout
    });

    const discordUser = userResponse.data;
    console.log('👤 User data:', {
      id: discordUser.id,
      username: discordUser.username,
      email: discordUser.email
    });

    // Step 3: Di sini Anda bisa menyimpan user ke database
    const userData = {
      discordId: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      email: discordUser.email,
      avatar: discordUser.avatar,
      verified: discordUser.verified,
      accessToken: access_token,
      refreshToken: refresh_token,
      loginAt: new Date().toISOString()
    };

    // TODO: Simpan userData ke database Anda
    // await saveUserToDatabase(userData);

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
      }
    });

  } catch (error: any) {
    console.error('❌ Error dalam Discord OAuth:', error.response?.data || error.message);
    
    // Log lebih detail untuk debugging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Specific error handling for redirect_uri issues
      if (error.response.data?.error === 'invalid_grant' && 
          error.response.data?.error_description?.includes('redirect_uri')) {
        console.error('💡 HINT: Check if redirect_uri in Discord app settings matches the one being used');
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Gagal melakukan autentikasi Discord',
      details: process.env.NODE_ENV === 'development' ? 
        (error.response?.data || error.message) : 
        undefined
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    discord_client_id: DISCORD_CLIENT_ID ? 'Set' : 'Missing',
    redirect_uri: DISCORD_REDIRECT_URI
  });
});

// Additional endpoint untuk redirect (jika menggunakan backend redirect)
router.get('/discord/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code not found');
    }

    // Redirect ke aplikasi mobile dengan code
    const mobileAppScheme = 'percobaan'; // Sesuai dengan scheme di frontend
    const redirectUrl = `${mobileAppScheme}://auth/discord?code=${code}&state=${state}`;
    
    console.log('🔄 Redirecting to mobile app:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in Discord callback redirect:', error);
    res.status(500).send('Authentication failed');
  }
});

export default router;