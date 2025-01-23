import express, { Router } from 'express';

import jobController from './job-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import jobValidation from './job-validation';
const router: Router = express.Router();



router.route('/all-jobs').get(verifyToken, jobController.getAllJobs);
router.route('/create-job').post(verifyToken,jobController.createJob);
router.route('/get-job:jobId').get(verifyToken,validateSchema(jobValidation.paramsSchema), jobController.getJobById);
router.route('/update/:jobId').put(verifyToken,validateSchema(jobValidation.paramsSchema), jobController.updateJobById);
router.route('/delete/:jobId').delete(verifyToken,validateSchema(jobValidation.paramsSchema), jobController.deleteJob);
router
	.route('/job/by-applicator')
	.get(verifyToken, jobController.getJobsByApplicator);
router
	.route('/job/by-grower')
	.delete(verifyToken,validateSchema(jobValidation.paramsSchema), jobController.getJobsByGrower);


export default router;
