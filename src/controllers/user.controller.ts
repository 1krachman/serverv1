import type { Request, Response } from 'express';
import type { RequireAuthProp } from '@clerk/clerk-sdk-node';
import * as userService from '../services/user.service';

// Extend Request agar memiliki req.auth dari Clerk
type AuthedRequest = RequireAuthProp<Request>;

export const getUserById = async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.auth.userId !== id && req.auth.claims?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const user = await userService.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (req: AuthedRequest, res: Response): Promise<void> => {
  try {

    if (req.auth.claims?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { username, avatar } = req.body;

    if (req.auth.userId !== id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updatedUser = await userService.updateUser(id, { username, avatar });
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};