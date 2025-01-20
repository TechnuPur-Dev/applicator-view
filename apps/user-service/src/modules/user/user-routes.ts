import express, { Router } from 'express';

import userController from './user-controller';
import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import userValidation from './user-validation';
const router: Router = express.Router();

router
	.route('/upload/profile-image')
	.post(upload, userController.uploadProfileImage);
router.route('/profile/update').put(verifyToken, userController.updateProfile);
router.route('/:id').get(verifyToken, userController.getUserById);
router.route('/:id').delete(verifyToken, userController.deleteUser);
router.route('/all-users').get(verifyToken, userController.getAllUsers);
router
	.route('/grower/email/:email')
	.get(verifyToken, userController.getGrowerByEmail);
router.route('/grower/create').post(verifyToken, validateSchema(userValidation.createGrowerSchema), userController.createGrower);
router
	.route('/growers/by-applicator')
	.get(verifyToken, userController.getAllGrowersByApplicator);
router
	.route('/grower/by-applicator/:growerId')
	.delete(verifyToken, userController.deleteGrower);
router
	.route('/update/invite-status')
	.put(verifyToken, userController.updateInviteStatus);
router
	.route('/invites/pending')
	.get(verifyToken, userController.getPendingInvites);

export default router;
