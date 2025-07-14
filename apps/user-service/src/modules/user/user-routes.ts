import express, { Router } from 'express';
import userController from './user-controller';
import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import userValidation from './user-validation';
import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
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
		normalizeApplicatorUser,
		validateSchema(userValidation.createGrowerSchema),
		userController.createGrower,
	);
router
	.route('/applicators/by-grower')
	.get(verifyToken, userController.getAllApplicatorsByGrower);
router
	.route('/growers/by-applicator')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		userController.getAllGrowersByApplicator,
	);
router
	.route('/delete-grower/by-applicator/:growerId')
	.delete(
		verifyToken,
		normalizeApplicatorUser,
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
		normalizeApplicatorUser,
		validateSchema(userValidation.updateInviteStatusSchema),
		userController.updateInviteStatus,
	);
router
	.route('/pending-invites/from-me')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		userController.getPendingInvites,
	);
router
	.route('/applicator/invite/:email')
	.put(verifyToken, userController.sendInviteToApplicator);
router
	.route('/grower/invite/:growerId')
	.put(
		verifyToken,
		normalizeApplicatorUser,
		userController.sendInviteToGrower,
	);

router
	.route('/update/archived-status')
	.put(
		verifyToken,
		normalizeApplicatorUser,
		validateSchema(userValidation.updateArchiveStatus),
		userController.updateArchivedStatus,
	);
router
	.route('/grower/by-applicator/:growerId')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		validateSchema(userValidation.paramsSchema),
		userController.getGrowerById,
	);
router
	.route('/pending-invites/from-others')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		validateSchema(userValidation.paramsSchemaForType),
		userController.getPendingInvitesFromOthers,
	);
router
	.route('/verify/invite-token')
	.post(
		normalizeApplicatorUser,
		validateSchema(userValidation.verifyInviteToken),
		userController.verifyInviteToken,
	);
router.route('/dashboard/weather').get(verifyToken, userController.getWeather);
router
	.route('/respond/invite-email')
	.put(
		normalizeApplicatorUser,
		validateSchema(userValidation.respondInviteToken),
		userController.acceptOrRejectInviteThroughEmail,
	);
router
	.route('/applicator/by-id/:applicatorId')
	.get(
		verifyToken,
		validateSchema(userValidation.paramsSchema),
		userController.getApplicatorById,
	);
	router.route('/dashboard/user-by-state').get(verifyToken , userController.getUsersByState);
	
	router
	.route('/update/grower-name/:growerId')
	.put(
		verifyToken,
		normalizeApplicatorUser,
		userController.updateGrowerName,
	);
export default router;
