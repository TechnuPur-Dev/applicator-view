import express, { Router } from 'express';
import notificationController from './notification-controller';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
// import validateSchema from '../../../../../shared/middlewares/validation-middleware';
const router: Router = express.Router();

router
	.route('/get-all')
	.get(verifyToken, notificationController.getAllNotificationsByUserId); //get notification bu current user Id
	router
	.route('/new-count')
	.get(verifyToken, notificationController.newNotificationsCount);
	router
	.route('/mark-read')
	.put(verifyToken, notificationController.updateNotification);
export default router;
