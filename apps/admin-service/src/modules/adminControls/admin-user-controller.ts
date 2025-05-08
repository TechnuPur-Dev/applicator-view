import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import adminService from './admin-user-service';
import pick from '../../../../../shared/utils/pick';



// Controller to get userList
const createUser = catchAsync(async (req: Request, res: Response) => {
	// const currentUser = req.payload.id;
	const data = req.body
	const userData = await adminService.createUser(data);
	res.status(httpStatus.OK).json(userData);
});
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);

	const userData = await adminService.getAllUsers(options);
	res.status(httpStatus.OK).json(userData);
});

const getUserById  = catchAsync(async (req: Request, res: Response) => {
   const id = +req.params.userId
	const userData = await adminService.getUserById(id);
	res.status(httpStatus.OK).json(userData);
});
const deleteUser  = catchAsync(async (req: Request, res: Response) => {
	const id = +req.params.userId
	 const result = await adminService.deleteUser(id);
	 res.status(httpStatus.OK).json(result);
 });
 const disableUser  = catchAsync(async (req: Request, res: Response) => {
	const data = req.body
	 const userData = await adminService.disableUser(data);
	 res.status(httpStatus.OK).json(userData);
 });
export default {
	
	getAllUsers,
	getUserById,
	deleteUser,
	createUser,
	disableUser
};
