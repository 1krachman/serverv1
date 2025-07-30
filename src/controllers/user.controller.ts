import type { Request, Response } from 'express';
import type { RequireAuthProp } from '@clerk/clerk-sdk-node';
import * as userService from '../services/user.service';

// Extend Request agar memiliki req.auth dari Clerk
type AuthedRequest = RequireAuthProp<Request>;

export const getUserById = async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate required parameters
    if (!id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Validate auth object exists
    if (!req.auth || !req.auth.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Authorization check
    if (req.auth.userId !== id && req.auth.claims?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: You can only access your own profile or need admin role' });
      return;
    }

    console.log(`Fetching user with ID: ${id} by user: ${req.auth.userId}`);
    
    const user = await userService.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error in getUserById controller:', error);
    
    // More specific error handling
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
};

export const getAllUsers = async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    // Validate auth object exists
    if (!req.auth || !req.auth.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.auth.claims?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    console.log(`Admin ${req.auth.userId} fetching all users`);
    
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error in getAllUsers controller:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
};

export const updateUser = async (req: AuthedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { username, avatar } = req.body;

    // Validate required parameters
    if (!id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Validate auth object exists
    if (!req.auth || !req.auth.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Authorization check - users can only update their own profile
    if (req.auth.userId !== id) {
      res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
      return;
    }

    // Validate request body
    if (!username && !avatar) {
      res.status(400).json({ error: 'At least one field (username or avatar) is required for update' });
      return;
    }

    console.log(`User ${req.auth.userId} updating profile with:`, { username, avatar });
    
    const updatedUser = await userService.updateUser(id, { username, avatar });
    res.json(updatedUser);
  } catch (error) {
    console.error('Error in updateUser controller:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
};