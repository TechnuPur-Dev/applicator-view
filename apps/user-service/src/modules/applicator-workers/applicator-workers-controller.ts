import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import applicatorWorkersServices from './applicator-workers-services';
import pick from '../../../../../shared/utils/pick';

const createWorker = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const data = req.body;
	const result = await applicatorWorkersServices.createWorker(
		currentUser,
		data,
	);
	res.status(httpStatus.CREATED).json(result);
});

const getAllWorkers = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);
	const applicatorId = req.payload.id;
	const workerData = await applicatorWorkersServices.getAllWorkers(
		applicatorId,
		options,
	);
	res.status(httpStatus.OK).json(workerData);
});

const getWorkerById = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id;
	const workerId = +req.params.id;
	const result = await applicatorWorkersServices.getWorkerById(
		applicatorId,
		workerId,
	);
	res.status(httpStatus.OK).json(result);
});
const updateWorker = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id;
	const workerId = +req.params.id;
	const data = req.body;

	const result = await applicatorWorkersServices.updateWorker(
		applicatorId,
		workerId,
		data,
	);
	res.status(httpStatus.OK).json(result);
});

const deleteWorker = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id;
	const workerId = +req.params.id;
	const result = await applicatorWorkersServices.deleteWorker(
		applicatorId,
		workerId,
	);
	res.status(httpStatus.OK).json(result);
});
const updateInviteStatus = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id;
	const data = req.body;
	const result = await applicatorWorkersServices.updateInviteStatus(
		applicatorId,
		data,
	);
	res.status(httpStatus.OK).json(result);
});

const searchWorkerByEmail = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id;
	const email = req.params.email;
	const options = pick(req.query, ['limit', 'page']);
	const result = await applicatorWorkersServices.searchWorkerByEmail(
		applicatorId,
		email,
		options,
	);
	res.status(httpStatus.OK).json(result);
});
export default {
	createWorker,
	getAllWorkers,
	getWorkerById,
	updateWorker,
	deleteWorker,
	updateInviteStatus,
	searchWorkerByEmail,
};
