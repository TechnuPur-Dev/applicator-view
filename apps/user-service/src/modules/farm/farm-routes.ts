import express, { Router } from 'express';
import farmController from './farm-controller';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import farmValidation from './farm-validation';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';

const router: Router = express.Router();

// Define routes
router
	.route('/create/:growerId')
	.post(
		verifyToken,
		validateSchema(farmValidation.farmSchema),
		farmController.createFarm,
	);
router
	.route('/all/by-grower')
	.get(verifyToken, farmController.getAllFarmsByGrower);
router.route('/:farmId').get(verifyToken, farmController.getFarmById);
router.route('/delete/:farmId').delete(verifyToken, farmController.deleteFarm);
router.route('/update/:farmId').put(verifyToken, farmController.updateFarm);

export default router;
