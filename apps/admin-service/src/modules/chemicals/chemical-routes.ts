import express, { Router } from 'express';

import chemicalController from './chemical-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import ChemicalValidation from './chemical-validation';
import multer from 'multer';
// import permissionValidation from './permissions-validation';
const router: Router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Temp folder for Excel files
router.route('/all').get(verifyToken, chemicalController.getAllChemicals);
router.route('/uploadFile').post(verifyToken, upload.single('file'), chemicalController.bulkUploadChemicals);
router
    .route('/update/:id')
    .put(
        verifyToken,
        validateSchema(ChemicalValidation.ChemicalUpdateSchema),
        chemicalController.updateChemical,
    );
router
    .route('/delete/:id')
    .delete(
        verifyToken,
        validateSchema(ChemicalValidation.paramsSchema),
        chemicalController.deleteChemical,
    );

export default router;
