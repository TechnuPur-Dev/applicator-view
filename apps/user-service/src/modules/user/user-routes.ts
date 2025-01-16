import express, { Router } from 'express';
import userController from './user-controller';
// import authController from './auth-controller';
// import { verifyToken } from '../../../middlewares/auth.middleware'; // Uncomment and add correct path for TypeScript support if needed

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



export default router;
