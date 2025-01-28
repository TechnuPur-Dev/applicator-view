import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import jobService from './job-service';

// Controller to create job
const createJob = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await jobService.createJob(data);
	res.status(httpStatus.CREATED).json({
		result,
		message: 'Job created Successfully',
	});
});
const getAllJobsByApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const Id = +req.params.applicatorId;
		const jobData = await jobService.getAllJobsByApplicator(Id);
		res.status(httpStatus.OK).json({ result: jobData });
	},
);
const getJobById = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.jobId;
	const result = await jobService.getJobById(Id);
	res.status(httpStatus.OK).json(result);
});

// Controller to delete job by ID
const deleteJob = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.jobId;
	const result = await jobService.deleteJob(Id);
	res.status(httpStatus.OK).json(result);
});

const updateJobByApplicator = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.jobId;
	const data = req.body;
	console.log(data, 'data');
	const result = await jobService.updateJobByApplicator(data, Id);
	res.status(httpStatus.OK).json(result);
});

// get All pilots by applicator
// const getAllPilotsByApplicator = catchAsync(
// 	async (req: Request, res: Response) => {
// 		const Id = +req.payload.id; // applicator id get from token
// 		const jobData = await jobService.getAllPilotsByApplicator(Id);
// 		res.status(httpStatus.OK).json({ result: jobData });
// 	},
// );

export default {
	createJob,
	getAllJobsByApplicator,
	getJobById,
	deleteJob,
	updateJobByApplicator,
	// getAllPilotsByApplicator,
};
