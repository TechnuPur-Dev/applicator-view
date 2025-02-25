import express, { Router } from 'express';

import applicatorWorker from './applicator-workers-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import workerValidation from './applicator-workers-validation';
const router: Router = express.Router();

router
	.route('/create')
	.post(
		verifyToken,
		validateSchema(workerValidation.workerCreateSchema),
		applicatorWorker.createWorker,
	);
router.route('/get/all').get(verifyToken, applicatorWorker.getAllWorkers);
router
	.route('/get/by-Id/:id')
	.get(
		verifyToken,
		validateSchema(workerValidation.paramsSchema),
		applicatorWorker.getWorkerById,
	);
router
	.route('/send/invite-status/:id')
	.put(
		verifyToken,
		validateSchema(workerValidation.paramsSchema),
		applicatorWorker.sendInviteStatus,
	);
	router
	.route('/update/invite-status')
	.put(
		verifyToken,
		validateSchema(workerValidation.updateInviteStatusSchema),
		applicatorWorker.updateInviteStatus,
	);
router
	.route('/update/:id')
	.put(
		verifyToken,
		validateSchema(workerValidation.updateSchema),
		applicatorWorker.updateWorker,
	);
router
	.route('/delete/:id')
	.delete(
		verifyToken,
		validateSchema(workerValidation.paramsSchema),
		applicatorWorker.deleteWorker,
	);

router
	.route('/search/by-email/:email')
	.get(
		verifyToken,
		validateSchema(workerValidation.searchWorkerByEmail),
		applicatorWorker.searchWorkerByEmail,
	);
export default router;
