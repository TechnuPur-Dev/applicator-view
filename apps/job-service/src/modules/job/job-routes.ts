import express, { Router } from 'express';

import jobController from './job-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import jobValidation from './job-validation';
import uploadMiddleware from '../../../../../shared/middlewares/multer-middleware';
const router: Router = express.Router();

// Get all jobs for applicator by applicatorId (My Jobs Screen)
router.route('/my-jobs').get(verifyToken, jobController.getAllJobsByApplicator);
// Create job
router
	.route('/create-job')
	.post(
		verifyToken,
		validateSchema(jobValidation.createJobSchema),
		jobController.createJob,
	);

// get Job by Id
router
	.route('/get-job/:jobId')
	.get(
		verifyToken,
		validateSchema(jobValidation.paramsSchema),
		jobController.getJobById,
	);
// Update Job by applicator (to update job status and assign a pilot)
router
	.route('/update/:jobId')
	.put(
		verifyToken,
		validateSchema(jobValidation.updateJobSchema),
		jobController.updateJobByApplicator,
	);
router
	.route('/delete/:jobId')
	.delete(
		verifyToken,
		validateSchema(jobValidation.paramsSchema),
		jobController.deleteJob,
	);
//Required  Drop down for job creation
router
.route('/all-pilots')
.get(
	verifyToken,
	jobController.getAllPilotsByApplicator,
);

//job type
router.route('/all-types').get(verifyToken, jobController.getAllJobTypes);

// job status
router.route('/all-statuses').get(verifyToken, jobController.getAllJobStatus);
router
	.route('/growers-list/by-applicator')
	.get(verifyToken, jobController.getGrowerListForApplicator);
router
	.route('/applicators-list/by-grower')
	.get(verifyToken, jobController.getApplicatorListForGrower);
router
	.route('/farms-list/:growerId')
	.get(verifyToken, jobController.getFarmListByGrowerId);

	//upload job attachments
router
.route('/upload/job-attachments')
.post(verifyToken, uploadMiddleware, jobController.uploadJobAttachments);
export default router;
