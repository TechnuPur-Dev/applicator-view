import express, { Router } from 'express';

import accountController from './accounts-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import adminValidation from './accounts-validation';
// import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();


router.route('/all-users').get(verifyToken, accountController.getAllUsers);
router.route('/all-applicators').get(verifyToken, accountController.getApplicatorUsers);
router.route('/all-growers').get(verifyToken, accountController.getGrowerUsers);
router.route('/all-pilots').get(verifyToken, accountController.getPilotUsers);
router.route('/get-userById/:userId').get(verifyToken,validateSchema(adminValidation.paramsSchema), accountController.getUserById);
router.route('/delete-account/:userId').delete(verifyToken,validateSchema(adminValidation.paramsSchema), accountController.deleteUser);



export default router;
