import express, { Router } from 'express';
import authController from './auth-controller';
// import { verifyToken } from '../../../middlewares/auth.middleware'; // Uncomment and add correct path for TypeScript support if needed

const router: Router = express.Router();

// Define routes
router.route('/signUp/sendOTP').post(authController.verifyPhoneAndSendOTP);

// router
//   .route('/signUp/verifyOTP')
//   .post(authController.verifyOTPAndRegisterPhone);

export default router;
