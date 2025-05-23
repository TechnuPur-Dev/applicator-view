import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import permissionService from './permissions-service';
// import pick from '../../../../../shared/utils/pick';


const getAllPermissions = catchAsync(async (req: Request, res: Response) => {
	// const options = pick(req.query, ['limit', 'page']);
	const userData = await permissionService.getAllPermissions();
	res.status(httpStatus.OK).json(userData);
});

const getAdminUserPermissions = catchAsync(async (req: Request, res: Response) => {
	// const options = pick(req.query, ['limit', 'page']);
	const userData = await permissionService.getAdminUserPermissions();
	res.status(httpStatus.OK).json(userData);
});
const updateAdminPermission = catchAsync(async (req: Request, res: Response) => {
	const data = req.body
	const userData = await permissionService.updateAdminPermission(data);
	res.status(httpStatus.OK).json(userData);
});
export default {
	getAllPermissions,
	getAdminUserPermissions,
	updateAdminPermission
	
};
