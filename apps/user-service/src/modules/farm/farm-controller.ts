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
	const userData = await farmService.getAllFarmsByGrower(growerId, options);
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

const uploadFarmImage = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const { type, file } = req.body;

	// Ensure `type` is a string
	if (typeof type !== 'string' || !type) {
		return res.status(400).json({ error: 'Invalid type parameter' });
	}

	// Validate file and filename
	if (!file) {
		return res
			.status(400)
			.json({ error: 'File and filename are required.' });
	}

	try {
		// Decode Base64 file
		const base64Data = file.replace(
			/^data:(image|application)\/(jpeg|png|pdf);base64,/,
			'',
		);
		const fileBuffer = Buffer.from(base64Data, 'base64');

		// Upload to Azure Blob Storage
		const result = await farmService.uploadFarmImage(
			userId,
			type,
			fileBuffer,
		);

		res.status(httpStatus.OK).json(result);
	} catch (error) {
		console.error('Error uploading file:', error);
		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			error: 'File upload failed',
		});
	}
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
	uploadFarmImage,
};
