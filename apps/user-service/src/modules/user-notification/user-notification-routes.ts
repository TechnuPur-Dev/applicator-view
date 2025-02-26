import express, { Router } from 'express';
import notificationController from './user-notification-controller'
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
// import validateSchema from '../../../../../shared/middlewares/validation-middleware';
const router: Router = express.Router();

router
	.route('/get-all')
	.get(verifyToken, notificationController.getAllNotificationByUserId);//get notification bu current user Id

export default router