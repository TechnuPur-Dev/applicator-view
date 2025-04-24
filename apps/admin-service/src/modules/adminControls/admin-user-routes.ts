import express, { Router } from 'express';

import adminUserController from './admin-user-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import adminUserValidation from './admin-user-validation';
// import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();

router.route('/create').post(verifyToken, adminUserController.createUser);
router.route('/all').get(verifyToken, adminUserController.getAllUsers);
router.route('/get-userById/:userId').get(verifyToken,validateSchema(adminUserValidation.paramsSchema), adminUserController.getUserById);
router.route('/delete/:userId').get(verifyToken,validateSchema(adminUserValidation.paramsSchema), adminUserController.deleteUser);



export default router;
