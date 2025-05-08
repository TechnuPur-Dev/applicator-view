import express, { Router } from 'express';

import adminUserController from './admin-user-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import adminUserValidation from './admin-user-validation';
// import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();

router.route('/create').post(verifyToken, adminUserController.createUser);
router.route('/all-users').get(verifyToken, adminUserController.getAllUsers);
router.route('/userById/:userId').get(verifyToken,validateSchema(adminUserValidation.paramsSchema), adminUserController.getUserById);
router.route('/delete/:userId').delete(verifyToken,validateSchema(adminUserValidation.paramsSchema), adminUserController.deleteUser);
router.route('/disable').put(verifyToken,validateSchema(adminUserValidation.UpdateStatus), adminUserController.disableUser);


export default router;
