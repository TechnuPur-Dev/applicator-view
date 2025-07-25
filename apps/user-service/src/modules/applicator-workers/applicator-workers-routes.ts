import express, { Router } from 'express';

import applicatorWorker from './applicator-workers-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import workerValidation from './applicator-workers-validation';
import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();
router.use(verifyToken);
router.use(normalizeApplicatorUser);
router
	.route('/create')
	.post(
		// verifyToken,
		validateSchema(workerValidation.workerCreateSchema),
		applicatorWorker.createWorker,
	);
router.route('/get/all').get(
	// verifyToken,
	applicatorWorker.getAllWorkers);
router
	.route('/get/by-Id/:id')
	.get(
		// verifyToken,
		validateSchema(workerValidation.paramsSchema),
		applicatorWorker.getWorkerById,
	);
router
	.route('/send/invite/:id')
	.put(
		// verifyToken,
		validateSchema(workerValidation.sendInviteSchema),
		applicatorWorker.sendInviteToWorker,
	);
router
	.route('/update/invite-status')
	.put(
		// verifyToken,
		validateSchema(workerValidation.updateInviteStatusSchema),
		applicatorWorker.updateInviteStatus,
	);
router
	.route('/update/:id')
	.put(
		// verifyToken,
		validateSchema(workerValidation.updateSchema),
		applicatorWorker.updateWorker,
	);
router
	.route('/delete/:id')
	.delete(
		// verifyToken,
		validateSchema(workerValidation.paramsSchema),
		applicatorWorker.deleteWorker,
	);

router
	.route('/search/by-email/:email')
	.get(
		// verifyToken,
		validateSchema(workerValidation.searchWorkerByEmail),
		applicatorWorker.searchWorkerByEmail,
	);
router
	.route('/get/all-applicators')
	.get(
		// verifyToken, 
		applicatorWorker.getAllApplicators);
router
	.route('/pending-invites')
	.get(
		// verifyToken, 
		applicatorWorker.getPendingInvites);
		router
	.route('/get/all-applicators/by-pilot')
	.get(
		// verifyToken, 
		applicatorWorker.getAllApplicatorsByPilot);
	router
	.route('/update/autojob-status/:applicatorId')
	.put(
		// verifyToken,
		validateSchema(workerValidation.autoAcceptJobSchema),
		applicatorWorker.updateAutoJobStatus,
	);
export default router;
