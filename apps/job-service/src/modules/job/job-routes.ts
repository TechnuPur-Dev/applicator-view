import express, { Router } from 'express';

import jobController from './job-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import {
	verifyToken,
	authorize,
} from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import jobValidation from './job-validation';
import uploadMiddleware from '../../../../../shared/middlewares/multer-middleware';
import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();

// Get all jobs for applicator by applicatorId (My Jobs Screen)
router
	.route('/my-jobs')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		authorize('APPLICATOR'),
		jobController.getAllJobsByApplicator,
	);
// Create job
router
	.route('/create-job')
	.post(
		verifyToken,
		normalizeApplicatorUser,
		validateSchema(jobValidation.createJobSchema),
		jobController.createJob,
	);

// get Job by Id
router
	.route('/get-job/:jobId')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		validateSchema(jobValidation.paramsSchema),
		jobController.getJobById,
	);
// Update Job by applicator (to update job status and assign a pilot)
router
	.route('/update/:jobId')
	.put(
		verifyToken,
		normalizeApplicatorUser,
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
	.route('/all-pilots/dropdown')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		jobController.getAllPilotsByApplicator,
	);

//job type
router.route('/all-types').get(verifyToken, jobController.getAllJobTypes);

// job status
router
	.route('/all-statuses/dropdown')
	.get(verifyToken, jobController.getAllJobStatus);
router
	.route('/growers-list/by-applicator')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		jobController.getGrowerListForApplicator,
	);
router
	.route('/applicators-list/by-grower')
	.get(verifyToken, jobController.getApplicatorListForGrower);
router
	.route('/farms-list/:growerId')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		jobController.getFarmListByGrowerId,
	);
router
	.route('/farms-list/by-grower/:applicatorId')
	.get(verifyToken, jobController.getFarmListByApplicatorId);
//upload job attachments
router
	.route('/upload/job-attachments')
	.post(verifyToken, uploadMiddleware, jobController.uploadJobAttachments);
router
	.route('/get-jobs/:type')
	.get(
		verifyToken,
		validateSchema(jobValidation.jobSourceParamSchema),
		jobController.getJobs,
	);
router.route('/open-jobs').get(verifyToken, jobController.getOpenJobs);
router
	.route('/my-bids')
	.get(verifyToken, normalizeApplicatorUser, jobController.getMyBidJobs);
router
	.route('/pending/from-me')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		jobController.getJobsPendingFromMe,
	);
router
	.route('/pending/from-grower')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		jobController.getJobsPendingFromGrower,
	);
// router
// 	.route('/pending/from-applicator')
// 	.get(verifyToken, jobController.getJobsPendingFromApplicators);
router
	.route('/update/job-status/:jobId')
	.put(
		verifyToken,
		normalizeApplicatorUser,
		validateSchema(jobValidation.jobStatusParamSchema),
		jobController.updatePendingJobStatus,
	);

router
	.route('/get-assignedjobs')
	.get(verifyToken, normalizeApplicatorUser, jobController.getAssignedJobs);
router.route('/get-jobsbypilot/:pilotId').get(
	verifyToken,
	normalizeApplicatorUser, // this end point for applicator to get pilote
	validateSchema(jobValidation.pilotJobsParamSchema),
	jobController.getJobByPilot,
);
router
	.route('/create/open-for-bidding')
	.post(
		verifyToken,
		validateSchema(jobValidation.createJobSchema),
		jobController.addOpenForBiddingJob,
	);
router
	.route('/upcomping-applications')
	.get(
		verifyToken,
		validateSchema(jobValidation.monthParamsSchema),
		jobController.upcomingApplications,
	);

router
	.route('/headers-stats')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		validateSchema(jobValidation.headerStatsSchema),
		jobController.getHeadersData,
	);
router
	.route('/get-rejectedjobs')
	.get(verifyToken, normalizeApplicatorUser, jobController.getRejectedJobs);
router
	.route('/get/open-job/:jobId')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		validateSchema(jobValidation.paramsSchema),
		jobController.getBiddingJobById,
	);
router
	.route('/get/job-invoice/:jobId')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		validateSchema(jobValidation.paramsSchema),
		jobController.getJobInvoice,
	);
router // TODO: Update service accroding to the business logic
	.route('/get-all/job-invoices')
	.get(verifyToken, normalizeApplicatorUser, jobController.getAllJobInvoices);
router
	.route('/accept-reject/by-email')
	.put(
		validateSchema(jobValidation.acceptJobSchema),
		jobController.acceptJobThroughEmail,
	);
router
	.route('/pilot/get-myjobs')
	.get(verifyToken, jobController.getMyJobsByPilot);

router
	.route('/pilot/get/pending-jobs')
	.get(verifyToken, jobController.getPilotPendingJobs);
router
	.route('/pilot/get/rejected-jobs')
	.get(verifyToken, jobController.getPilotRejectedJobs);

router
	.route('/pilot/get-job/:jobId')
	.get(
		verifyToken,
		validateSchema(jobValidation.paramsSchema),
		jobController.getJobByIdForPilot,
	);
router
	.route('/get-jobActivity/:jobId')
	.get(
		verifyToken,
		validateSchema(jobValidation.paramsSchema),
		jobController.getJobActivitiesByJobId,
	);
router
	.route('/place-bid')
	.post(
		verifyToken,
		normalizeApplicatorUser,
		validateSchema(jobValidation.placeBidJobSchema),
		jobController.placeBidForJob,
	);
router
	.route('/all-bids/:jobId')
	.get(
		verifyToken,
		validateSchema(jobValidation.paramsSchema),
		jobController.getAllBidsByJobId,
	);
router
	.route('/update/bid-status/:bidId')
	.put(
		verifyToken,
		validateSchema(jobValidation.updateBidStatusSchema),
		jobController.updateBidJobStatus,
	);
// get Job by Id
router
	.route('/get-job/by-email')
	.get(
		validateSchema(jobValidation.inviteTokenSchema),
		jobController.getJobBytokenThroughEmail,
	);
export default router;
