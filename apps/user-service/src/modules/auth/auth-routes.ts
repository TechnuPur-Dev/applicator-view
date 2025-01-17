import express, { Router } from 'express';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import authValidation from './auth-validation';
import authController from './auth-controller';

const router: Router = express.Router();

// Define routes
router
	.route('/register')
	.post(
		validateSchema(authValidation.registerUserSchema),
		authController.registerUser,
	);
router
	.route('/verify-email')
	.post(
		validateSchema(authValidation.verifyEmailSchema),
		authController.verifyEmail,
	);
router
	.route('/login')
	.post(validateSchema(authValidation.loginSchema), authController.loginUser);

export default router;
