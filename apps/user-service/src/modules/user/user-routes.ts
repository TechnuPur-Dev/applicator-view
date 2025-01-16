import express, { Router } from 'express';

import userController from './user-controller';
import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed

const router: Router = express.Router();
// Define routes

router.route('/all-users').get(userController.getUserList);
router.route('/all-growers').get(userController.getAllGrowers);
router.route('/:email').get(userController.getUserByEmail);
router.route('/:id').get(userController.getUserById);
router.route('/:id').patch(userController.updateUserById);
router.route('/:id').delete(userController.deleteUser);
router.route('/create-grower').post(userController.createGrower);
router.route('/update-invite-status').put(userController.updateInviteStatus);
router.route('/all-growers/:status').get(userController.getUserByStatus);
router
	.route('/upload/profile-image')
	.post(upload, userController.uploadProfileImage);
router.route('/all-users').get(verifyToken, userController.getUserList);
router.route('/all-growers').get(verifyToken, userController.getAllGrowers);
router.route('/create-grower').post(verifyToken, userController.createGrower);

// dynamic routes
router.route('/:email').get(verifyToken, userController.getUserByEmail);
router.route('/:id').get(verifyToken, userController.getUserById);
router.route('/:id').patch(verifyToken, userController.updateUserById);
router.route('/:id').delete(verifyToken, userController.deleteUser);
router
	.route('/delete-grower/:id/:userId')
	.delete(verifyToken, userController.deleteGrower);



export default router;
