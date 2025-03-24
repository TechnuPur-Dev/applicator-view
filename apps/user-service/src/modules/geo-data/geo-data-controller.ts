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
const createCounties = catchAsync(async (req: Request, res: Response) => {
	// const data = req.body.counties;
	const data = req.body.counties;
	const result = await geoDataService.createCounties(data);
	res.status(httpStatus.OK).json(result);
});
const createTownships = catchAsync(async (req: Request, res: Response) => {
	// const data = req.body.townships;
	const data = req.body.townships;
	const result = await geoDataService.createTownships(data);
	res.status(httpStatus.OK).json(result);
});
const getAllStates = catchAsync(async (req: Request, res: Response) => {
	const states = await geoDataService.getAllStates();
	res.status(httpStatus.OK).json({ result: states });
});
const getAllCounties = catchAsync(async (req: Request, res: Response) => {
	const counties = await geoDataService.getAllCounties();
	res.status(httpStatus.OK).json({ result: counties });
});
const getAllTownships = catchAsync(async (req: Request, res: Response) => {
	const townships = await geoDataService.getAllTownships();
	res.status(httpStatus.OK).json({ result: townships });
});
const deleteState = catchAsync(async (req: Request, res: Response) => {
	const stateId = +req.params.stateId;
	// const userId = req.payload.id;
	const result = await geoDataService.deleteState(stateId);
	res.status(httpStatus.OK).json(result);
});
const deleteCounty = catchAsync(async (req: Request, res: Response) => {
	const countyId = +req.params.countyId;
	// const userId = req.payload.id;
	const result = await geoDataService.deleteCounty(countyId);
	res.status(httpStatus.OK).json(result);
});
const deleteTownship = catchAsync(async (req: Request, res: Response) => {
	const townshipId = +req.params.townshipId;
	// const userId = req.payload.id;
	const result = await geoDataService.deleteTownship(townshipId);
	res.status(httpStatus.OK).json(result);
});
const updateState = catchAsync(async (req: Request, res: Response) => {
	const stateId = +req.params.stateId;
	const data = req.body;

	const result = await geoDataService.updateState(stateId, data);
	res.status(httpStatus.OK).json(result);
});
const updateCounty = catchAsync(async (req: Request, res: Response) => {
	const countyId = +req.params.countyId;
	const data = req.body;
	const result = await geoDataService.updateCounty(countyId, data);
	res.status(httpStatus.OK).json(result);
});
const updateTownship = catchAsync(async (req: Request, res: Response) => {
	const townshipId = +req.params.townshipId;
	const data = req.body;
	const result = await geoDataService.updateTownship(townshipId, data);
	res.status(httpStatus.OK).json(result);
});
const getCountiesByState = catchAsync(async (req: Request, res: Response) => {
	const stateId = +req.params.stateId;
	const result = await geoDataService.getCountiesByState(stateId);
	res.status(httpStatus.OK).json(result);
});
const getTownshipsByCounty = catchAsync(async (req: Request, res: Response) => {
	const countyId = +req.params.countyId;
	const result = await geoDataService.getTownshipsByCounty(countyId);
	res.status(httpStatus.OK).json(result);
});
const validateAddress = catchAsync(async (req: Request, res: Response) => {
	const { street, city, state } = req.query as { street: string; city: string; state: string };

	const result = await geoDataService.validateAddress( street, city, state);
	res.status(httpStatus.OK).json(result);
});
export default {
	createStates,
	createCounties,
	createTownships,
	getAllStates,
	getAllCounties,
	getAllTownships,
	deleteState,
	deleteCounty,
	deleteTownship,
	updateState,
	updateCounty,
	updateTownship,
	getCountiesByState,
	getTownshipsByCounty,
	validateAddress
};
