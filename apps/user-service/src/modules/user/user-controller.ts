import { application, Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import userService from './user-service';

// contoroller to get user by ID

const getUserById = catchAsync(async (req: Request, res: Response) => {
	const userId = req.params.id;
	const result = await userService.getUserByID(userId);
	res.status(httpStatus.OK).json(result);
});

// contoroller to update user by ID
const updateUserById = catchAsync(async (req: Request, res: Response) => {
	const userId = req.params.id;
	const data = req.body;

	const result = await userService.updateUserById(data, userId);
	res.status(httpStatus.OK).json(result);
});
// contoroller to get userList
const getUserList = catchAsync(async (req: Request, res: Response) => {
	const userData = await userService.getUserList();
	res.status(httpStatus.OK).json({ result: userData });
});

// contoroller to delete user by ID
const deleteUser = catchAsync(async (req: Request, res: Response) => {
	const userId = req.params.id;
	const result = await userService.deleteUser(userId);
	res.status(httpStatus.OK).json(result);
});
const getUserByEmail = catchAsync(async (req: Request, res: Response) => {
	const userEmail = req.params.email;
	console.log(userEmail);
	const result = await userService.getUserByEmail(userEmail);
	res.status(httpStatus.OK).json({ result: result });
});
const createGrower = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const applicatorId = 1;
	const result = await userService.createGrower(data, applicatorId);
	res.status(httpStatus.OK).json({ result: result });
});
const getAllGrowers = catchAsync(async (req: Request, res: Response) => {
	const userData = await userService.getAllGrowers();
	res.status(httpStatus.OK).json({ result: userData });
});
const updateInviteStatus = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;

	const result = await userService.updateInviteStatus(data);
	res.status(httpStatus.OK).json(result);
});
export default {
	getUserById,
	updateUserById,
	deleteUser,
	getUserList,
	getUserByEmail,
	createGrower,
	getAllGrowers,
	updateInviteStatus,
};
