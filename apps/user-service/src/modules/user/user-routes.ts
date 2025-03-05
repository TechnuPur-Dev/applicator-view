import express, { Router } from 'express';

import userController from './user-controller';
import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import userValidation from './user-validation';
const router: Router = express.Router();

router
	.route('/upload/profile-image')
	.post(verifyToken, upload, userController.uploadProfileImage);
router.route('/profile/update').put(verifyToken, userController.updateProfile);
router.route('/all-users').get(verifyToken, userController.getAllUsers);

router
	.route('/:id')
	.get(
		verifyToken,
		validateSchema(userValidation.paramsSchema),
		userController.getUserById,
	);
router
	.route('/:id')
	.delete(
		verifyToken,
		validateSchema(userValidation.paramsSchema),
		userController.deleteUser,
	);

router
	.route('/grower/email/:email')
	.get(
		verifyToken,
		validateSchema(userValidation.verifyEmailAndSendOTPSchema),
		userController.getGrowerByEmail,
	);
router
	.route('/applicator/email/:email')
	.get(
		verifyToken,
		validateSchema(userValidation.searchApplicatorByEmail),
		userController.getApplicatorByEmail,
	);

router
	.route('/grower/create')
	.post(
		verifyToken,
		validateSchema(userValidation.createGrowerSchema),
		userController.createGrower,
	);
router
	.route('/applicators/by-grower')
	.get(verifyToken, userController.getAllApplicatorsByGrower);
router
	.route('/growers/by-applicator')
	.get(verifyToken, userController.getAllGrowersByApplicator);
router
	.route('/delete-grower/by-applicator/:growerId')
	.delete(
		verifyToken,
		validateSchema(userValidation.paramsSchema),
		userController.deleteGrower,
	);
router
	.route('/delete-applicator/by-grower/:applicatorId')
	.delete(
		verifyToken,
		validateSchema(userValidation.paramsSchema),
		userController.deleteApplicator,
	);
router
	.route('/update/invite-status')
	.put(
		verifyToken,
		validateSchema(userValidation.updateInviteStatusSchema),
		userController.updateInviteStatus,
	);
router
	.route('/invites/pending')
	.get(verifyToken, userController.getPendingInvites);
router
	.route('/applicator/invite/:email')
	.put(verifyToken, userController.sendInviteToApplicator);
router
	.route('/grower/invite/:growerId')
	.put(
		verifyToken,
		validateSchema(userValidation.sendInviteSchema),
		userController.sendInviteToGrower,
	);

router
	.route('/update/archived-status')
	.put(
		verifyToken,
		validateSchema(userValidation.updateArchiveStatus),
		userController.updateArchivedStatus,
	);
router
	.route('/grower/by-applicator/:growerId')
	.get(
		verifyToken,
		validateSchema(userValidation.paramsSchema),
		userController.getGrowerById,
	);
router
	.route('/invites/pending-from/:type')
	.get(
		verifyToken,
		validateSchema(userValidation.paramsSchemaForType),
		userController.getPendingInvitesFromUser,
	);
router
	.route('/verify/invite-token')
	.post(
		validateSchema(userValidation.verifyInviteToken),
		userController.verifyInviteToken,
	);
	router
	.route('/dashboard/weather')
	.get(
		verifyToken,
		userController.getWeather,
	);
export default router;
