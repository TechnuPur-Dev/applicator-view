import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import farmService from './farm-service';

// Controller for verifying phone and sending OTP
const createFarm = catchAsync(async (req: Request, res: Response) => {
	const createdById = req.payload.id;
	const growerId = +req.params.growerId;
	console.log(createdById, growerId);
	const { name, state, county, township, zipCode, isActive } = req.body; // Destructure body
	const result = await farmService.createFarm(
		{
			name,
			state,
			county,
			township,
			zipCode,
			isActive,
		},
		createdById,
		growerId,
	);
	res.status(httpStatus.OK).json(result);
});
// get all farms
const getAllFarmsByGrower = catchAsync(async (req: Request, res: Response) => {
	const growerId = req.payload.id;
	const userData = await farmService.getAllFarmsByGrower(growerId);
	res.status(httpStatus.OK).json({ result: userData });
});
const getFarmById = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.farmId;
	const result = await farmService.getFarmById(Id);
	res.status(httpStatus.OK).json(result);
});

// controller to delete user by ID
const deleteFarm = catchAsync(async (req: Request, res: Response) => {
	const farmId = +req.params.farmId;
	// const userId = req.payload.id;
	const result = await farmService.deleteFarm(farmId);
	res.status(httpStatus.OK).json(result);
});

// controler to update Farm
const updateFarm = catchAsync(async (req: Request, res: Response) => {
	const farmId = +req.params.farmId;
	const data = req.body;

	const result = await farmService.updateFarm(farmId, data);
	res.status(httpStatus.OK).json(result);
});
// controler to update Farm
const assignFarmPermission = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await farmService.assignFarmPermission(data);
	res.status(httpStatus.OK).json(result);
});
// controler to update Farm
const updateFarmPermission = catchAsync(async (req: Request, res: Response) => {
	const permissionId = +req.params.permissionId;
	const data = req.body;
	const result = await farmService.updateFarmPermission(permissionId, data);
	res.status(httpStatus.OK).json(result);
});
// controler to update Farm
const deleteFarmPermission = catchAsync(async (req: Request, res: Response) => {
	const permissionId = +req.params.permissionId;
	const result = await farmService.deleteFarmPermission(permissionId);
	res.status(httpStatus.OK).json(result);
});
const askFarmPermission = catchAsync(async (req: Request, res: Response) => {
	const { email } = req.body; // Destructure body
	const result = await farmService.askFarmPermission(email);
	res.status(httpStatus.OK).json(result);
});
export default {
	createFarm,
	getAllFarmsByGrower,
	getFarmById,
	deleteFarm,
	updateFarm,
	assignFarmPermission,
	updateFarmPermission,
	deleteFarmPermission,
	askFarmPermission
};
