import prisma from '../config/database';

export const handleUserCreated = async (data: any) => {
  try {
    // Extract and validate user data
    const email = data.email_addresses?.[0]?.email_address ?? null;
    const userId = data.id;
    const username = data.username || data.first_name || 'unknown';
    const avatar = data.image_url || null;
    const discordId = data.public_metadata?.discordId || `discord-${userId}`;
    const role = email?.endsWith('kopisusu7ip@gmail.com') ? 'admin' : 'client';

    // Validate required fields
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('📝 Creating user with data:', {
      id: userId,
      discordId,
      username,
      email,
      avatar,
      role,
    });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (existingUser) {
      console.log('ℹ️ User already exists, updating instead');
      
      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          username,
          email,
          avatar,
          role,
          updatedAt: new Date(),
        },
      });

      console.log('✅ User updated successfully:', updatedUser.id);
      return updatedUser;
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        discordId,
        username,
        email,
        avatar,
        role,
      },
    });

    console.log('✅ User created successfully:', newUser.id);
    return newUser;

  } catch (error) {
    console.error('❌ Error in handleUserCreated:', {
      error: error instanceof Error ? error.message : error,
      userData: {
        id: data?.id,
        email: data?.email_addresses?.[0]?.email_address,
        username: data?.username
      }
    });

    // Check for specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        console.log('🔄 Attempting to handle duplicate user...');
        
        // Try to update instead of create
        try {
          const updatedUser = await prisma.user.update({
            where: { id: data.id },
            data: {
              username: data.username || data.first_name || 'unknown',
              email: data.email_addresses?.[0]?.email_address ?? null,
              avatar: data.image_url || null,
              updatedAt: new Date(),
            },
          });
          
          console.log('✅ User updated after duplicate error:', updatedUser.id);
          return updatedUser;
        } catch (updateError) {
          console.error('❌ Failed to update user after duplicate:', updateError);
        }
      }
    }

    // Re-throw error to be handled by the controller
    throw error;
  }
};