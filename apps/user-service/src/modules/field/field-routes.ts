import express, { Router } from 'express';
import fieldController from './field-controller';
// import authController from './auth-controller';
// import { verifyToken } from '../../../middlewares/auth.middleware'; // Uncomment and add correct path for TypeScript support if needed

const router: Router = express.Router();

// Define routes
router.route('/all-fields').get(fieldController.getFieldList);
router.route('/:id').get(fieldController.getFieldById);
router.route('/:id').patch(fieldController.updateFieldById);
router.route('/:id').delete(fieldController.deleteField);
router.route('/create-field').post(fieldController.createField);

export default router;
