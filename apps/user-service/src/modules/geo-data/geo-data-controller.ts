import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import geoDataService from './geo-data-service';

// Controller to update user profile
const createStates = catchAsync(async (req: Request, res: Response) => {
	const data = req.body.states;
	const result = await geoDataService.createStates(data);
	res.status(httpStatus.OK).json(result);
});
// Controller to update user profile
const createCounties = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await geoDataService.createCounties(data);
	res.status(httpStatus.OK).json(result);
});
// Controller to update user profile
const createTownships = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await geoDataService.createTownships(data);
	res.status(httpStatus.OK).json(result);
});

export default {
	createStates,
	createCounties,
	createTownships,
};
