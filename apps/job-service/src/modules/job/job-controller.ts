import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import jobService from './job-service';

// Controller to create job
const createJob = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await jobService.createJob(data);
	res.status(httpStatus.CREATED).json(result);
});
const getAllJobsByApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const applicatorId = +req.payload.id;
		const result = await jobService.getAllJobsByApplicator(applicatorId);
		res.status(httpStatus.OK).json({ result });
	},
);
const getJobById = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.jobId;
	const result = await jobService.getJobById(Id);
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
		const Id = +req.params.jobId;
		const data = req.body;
		console.log(data, 'data');
		const result = await jobService.updateJobByApplicator(data, Id);
		res.status(httpStatus.OK).json(result);
	},
);

// get All pilots by applicator
const getAllPilotsByApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const Id = +req.payload.id; // applicator id get from token
		const jobData = await jobService.getAllPilotsByApplicator(Id);
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
	const id = +req.payload.id;
	const type = req.params.type;

	const result = await jobService.getJobs(id, type);
	res.status(httpStatus.OK).json({ result });
});
const getOpenJobs = catchAsync(
	async (req: Request, res: Response) => {
		const result = await jobService.getOpenJobs();
		res.status(httpStatus.OK).json({ result });
	},
);
// for applicator approval screen
const getJobsPendingFromMe = catchAsync(async (req: Request, res: Response) => {
	const id = +req.payload.id;
	const currentUser = req.user
	const result = await jobService.getJobsPendingFromMe(id,currentUser);
	res.status(httpStatus.OK).json({ result });
});
const getJobsPendingFromGrower = catchAsync(
	async (req: Request, res: Response) => {
		const id = +req.payload.id;
		const result = await jobService.getJobsPendingFromGrowers(id);
		res.status(httpStatus.OK).json({ result });
	},
);
// for grower approval screen 
const getJobsPendingFromApplicators = catchAsync(
	async (req: Request, res: Response) => {
		const id = +req.payload.id;
		const result = await jobService.getJobsPendingFromApplicators(id);
		res.status(httpStatus.OK).json({ result });
	},
);

const updatePendingJobStatus = catchAsync(
	async (req: Request, res: Response) => {
		const Id = +req.params.jobId;
		const applicatorId = req.payload.id
		const data = req.body;
		const result = await jobService.updatePendingJobStatus(data, Id,applicatorId);
		res.status(httpStatus.OK).json(result);
	},
);

const getJobByPilot = catchAsync(
	async (req: Request, res: Response) => {
		const applicatorId = +req.payload.id;
		const pilotId = +req.params.pilotId;
		const result = await jobService.getJobByPilot(applicatorId,pilotId);
		res.status(httpStatus.OK).json({ result });
	},
);
const getAssignedJobs = catchAsync(
	async (req: Request, res: Response) => {
		const applicatorId = +req.payload.id;
		const result = await jobService.getAssignedJobs(applicatorId);
		res.status(httpStatus.OK).json({ result });
	},
);
export default {
	createJob,
	getAllJobsByApplicator,
	getJobById,
	deleteJob,
	updateJobByApplicator,
	getAllPilotsByApplicator,
	getAllJobTypes,
	getAllJobStatus,
	getGrowerListForApplicator,
	getApplicatorListForGrower,
	getFarmListByGrowerId,
	uploadJobAttachments,
	getJobs,
	getOpenJobs,
	getJobsPendingFromMe,
	getJobsPendingFromGrower,
	getJobsPendingFromApplicators,
	updatePendingJobStatus,
	getJobByPilot,
	getAssignedJobs
};
