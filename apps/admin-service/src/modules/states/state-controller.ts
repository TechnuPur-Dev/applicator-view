import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import stateService from './state-service';
// import pick from '../../../../../shared/utils/pick';

const getAllStates = catchAsync(async (req: Request, res: Response) => {
	const states = await stateService.getAllStates();
	res.status(httpStatus.OK).json({ result: states });
});
const createStates = catchAsync(async (req: Request, res: Response) => {
	const data = req.body.states;
	const result = await stateService.createStates(data);
	res.status(httpStatus.OK).json(result);
});
const updateState = catchAsync(async (req: Request, res: Response) => {
	const stateId = +req.params.stateId;
	const data = req.body;

	const result = await stateService.updateState(stateId, data);
	res.status(httpStatus.OK).json(result);
});
const deleteState = catchAsync(async (req: Request, res: Response) => {
	const stateId = +req.params.stateId;
	// const userId = req.payload.id;
	const result = await stateService.deleteState(stateId);
	res.status(httpStatus.OK).json(result);
});

export default {
	getAllStates,
	createStates,
	deleteState,
	updateState
	
	
};
