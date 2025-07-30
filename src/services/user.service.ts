import prisma from '../config/database';

export const getUserById = async (id: string) => {
  try {
    console.log(`Service: Fetching user with ID: ${id}`);
    
    if (!id) {
      throw new Error('User ID is required');
    }

    // Test database connection first
    await prisma.$connect();
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        discordId: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    console.log(`Service: User found: ${user ? 'Yes' : 'No'}`);
    return user;
  } catch (error : any) {
    console.error('Error in getUserById service:', error);
    
    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Prisma error code:', error.code);
      console.error('Prisma error message:', error.message);
      
      // Handle common Prisma errors
      switch (error.code) {
        case 'P1001':
          throw new Error('Database connection failed');
        case 'P2025':
          throw new Error('User not found');
        default:
          throw new Error(`Database error: ${error.message}`);
      }
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to fetch user');
  }
};

export const getAllUsers = async () => {
  try {
    console.log('Service: Fetching all users');
    
    // Test database connection first
    await prisma.$connect();
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        discordId: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log(`Service: Found ${users.length} users`);
    return users;
  } catch (error : any ) {
    console.error('Error in getAllUsers service:', error);
    
    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Prisma error code:', error.code);
      console.error('Prisma error message:', error.message);
      
      switch (error.code) {
        case 'P1001':
          throw new Error('Database connection failed');
        default:
          throw new Error(`Database error: ${error.message}`);
      }
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to fetch users');
  }
};

export const updateUser = async (
  id: string,
  data: Partial<{ username: string; avatar: string }>
) => {
  try {
    console.log(`Service: Updating user ${id} with:`, data);
    
    if (!id) {
      throw new Error('User ID is required');
    }
    
    if (!data || Object.keys(data).length === 0) {
      throw new Error('No data provided for update');
    }
    
    // Test database connection first
    await prisma.$connect();
    
    // Filter out undefined values
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined && value !== '')
    );
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid data provided for update');
    }
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        discordId: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        updatedAt: true,
      },
    });
    
    console.log('Service: User updated successfully');
    return updatedUser;
  } catch (error : any) {
    console.error('Error in updateUser service:', error);
    
    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Prisma error code:', error.code);
      console.error('Prisma error message:', error.message);
      
      switch (error.code) {
        case 'P1001':
          throw new Error('Database connection failed');
        case 'P2025':
          throw new Error('User not found');
        case 'P2002':
          throw new Error('Username already exists');
        default:
          throw new Error(`Database error: ${error.message}`);
      }
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to update user');
  }
};