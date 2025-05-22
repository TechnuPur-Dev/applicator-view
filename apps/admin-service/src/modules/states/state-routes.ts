import express, { Router } from 'express';

import stateController from './state-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import stateValidation from './state-validation';
import multer from 'multer';
// import permissionValidation from './permissions-validation';
// import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(), // This keeps file in memory
});
router.route('/all').get(verifyToken, stateController.getAllStates);
//  create
router.route('/create').post(verifyToken,validateSchema(stateValidation.stateSchema), stateController.createStates);
router
    .route('/update/:stateId')
    .put(
        verifyToken,
        validateSchema(stateValidation.stateUpdateSchema),
        stateController.updateState,
    );
router
    .route('/delete/:stateId')
    .delete(
        verifyToken,
        validateSchema(stateValidation.paramsSchema),
        stateController.deleteState,
    );
router.route('/get/:stateId').get(verifyToken, stateController.getStateById);
// bulk upload
router.route('/uploadFile').post(verifyToken, upload.single('file'),
 stateController.bulkUploadstate);
 
export default router;
