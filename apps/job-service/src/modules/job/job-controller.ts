import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import jobService from './job-service';



// Controller to create job 
const createJob = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const createdById = req.payload.id;
	const result = await jobService.createJob(data, createdById);
	res.status(httpStatus.CREATED).json(result);
});
const getAllJobs = catchAsync(async (req: Request, res: Response) => {
	const jobData = await jobService.getAllJobs();
	res.status(httpStatus.OK).json({ result: jobData });
});
const getJobById = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.jobId;
	const result = await jobService.getJobById(Id);
	res.status(httpStatus.OK).json(result);
});

// Controller to delete user by ID
const deleteJob = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.jobId;
	const result = await jobService.deleteJob(Id);
	res.status(httpStatus.OK).json(result);
});

const updateJobById = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.jobId;
	const data = req.body;
	const result = await jobService.updateJobById(data,Id);
	res.status(httpStatus.OK).json(result);
});

const getJobsByApplicator = catchAsync(async(req: Request, res: Response)=>{
	// const Id = +req.params.jobId;
	const result = await jobService.getJobsByApplicator();
	res.status(httpStatus.OK).json(result);
})
const getJobsByGrower = catchAsync(async(req: Request, res: Response)=>{
	// const Id = +req.params.jobId;
	const result = await jobService.getJobsByApplicator();
	res.status(httpStatus.OK).json(result);
})








export default {
	createJob,
	getAllJobs,
	getJobById,
	deleteJob,
	updateJobById,
	getJobsByApplicator,
	getJobsByGrower
};
