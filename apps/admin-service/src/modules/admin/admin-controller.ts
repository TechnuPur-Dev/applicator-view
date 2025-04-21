import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import adminService from './admin-service';
import pick from '../../../../../shared/utils/pick';



// Controller to get userList
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);

	const userData = await adminService.getAllUsers(options);
	res.status(httpStatus.OK).json(userData);
});

const getApplicatorUsers = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page','searchValue']);

	const userData = await adminService.getApplicatorUsers(options);
	res.status(httpStatus.OK).json(userData);
});
const getGrowerUsers = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page','searchValue']);

	const userData = await adminService.getGrowerUsers(options);
	res.status(httpStatus.OK).json(userData);
});
const getPilotUsers = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page','searchValue']);

	const userData = await adminService.getPilotUsers(options);
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
export default {
	
	getAllUsers,
	getApplicatorUsers,
	getGrowerUsers,
	getPilotUsers,
	getUserById,
	deleteUser
};
