import express from 'express';
import * as userController from '../controllers/user.controller';
import { requireAuth, ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

const router = express.Router();

router.use(ClerkExpressRequireAuth());

router.get('/', requireAuth(userController.getAllUsers));
router.get('/:id', requireAuth(userController.getUserById));
router.put('/:id', requireAuth(userController.updateUser));

export default router;
