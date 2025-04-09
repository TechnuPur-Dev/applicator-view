import express, { Router } from 'express';
import fieldController from './field-controller';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import fieldValidation from './field-validation';
import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();
router.use(verifyToken);
// Define routes
router
	.route('/create')
	.post(
		// verifyToken,
		normalizeApplicatorUser,
		validateSchema(fieldValidation.createFieldSchema),
		fieldController.createField,
	);
router.route('/all').get(fieldController.getAllFields);
router
	.route('/:id')
	.get(
		// verifyToken,
		validateSchema(fieldValidation.paramsSchema),
		fieldController.getFieldById,
	);
router
	.route('/:id')
	.put(
		// verifyToken,
		normalizeApplicatorUser,
		validateSchema(fieldValidation.editFieldSchema),
		fieldController.updateFieldById,
	);
router
	.route('/:id')
	.delete(
		// verifyToken,
		normalizeApplicatorUser,
		validateSchema(fieldValidation.paramsSchema),
		fieldController.deleteField,
	);

export default router;
