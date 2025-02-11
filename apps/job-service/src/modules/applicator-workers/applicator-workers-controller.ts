import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import applicatorWorkersServices from './applicator-workers-services';

const createWorker = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id
	const data = req.body;
	const result = await applicatorWorkersServices.createWorker(data,applicatorId);
	res.status(httpStatus.CREATED).json(result);
});

const getAllWorker =  catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id;
	const workerData = await applicatorWorkersServices.getAllWorker(applicatorId);
	res.status(httpStatus.OK).json({result:workerData});
});

const getWorkerById = catchAsync(async (req: Request, res: Response) => {
	const id = +req.params.id;
	const result = await applicatorWorkersServices.getWorkerById(id);
	res.status(httpStatus.OK).json(result);
});
const updateWorker =  catchAsync(async (req: Request, res: Response) => {
	const workerId = +req.params.id
	const data = req.body;
	const result = await applicatorWorkersServices.updateWorker(workerId,data);
	res.status(httpStatus.OK).json(result);
});

const deleteWorker = catchAsync(async (req: Request, res: Response) => {
	const id = +req.params.id;
	const result = await applicatorWorkersServices.deleteWorker(id);
	res.status(httpStatus.OK).json(result);
});
export default{
    createWorker,
    getAllWorker,
	getWorkerById,
    updateWorker,
    deleteWorker
}