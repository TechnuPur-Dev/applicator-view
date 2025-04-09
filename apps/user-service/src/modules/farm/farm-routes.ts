import express, { Router } from 'express';
import farmController from './farm-controller';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import farmValidation from './farm-validation';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
import upload from '../../../../../shared/middlewares/multer-middleware';
import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();
router.use(verifyToken);
// Define routes
router
	.route('/create/:growerId')
	.post(
		normalizeApplicatorUser,
		validateSchema(farmValidation.farmSchema),
		farmController.createFarm,
	);
router
	.route('/all/by-grower')
	.get(farmController.getAllFarmsByGrower);
router
	.route('/get-farm/:farmId')
	.get(
		normalizeApplicatorUser,
		validateSchema(farmValidation.paramsSchema),
		farmController.getFarmById,
	);
router
	.route('/delete/:farmId')
	.delete(
		normalizeApplicatorUser,
		validateSchema(farmValidation.paramsSchema),
		farmController.deleteFarm,
	);
router
	.route('/update/:farmId')
	.put(
		normalizeApplicatorUser,
		validateSchema(farmValidation.farmUpdateSchema),
		farmController.updateFarm,
	);
router
	.route('/permission/assign')
	.post(farmController.assignFarmPermissions);
router
	.route('/permission/update')
	.put(farmController.updateFarmPermissions);
router
	.route('/permission/delete/:permissionId')
	.delete(farmController.deleteFarmPermission);
router
	.route('/permission/request')
	.post(farmController.askFarmPermission);

router
	.route('/upload/image')
	.post(

		validateSchema(farmValidation.uploadFarmImage),
		upload,
		farmController.uploadFarmImage,
	);

router.route('/get-all/by-grower').get(farmController.getAllFarms);
router
	.route('/permission/accept-reject')
	.post(farmController.handleFarmPermissions);
router
	.route('/available-applicators/:farmId')
	.get(farmController.getAvailableApplicators);
router
	.route('/growers/:growerId/farms-with-permissions')
	.get(farmController.getFarmsWithPermissions);
router
	.route('/by-applicator/:growerId')
	.get(farmController.getGrowerFarmsByAppllicator);

export default router;
