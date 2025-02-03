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
router.route('/get-farm/:farmId').get(verifyToken,validateSchema(farmValidation.paramsSchema), farmController.getFarmById);
router.route('/delete/:farmId').delete(verifyToken,validateSchema(farmValidation.paramsSchema), farmController.deleteFarm);
router.route('/update/:farmId').put(verifyToken,validateSchema(farmValidation.farmUpdateSchema), farmController.updateFarm);
router
	.route('/permission/assign')
	.post(verifyToken, farmController.assignFarmPermission);
router
	.route('/permission/update/:permissionId')
	.put(verifyToken, farmController.updateFarmPermission);
router
	.route('/permission/delete/:permissionId')
	.delete(verifyToken, farmController.deleteFarmPermission);
	router
	.route('/permission/request')
	.post(verifyToken, farmController.askFarmPermission);
export default router;
