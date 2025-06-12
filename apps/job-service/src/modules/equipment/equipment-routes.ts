import express, { Router } from 'express';

import equimentController from './equipment-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import equimentValidation from './equipment-validation';
import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();
router.use(verifyToken);
router.use(normalizeApplicatorUser);

router
	.route('/create')
	.post(
		verifyToken,
		validateSchema(equimentValidation.createSchema),
		equimentController.createEquipment,
	);

router.route('/all').get(equimentController.getAllEquipmentList);
router
	.route('/getById/:id')
	.get(
		verifyToken,
		validateSchema(equimentValidation.paramsSchema),
		equimentController.getEquipmentById,
	);
router
	.route('/update/:id')
	.put(
		verifyToken,
		validateSchema(equimentValidation.updateSchema),
		equimentController.updateEquipment,
	);
router
	.route('/delete/:id')
	.delete(
		verifyToken,
		validateSchema(equimentValidation.paramsSchema),
		equimentController.deleteEquipment,
	);
export default router;
