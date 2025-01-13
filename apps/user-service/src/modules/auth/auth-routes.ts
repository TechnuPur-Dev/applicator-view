import express, { Router } from 'express';
import authController from './auth-controller';
// import { verifyToken } from '../../../middlewares/auth.middleware'; // Uncomment and add correct path for TypeScript support if needed

const router: Router = express.Router();

// Define routes
router.route('/register').post(authController.registerUser);
router.route('/verify-email').post(authController.verifyEmail);
router.route('/login').post(authController.loginUser);

export default router;
