import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import stateService from './state-service';
import pick from '../../../../../shared/utils/pick';

const getAllStates = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page', 'searchValue']);
	const states = await stateService.getAllStates(options);

	res.status(httpStatus.OK).json(states);
});
const createStates = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
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

const bulkUploadstate = catchAsync(async (req: Request, res: Response) => {
	// const file = req.file;
	  const fileBuffer = req.file?.buffer;
	   console.log(fileBuffer,'dataupdate')
	if (!fileBuffer) {
		return res.status(400).json({ error: 'File is required.' });
	}
	const result = await stateService.bulkUploadstate(fileBuffer);
	res.status(httpStatus.OK).json(result);
});

export default {
	getAllStates,
	createStates,
	deleteState,
	updateState,
	bulkUploadstate
	
	
};
