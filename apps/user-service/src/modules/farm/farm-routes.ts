import express, { Router } from 'express';
import farmController from './farm-controller';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import farmValidation from './farm-validation';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
// import { verifyToken } from '../../../middlewares/auth.middleware'; // Uncomment and add correct path for TypeScript support if needed

const router: Router = express.Router();

// Define routes
router.route('/create-farm/:growerId').post(verifyToken ,validateSchema(farmValidation.farmSchema), farmController.createFarm);
router.route('/all-farms').get(verifyToken, farmController.getAllFarms)
router.route('/getById/:farmId').get(verifyToken ,farmController.getFarmById)
router.route('/delete/:farmId').delete(verifyToken, farmController.deleteFarm)
router.route('/update-farm/:farmId').put(verifyToken , farmController.updateFarm)

export default router;
