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
// const getAllPilotsByApplicator = catchAsync(
// 	async (req: Request, res: Response) => {
// 		const Id = +req.payload.id; // applicator id get from token
// 		const jobData = await jobService.getAllPilotsByApplicator(Id);
// 		res.status(httpStatus.OK).json({ result: jobData });
// 	},
// );
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
const getFarmListByGrowerID = catchAsync(
	async (req: Request, res: Response) => {
		const applicatorId = +req.payload.id;
		const growerId = +req.params.growerId;
		const result = await jobService.getFarmListByGrowerID(
			applicatorId,
			growerId,
		);
		res.status(httpStatus.OK).json({ result: result });
	},
);
export default {
	createJob,
	getAllJobsByApplicator,
	getJobById,
	deleteJob,
	updateJobByApplicator,
	// getAllPilotsByApplicator,
	getAllJobTypes,
	getAllJobStatus,
	getGrowerListForApplicator,
	getApplicatorListForGrower,
	getFarmListByGrowerID,
};
