import express, { Router } from 'express';

import applicatorUser from './applicator-users-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import applicatorUserValidation from './applicator-users-validation';
const router: Router = express.Router();
router
	.route('/search/by-email/:email')
	.get(
		verifyToken,
		validateSchema(applicatorUserValidation.searchApplicatorUserByEmail),
		applicatorUser.searchApplicatorUserByEmail,
	);
router
	.route('/create')
	.post(
		verifyToken,
		validateSchema(applicatorUserValidation.userCreateSchema),
		applicatorUser.createApplicatorUser,
	);
	router
	.route('/send/invite')
	.post(
		verifyToken,
		validateSchema(applicatorUserValidation.sendInviteSchema),
		applicatorUser.sendInviteToUser,
	);
router.route('/get/all').get(verifyToken, applicatorUser.getAllApplicatorUser);









export default router;
