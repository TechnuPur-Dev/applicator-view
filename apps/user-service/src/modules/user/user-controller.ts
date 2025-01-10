import { Request, Response } from 'express';
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
export default {
	getUserById,
	updateUserById,
	deleteUser,
	getUserList,
};
