import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import jobService from './job-service';
import pick from '../../../../../shared/utils/pick';

// Controller to create job
const createJob = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const data = req.body;
	const result = await jobService.createJob(currentUser, data);
	res.status(httpStatus.CREATED).json(result);
});
const getAllJobsByApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const options = pick(req.query, [
			'limit',
			'page',
			'label',
			'searchValue',
		]);
		const applicatorId = +req.payload.id;
		const result = await jobService.getAllJobsByApplicator(
			applicatorId,
			options,
		);
		res.status(httpStatus.OK).json(result);
	},
);

const getAllJobsByApplicatorDashboard = catchAsync(
	async (req: Request, res: Response) => {
		const options = pick(req.query, ['limit', 'page']);
		const applicatorId = +req.payload.id;
		const filtersOption = req.body;
		const result = await jobService.getAllJobsByApplicatorDashboard(
			applicatorId,
			options,
			filtersOption,
		);
		res.status(httpStatus.OK).json(result);
	},
);

const getJobById = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = +req.params.jobId;
	const result = await jobService.getJobById(currentUser, id);
	res.status(httpStatus.OK).json(result);
});

// Controller to delete job by ID
const deleteJob = catchAsync(async (req: Request, res: Response) => {
	const jobId = +req.params.jobId;
	const result = await jobService.deleteJob(jobId);
	res.status(httpStatus.OK).json(result);
});

const updateJobByApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const currentUser = req.user;
		const id = +req.params.jobId;
		const data = req.body;
		const result = await jobService.updateJobByApplicator(
			currentUser,
			id,
			data,
		);
		res.status(httpStatus.OK).json(result);
	},
);

// get All pilots by applicator
const getAllPilotsByApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const id = req.payload.id; // applicator id get from token
		const jobData = await jobService.getAllPilotsByApplicator(id);
		res.status(httpStatus.OK).json({ result: jobData });
	},
);
const getAllJobTypes = catchAsync(async (req: Request, res: Response) => {
	const jobData = await jobService.getAllJobTypes();
	res.status(httpStatus.OK).json({ result: jobData });
});

const getAllJobStatus = catchAsync(async (req: Request, res: Response) => {
	const jobData = await jobService.getAllJobStatus();
	res.status(httpStatus.OK).json({ result: jobData });
});

const getJobStatusForFilter = catchAsync(async (req: Request, res: Response) => {
	const jobData = await jobService.getJobStatusForFilter();
	res.status(httpStatus.OK).json({ result: jobData });
});

const getGrowerListForApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const applicatorId = +req.payload.id;
		const result =
			await jobService.getGrowerListForApplicator(applicatorId);
		res.status(httpStatus.OK).json({ result: result });
	},
);

const getApplicatorListForGrower = catchAsync(
	async (req: Request, res: Response) => {
		const growerId = +req.payload.id;
		const result = await jobService.getApplicatorListForGrower(growerId);
		res.status(httpStatus.OK).json({ result: result });
	},
);
const getFarmListByGrowerId = catchAsync(
	async (req: Request, res: Response) => {
		const applicatorId = +req.payload.id;
		const growerId = +req.params.growerId;
		const result = await jobService.getFarmListByGrowerId(
			applicatorId,
			growerId,
		);
		res.status(httpStatus.OK).json({ result: result });
	},
);
const getFarmListByApplicatorId = catchAsync(
	async (req: Request, res: Response) => {
		const applicatorId = +req.params.applicatorId;
		const growerId = +req.payload.id;
		const result = await jobService.getFarmListByApplicatorId(
			applicatorId,
			growerId,
		);
		res.status(httpStatus.OK).json({ result: result });
	},
);
const uploadJobAttachments = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const files = req.files;
	console.log('Uploaded file:', files);

	if (!files || !Array.isArray(files)) {
		throw new Error('No files uploaded');
	}

	if (!files) {
		return res.status(400).json({ error: 'File is required.' });
	}
	const result = await jobService.uploadJobAttachments(userId, files);
	res.status(httpStatus.OK).json({
		message: 'attachments uploaded successfully',
		result,
	});
});
const getJobs = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const id = +req.payload.id;
	const type = req.params.type;
	const role = req.user.role;

	const result = await jobService.getJobs(id, type, role, options);
	res.status(httpStatus.OK).json(result);
});
const getOpenJobs = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const user = req.user;
	const result = await jobService.getOpenJobs(user, options);
	res.status(httpStatus.OK).json(result);
});
const getMyBidJobs = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const result = await jobService.getMyBidJobs(options, user);
	res.status(httpStatus.OK).json(result);
});
// for applicator approval screen
const getJobsPendingFromMe = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const currentUser = req.user;
	const result = await jobService.getJobsPendingFromMe(currentUser, options);
	res.status(httpStatus.OK).json(result);
});
const getJobsPendingFromGrower = catchAsync(
	async (req: Request, res: Response) => {
		const options = pick(req.query, [
			'limit',
			'page',
			'label',
			'searchValue',
		]);
		const currentUser = req.user;
		const result = await jobService.getJobsPendingFromGrowers(
			currentUser,
			options,
		);

		res.status(httpStatus.OK).json(result);
	},
);
// // for grower approval screen
// const getJobsPendingFromApplicators = catchAsync(
// 	async (req: Request, res: Response) => {
// 		const id = +req.payload.id;
// 		const result = await jobService.getJobsPendingFromApplicators(id);
// 		res.status(httpStatus.OK).json({ result });
// 	},
// );

const updatePendingJobStatus = catchAsync(
	async (req: Request, res: Response) => {
		const id = +req.params.jobId;
		const userData = req.user;
		const data = req.body;
		const result = await jobService.updatePendingJobStatus(
			data,
			id,
			userData,
		);
		res.status(httpStatus.OK).json(result);
	},
);

const getJobByPilot = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = +req.payload.id;
	const pilotId = +req.params.pilotId;
	const options = pick(req.query, ['limit', 'page']);
	const result = await jobService.getJobByPilot(
		applicatorId,
		pilotId,
		options,
	);
	res.status(httpStatus.OK).json(result);
});

const getAssignedJobs = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = +req.payload.id;
	const result = await jobService.getAssignedJobs(applicatorId);
	res.status(httpStatus.OK).json({ result });
});
const addOpenForBiddingJob = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const data = req.body;
	const result = await jobService.addOpenForBiddingJob(currentUser, data);
	res.status(httpStatus.CREATED).json(result);
});

const upcomingApplications = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const options = pick(req.query, ['month']);
	const result = await jobService.upcomingApplications(userId, options);
	res.status(httpStatus.OK).json({ result });
});

const getHeadersData = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const options = pick(req.query, ['type', 'startDate', 'endDate']) as {
		type: string;
		startDate: Date;
		endDate: Date;
	};
	const result = await jobService.getHeadersData(currentUser, options);
	res.status(httpStatus.OK).json(result);
});
const getHeadersDataForPilot = catchAsync(
	async (req: Request, res: Response) => {
		const currentUser = req.user;
		const options = pick(req.query, ['type', 'startDate', 'endDate']) as {
			type: string;
			startDate: Date;
			endDate: Date;
		};
		const result = await jobService.getHeadersDataForPilot(
			currentUser,
			options,
		);
		res.status(httpStatus.OK).json(result);
	},
);
const getRejectedJobs = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const result = await jobService.getRejectedJobs(user, options);
	res.status(httpStatus.OK).json(result);
});

const getBiddingJobById = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = +req.params.jobId;
	const result = await jobService.getBiddingJobById(currentUser, id);
	res.status(httpStatus.OK).json(result);
});

const getJobInvoice = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = +req.params.jobId;
	const result = await jobService.getJobInvoice(currentUser, id);
	res.status(httpStatus.OK).json(result);
});
const getAllJobInvoices = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const result = await jobService.getAllJobInvoices(currentUser, options);
	res.status(httpStatus.OK).json(result);
});
const acceptJobThroughEmail = catchAsync(
	async (req: Request, res: Response) => {
		const token = req.params.token;
		const data = req.body;
		const result = await jobService.acceptJobThroughEmail(token, data);
		res.status(httpStatus.OK).json(result);
	},
);
const getMyJobsByPilot = catchAsync(async (req: Request, res: Response) => {
	const pilotId = req.payload.id;
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const result = await jobService.getMyJobsByPilot(pilotId, options);
	res.status(httpStatus.OK).json(result);
});
const getPilotPendingJobs = catchAsync(async (req: Request, res: Response) => {
	const pilotId = req.payload.id;
	// const pilotId = +req.params.pilotId;
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const result = await jobService.getPilotPendingJobs(pilotId, options);
	res.status(httpStatus.OK).json(result);
});
const getPilotRejectedJobs = catchAsync(async (req: Request, res: Response) => {
	const pilotId = req.payload.id;
	// const pilotId = +req.params.pilotId;
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const result = await jobService.getPilotRejectedJobs(pilotId, options);
	res.status(httpStatus.OK).json(result);
});
const getJobActivitiesByJobId = catchAsync(
	async (req: Request, res: Response) => {
		const jobId = +req.params.jobId;
		// const options = pick(req.query, ['limit', 'page']);
		const result = await jobService.getJobActivitiesByJobId(jobId);
		res.status(httpStatus.OK).json({ result });
	},
);
const getJobByIdForPilot = catchAsync(async (req: Request, res: Response) => {
	const jobId = +req.params.jobId;
	const pilotId = req.payload.id;
	// const options = pick(req.query, ['limit', 'page']);
	const result = await jobService.getJobByIdForPilot(jobId, pilotId);
	res.status(httpStatus.OK).json(result);
});
//controller for place bid
const placeBidForJob = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const data = req.body;
	const result = await jobService.placeBidForJob(currentUser, data);
	res.status(httpStatus.CREATED).json(result);
});
const getAllBidsByJobId = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const jobId = +req.params.jobId;
	const result = await jobService.getAllBidsByJobId(currentUser, jobId);
	res.status(httpStatus.OK).json(result);
});

const updateBidJobStatus = catchAsync(async (req: Request, res: Response) => {
	const id = +req.params.bidId;
	const userData = req.user;
	const data = req.body;
	const result = await jobService.updateBidJobStatus(data, id, userData);
	res.status(httpStatus.OK).json(result);
});

const getJobBytokenThroughEmail = catchAsync(
	async (req: Request, res: Response) => {
		const token = req.params.token;
		const result = await jobService.getJobBytokenThroughEmail(token);
		res.status(httpStatus.OK).json(result);
	},
);
const getMonthlyAcresSprayed = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user;
		const yearParam = req.query.year;
		const year =
			typeof yearParam === 'string' ? parseInt(yearParam, 10) : undefined;
		if (!year || isNaN(year)) {
			throw new Error('Invalid year parameter');
		}
		const userData = await jobService.getMonthlyAcresSprayed(user, year);
		res.status(httpStatus.OK).json(userData);
	},
);
const getFinancialSummary = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const days = req?.query?.days as string; // expecting last 30 or 7 days
	const userData = await jobService.getFinancialSummary(user, days);
	res.status(httpStatus.OK).json(userData);
});

const getCalendarApplications = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user;
		const month = req.query.month as string;
		const result = await jobService.getCalendarApplications(user, month);
		res.status(httpStatus.OK).json(result);
	},
);
const getApplicationsByRange = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user;
		const { startDate, endDate } = req.query;
		const result = await jobService.getApplicationsByRange(
			user,
			startDate as string,
			endDate as string,
		);
		res.status(httpStatus.OK).json(result);
	},
);
const uploadFlightLog = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const jobId = +req.params.id;
	const files = req.files;

	if (!files || !Array.isArray(files)) {
		throw new Error('No files uploaded');
	}

	const file = files[0];

	if (!file) {
		return res.status(400).json({ error: 'File is required.' });
	}

	const result = await jobService.uploadFlightLog(userId, jobId, file);
	res.status(httpStatus.OK).json(result);
});

const getFaaReports = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const result = await jobService.getFaaReports(currentUser, options);
	res.status(httpStatus.OK).json(result);
});

const uploadFlightLogImage = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const jobId = +req.params.id;
	// const files = req.files;
	const { file } = req.body;
	// Decode Base64 file
	const base64Data = file.replace(
		/^data:(image|application)\/[a-zA-Z0-9+.-]+;base64,/,
		'',
	);
	const fileBuffer = Buffer.from(base64Data, 'base64');
	// if (!files || !Array.isArray(files)) {
	// 	throw new Error('No files uploaded');
	// }

	// const file = files[0];

	// if (!file) {
	// 	return res.status(400).json({ error: 'File is required.' });
	// }

	const result = await jobService.uploadFlightLogImage(
		user,
		jobId,
		fileBuffer,
	);
	res.status(httpStatus.OK).json(result);
});

const createFlighLog = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const jobId = +req.params.id;
	const data = req.body;
	const result = await jobService.createFlighLog(currentUser, jobId, data);
	res.status(httpStatus.CREATED).json(result);
});
const getFlighLogById = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const logId = +req.params.id;
	const result = await jobService.getFlighLogById(currentUser, logId);
	res.status(httpStatus.CREATED).json(result);
});
const getSearchProduct = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const options = pick(req.query, ['limit', 'page', 'search']);
	const result = await jobService.getSearchProduct(user, options);
	res.status(httpStatus.OK).json(result);
});

const updateAutoJobStatus = catchAsync(async (req: Request, res: Response) => {
	const userId = +req.params.userId;
	const user = req.user;
	const status = req.body.status;
	const result = await jobService.updateAutoJobStatus(userId, user, status);
	res.status(httpStatus.OK).json(result);
});
export default {
	createJob,
	getAllJobsByApplicator,
	getJobById,
	deleteJob,
	updateJobByApplicator,
	getAllPilotsByApplicator,
	getAllJobTypes,
	getAllJobStatus,
	getJobStatusForFilter,
	getGrowerListForApplicator,
	getApplicatorListForGrower,
	getFarmListByGrowerId,
	getFarmListByApplicatorId,
	uploadJobAttachments,
	getJobs,
	getOpenJobs,
	getMyBidJobs,
	getJobsPendingFromMe,
	getJobsPendingFromGrower,
	// getJobsPendingFromApplicators,
	updatePendingJobStatus,
	getJobByPilot,
	getAssignedJobs,
	addOpenForBiddingJob,
	upcomingApplications,
	getHeadersData,
	getRejectedJobs,
	getBiddingJobById,
	getJobInvoice,
	getAllJobInvoices,
	acceptJobThroughEmail,
	getMyJobsByPilot,
	getPilotPendingJobs,
	getPilotRejectedJobs,
	getJobByIdForPilot,
	getJobActivitiesByJobId,
	placeBidForJob,
	getAllBidsByJobId,
	updateBidJobStatus,
	getJobBytokenThroughEmail,
	getMonthlyAcresSprayed,
	getFinancialSummary,
	getCalendarApplications,
	getApplicationsByRange,
	uploadFlightLog,
	getFaaReports,
	uploadFlightLogImage,
	createFlighLog,
	getFlighLogById,
	getHeadersDataForPilot,
	getSearchProduct,
	updateAutoJobStatus,
	getAllJobsByApplicatorDashboard,
};
