import express, { Router } from 'express';

import adminController from './admin-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import adminValidation from './admin-validation';
// import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();


router.route('/all-users').get(verifyToken, adminController.getAllUsers);
router.route('/all-applicators').get(verifyToken, adminController.getApplicatorUsers);
router.route('/all-growers').get(verifyToken, adminController.getGrowerUsers);
router.route('/all-pilots').get(verifyToken, adminController.getPilotUsers);
router.route('/get-userById/:userId').get(verifyToken,validateSchema(adminValidation.paramsSchema), adminController.getUserById);
router.route('/delete-account/:userId').get(verifyToken,validateSchema(adminValidation.paramsSchema), adminController.deleteUser);



export default router;
