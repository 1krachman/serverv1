import prisma from '../config/database';

export const getUserById = async (id: string) => {
  return await prisma.user.findUnique({
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
};

export const getAllUsers = async () => {
  return await prisma.user.findMany({
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
};

export const updateUser = async (
  id: string,
  data: Partial<{ username: string; avatar: string }>
) => {
  return await prisma.user.update({
    where: { id },
    data: {
      ...data,
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
};
