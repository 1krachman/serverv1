import prisma from '../config/database';

export const handleUserCreated = async (data: any) => {
  const email = data.email_addresses?.[0]?.email_address ?? null;
  const userId = data.id;
  const username = data.username || 'unknown';
  const avatar = data.image_url || null;
  const discordId = data.public_metadata?.discordId || `discord-${userId}`; // fallback dummy
  const role = email?.endsWith('@yourcompany.com') ? 'admin' : 'client';

  await prisma.user.create({
    data: {
      id: userId,
      discordId,
      username,
      email,
      avatar,
      role,
    },
  });
};
