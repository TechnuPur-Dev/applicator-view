import express, { Router } from 'express';
import fieldController from './field-controller';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';

const router: Router = express.Router();

// Define routes
router.route('/create').post(verifyToken, fieldController.createField);
router.route('/all').get(verifyToken, fieldController.getAllFields);
router.route('/:id').get(verifyToken, fieldController.getFieldById);
router.route('/:id').put(verifyToken, fieldController.updateFieldById);
router.route('/:id').delete(verifyToken, fieldController.deleteField);

export default router;
