import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import userService from './user-service';

// Controller to get userList
const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
	const file = req.file;

	if (!file) {
		return res.status(400).json({ error: 'File is required.' });
	}

	const result = await userService.uploadProfileImage(file);
	res.status(httpStatus.OK).json(result);
});

// Controller to update user profile
const updateProfile = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const data = req.body;
	const result = await userService.updateProfile(data, userId);
	res.status(httpStatus.OK).json(result);
});

// Controller to get user by ID

const getUserById = catchAsync(async (req: Request, res: Response) => {
	const userId = +req.params.id;
	const result = await userService.getUserByID(userId);
	res.status(httpStatus.OK).json(result);
});

// Controller to delete user by ID
const deleteUser = catchAsync(async (req: Request, res: Response) => {
	const userId = +req.params.id;
	const result = await userService.deleteUser(userId);
	res.status(httpStatus.OK).json(result);
});

// Controller to get userList
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
	const userData = await userService.getAllUsers();
	res.status(httpStatus.OK).json({ result: userData });
});

const getGrowerByEmail = catchAsync(async (req: Request, res: Response) => {
	const email = req.params.email;
	const result = await userService.getGrowerByEmail(email);
	res.status(httpStatus.OK).json(result);
});
const createGrower = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const applicatorId = req.payload.id;
	const result = await userService.createGrower(data, applicatorId);
	res.status(httpStatus.CREATED).json(result);
});
const getAllGrowersByApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const applicatorId = req.payload.id;
		const result =
			await userService.getAllGrowersByApplicator(applicatorId);
		res.status(httpStatus.OK).json({ result });
	},
);

const updateInviteStatus = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await userService.updateInviteStatus(data);
	res.status(httpStatus.OK).json(result);
});
const getPendingInvites = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const result = await userService.getPendingInvites(userId);
	res.status(httpStatus.OK).json({ result: result });
});

const deleteGrower = catchAsync(async (req: Request, res: Response) => {
	const growerId = +req.params.growerId;
	const applicatorId = req.payload.id;
	const result = await userService.deleteGrower(growerId, applicatorId);
	res.status(httpStatus.OK).json(result);
});
export default {
	uploadProfileImage,
	getUserById,
	updateProfile,
	deleteUser,
	getAllUsers,
	getGrowerByEmail,
	createGrower,
	getAllGrowersByApplicator,
	updateInviteStatus,
	getPendingInvites,
	deleteGrower,
};
