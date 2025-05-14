import express, { Router } from 'express';

import permissionController from './permissions-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
// import validateSchema from '../../../../../shared/middlewares/validation-middleware';
// import permissionValidation from './permissions-validation';
// import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();

router.route('/all').get(verifyToken, permissionController.getAllPermissions);

export default router;
