import express, { Router } from 'express';

import stateController from './state-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import stateValidation from './state-validation';
// import permissionValidation from './permissions-validation';
// import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();

router.route('/all').get(verifyToken, stateController.getAllStates);
router.route('/create').post(verifyToken, stateController.createStates);
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

export default router;
