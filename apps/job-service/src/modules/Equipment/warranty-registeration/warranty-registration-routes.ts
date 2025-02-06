import express, { Router } from 'express';

import warrantyRegisterationController from './warranty-registration-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../../shared/middlewares/auth-middleware';
import validateSchema from '../../../../../../shared/middlewares/validation-middleware';
import warrantyValidation from './warranty-registration-validation';
import uploadMiddleware from '../../../../../../shared/middlewares/multer-middleware';

const router: Router = express.Router();

router
	.route('/all-types')
	.get(verifyToken, warrantyRegisterationController.getAllEquipmentType);
router
	.route('/upload/image')
	.post(
		verifyToken,
		uploadMiddleware,
		warrantyRegisterationController.uploadImage,
	);
router
	.route('/upload/doc-attachment')
	.post(
		verifyToken,
		uploadMiddleware,
		warrantyRegisterationController.uploadDocAttachments,
	);
router
	.route('/create')
	.post(
		verifyToken,
		validateSchema(warrantyValidation.createSchema),
		warrantyRegisterationController.createWarrantyReg,
	);

	router
	.route('/all')
	.get(
		verifyToken,
		warrantyRegisterationController.getAllWarrantyRegList,
	);
	router
	.route('/get-byId/:id')
	.get(
		verifyToken,
		validateSchema(warrantyValidation.paramsSchema),
		warrantyRegisterationController.getWarrantyRegById,
	);
	router
	.route('/update/:id')
	.put(
		verifyToken,
		validateSchema(warrantyValidation.updateSchema),
		warrantyRegisterationController.updateWarrantyReg,
	);
	router
	.route('/delete/:id')
	.delete(
		verifyToken,
		validateSchema(warrantyValidation.paramsSchema),
		warrantyRegisterationController.deleteWarrantyReg,
	);
export default router;
