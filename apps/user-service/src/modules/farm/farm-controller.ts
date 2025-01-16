import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import farmService from './farm-service';
// import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../helper/jwtToken';

// Controller for verifying phone and sending OTP
const createForm = catchAsync(async (req: Request, res: Response) => {
	const createdById = parseInt(req.params.createdById);
	const growerId = parseInt(req.params.growerId);
	const { name, state, county, township, zipCode, isActive } = req.body; // Destructure body
	const result = await farmService.createForm(
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
const getAllFarms = catchAsync(async (req: Request, res: Response) => {
	const userData = await farmService.getAllFarms();
	res.status(httpStatus.OK).json({ result: userData });
});
const getFarmById = catchAsync(async (req: Request, res: Response) => {
	const Id = parseInt(req.params.id);
	const result = await farmService.getFarmById(Id);
	res.status(httpStatus.OK).json(result);
});

// controller to delete user by ID
const deleteFarm = catchAsync(async (req: Request, res: Response) => {
	const farmId = req.params.id;
    const userId = req.params.deletedById;
	const result = await farmService.deleteFarm(farmId,userId);
	res.status(httpStatus.OK).json(result);
});

// controler to update Farm
const updateFarm = catchAsync(async (req: Request, res: Response) => {
	const farmID = parseInt(req.params.farmId);
	const updatedById = parseInt(req.params.updatedById)
	const data = req.body;

	const result = await farmService.updateFarm(farmID, data, updatedById);
	res.status(httpStatus.OK).json(result);
});
export default {
	createForm,
    getAllFarms,
    getFarmById,
    deleteFarm,
	updateFarm
};
