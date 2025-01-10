import express, { Router } from 'express';
import userController from './user-controller';
// import authController from './auth-controller';
// import { verifyToken } from '../../../middlewares/auth.middleware'; // Uncomment and add correct path for TypeScript support if needed

const router: Router = express.Router();

// Define routes
router.route('/userList').get(userController.getUserList);
router.route('/:id').get(userController.getUserById);
router.route('/:id').patch(userController.updateUserById);
router.route('/:id').delete(userController.deleteUser);

export default router;
