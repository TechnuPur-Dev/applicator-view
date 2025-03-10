import express, { Router } from 'express';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import authValidation from './auth-validation';
import authController from './auth-controller';

const router: Router = express.Router();

// Define routes
router
	.route('/verify-email')
	.post(
		validateSchema(authValidation.verifyEmailAndSendOTPSchema),
		authController.verifyEmailAndSendOTP,
	);
router
	.route('/verify-otp')
	.post(
		validateSchema(authValidation.verifyOTPAndRegisterEmailSchema),
		authController.verifyOTPAndRegisterEmail,
	);
router
	.route('/register')
	.post(
		validateSchema(authValidation.registerUserSchema),
		authController.registerUser,
	);
router
	.route('/login')
	.post(validateSchema(authValidation.loginSchema), authController.loginUser);
	router
	.route('/resend-otp')
	.post(
		validateSchema(authValidation.verifyEmailAndSendOTPSchema),
		authController.resendOTP,
	);

router
	.route('/accept-invite/sign-up')
	.put(
		validateSchema(authValidation.acceptInviteAndSignUp),
		authController.acceptInviteAndSignUp,
	);

export default router;
