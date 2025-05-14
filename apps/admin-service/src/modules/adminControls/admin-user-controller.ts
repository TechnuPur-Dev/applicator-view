import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import adminService from './admin-user-service';
import pick from '../../../../../shared/utils/pick';

// Controller to get userList
const createUser = catchAsync(async (req: Request, res: Response) => {
	const adminId = req.payload.id;
	const data = req.body;
	const userData = await adminService.createUser(adminId, data);
	res.status(httpStatus.OK).json(userData);
});
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);
	const userData = await adminService.getAllUsers(options);
	res.status(httpStatus.OK).json(userData);
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
	const id = +req.params.userId;
	const adminId = req.payload.id;
	const userData = await adminService.getUserById(id,adminId);
	res.status(httpStatus.OK).json(userData);
});
const deleteUser = catchAsync(async (req: Request, res: Response) => {
	const id = +req.params.userId;
	const adminId = req.payload.id;
	const result = await adminService.deleteUser(id,adminId);
	res.status(httpStatus.OK).json(result);
});
const disableUser = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const adminId = req.payload.id;
	const userData = await adminService.disableUser(data,adminId);
	res.status(httpStatus.OK).json(userData);
});
const getAdminActivities = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);
	const userData = await adminService.getAdminActivities(options);
	res.status(httpStatus.OK).json(userData);
});
const loginAdminUser = catchAsync(async (req: Request, res: Response) => {
	 console.log(req.body,"req.body")
	const { email, password, deviceToken } = req.body; // Destructure body
	const result = await adminService.loginAdminUser({
		email,
		password,
		deviceToken,
	});
	res.status(httpStatus.OK).json(result);
});
export default {
	getAllUsers,
	getUserById,
	deleteUser,
	createUser,
	disableUser,
	getAdminActivities,
	loginAdminUser
};
