import axios from 'axios';
import { AuthTokens, DiscordUser } from '../types';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export class DiscordService {
  static async exchangeCodeForTokens(code: string): Promise<AuthTokens> {
    const response = await axios.post(
      `${DISCORD_API_BASE}/oauth2/token`,
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log('Discord tokens response:', response.data);
    return response.data;
  }

  static async getUserInfo(accessToken: string): Promise<DiscordUser> {
    const response = await axios.get(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log('Discord user info response:', response.data);
    return response.data;
  }

  static async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const response = await axios.post(
      `${DISCORD_API_BASE}/oauth2/token`,
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log('Discord token refresh response:', response.data);
    return response.data;
  }
}