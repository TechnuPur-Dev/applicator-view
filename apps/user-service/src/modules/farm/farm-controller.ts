import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import farmService from './farm-service';
import pick from '../../../../../shared/utils/pick';

// Controller for verifying phone and sending OTP
const createFarm = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const growerId = +req.params.growerId;
	const data = req.body; // Destructure body
	const result = await farmService.createFarm(currentUser, growerId, data);
	res.status(httpStatus.OK).json(result);
});
// get all farms
const getAllFarmsByGrower = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);

	const growerId = req.payload.id;
	const userData = await farmService.getAllFarmsByGrower(growerId,options);
	res.status(httpStatus.OK).json(userData);
});
const getFarmById = catchAsync(async (req: Request, res: Response) => {
	const id = +req.params.farmId;
	const result = await farmService.getFarmById(id);
	res.status(httpStatus.OK).json(result);
});

// controller to delete user by ID
const deleteFarm = catchAsync(async (req: Request, res: Response) => {
	const farmId = +req.params.farmId;
	const currentUser = req.user;
	const result = await farmService.deleteFarm(farmId, currentUser);
	res.status(httpStatus.OK).json(result);
});

// controler to update Farm
const updateFarm = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const farmId = +req.params.farmId;
	const data = req.body;
	const result = await farmService.updateFarm(currentUser, farmId, data);
	res.status(httpStatus.OK).json(result);
});
// controler to update Farm
const assignFarmPermission = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const data = req.body;
	const result = await farmService.assignFarmPermission(currentUser, data);
	res.status(httpStatus.OK).json(result);
});
// controler to update Farm
const updateFarmPermission = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const permissionId = +req.params.permissionId;
	const data = req.body;
	const result = await farmService.updateFarmPermission(
		currentUser,
		permissionId,
		data,
	);
	res.status(httpStatus.OK).json(result);
});
// controler to update Farm
const deleteFarmPermission = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const permissionId = +req.params.permissionId;
	const result = await farmService.deleteFarmPermission(
		currentUser,
		permissionId,
	);
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
	askFarmPermission,
};
