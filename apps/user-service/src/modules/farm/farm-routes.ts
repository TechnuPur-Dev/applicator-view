import express, { Router } from 'express';
import farmController from './farm-controller';
// import { verifyToken } from '../../../middlewares/auth.middleware'; // Uncomment and add correct path for TypeScript support if needed

const router: Router = express.Router();

// Define routes
router.route('/create-farm/:growerId/:createdById').post(farmController.createForm);
router.route('/all-farms').get(farmController.getAllFarms)
router.route('/getById/:id').get(farmController.getFarmById)
router.route('/delete/:id/:deletedById').delete(farmController.deleteFarm)
router.route('/update-farm/:farmId/:updatedById').put(farmController.updateFarm)

export default router;
