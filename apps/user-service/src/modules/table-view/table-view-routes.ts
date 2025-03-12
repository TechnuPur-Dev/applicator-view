import express, { Router } from 'express';
import viiewController from './table-view-controller';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import viewValidation from './table-view-validation';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';

const router: Router = express.Router();

// Define routes
router
	.route('/create-view')
	.post(
		verifyToken,
		validateSchema(viewValidation.viewSchema),
		viiewController.createView,
	);
router
	.route('/all-views/:tableName')
	.get(verifyToken, viiewController.getAllViews);
router
	.route('/get-view/:viewId')
	.get(
		verifyToken,
		validateSchema(viewValidation.paramsSchema),
		viiewController.getViewById,
	);
router
	.route('/delete-view/:viewId')
	.delete(
		verifyToken,
		validateSchema(viewValidation.paramsSchema),
		viiewController.deleteView,
	);
router
	.route('/update-view/:viewId')
	.put(
		verifyToken,
		validateSchema(viewValidation.viewSchema),
		viiewController.updateView,
	);

export default router;
