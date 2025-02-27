import express, { Router } from 'express';
import fieldController from './field-controller';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import fieldValidation from './field-validation';

const router: Router = express.Router();

// Define routes
router
	.route('/create')
	.post(
		verifyToken,
		validateSchema(fieldValidation.createFieldSchema),
		fieldController.createField,
	);
router.route('/all').get(verifyToken, fieldController.getAllFields);
router
	.route('/:id')
	.get(
		verifyToken,
		validateSchema(fieldValidation.paramsSchema),
		fieldController.getFieldById,
	);
router
	.route('/:id')
	.put(
		verifyToken,
		validateSchema(fieldValidation.editFieldSchema),
		fieldController.updateFieldById,
	);
router
	.route('/:id')
	.delete(
		verifyToken,
		validateSchema(fieldValidation.paramsSchema),
		fieldController.deleteField,
	);

export default router;
