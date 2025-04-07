import express, { Router } from 'express';

import permission from './permission-controller';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import permissionValidation from './permission-validation';
const router: Router = express.Router();

router
	.route('/create')
	.post(
		verifyToken,
		validateSchema(permissionValidation.createSchema),
		permission.createPermission,
	);
router.route('/get/all').get(verifyToken, permission.getAllPermissions);
router
	.route('/get/by-id/:id')
	.get(
		verifyToken,
		validateSchema(permissionValidation.paramsSchema),
		permission.getPermissionById,
	);
router
	.route('/update/:id')
	.put(
		verifyToken,
		validateSchema(permissionValidation.updateSchema),
		permission.updatePermission,
	);
router
	.route('/delete/:id')
	.delete(
		verifyToken,
		validateSchema(permissionValidation.paramsSchema),
		permission.deletePermission,
	);
	export default router;
