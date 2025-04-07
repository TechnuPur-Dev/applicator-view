import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import permissionServices from './permission-services';

const createPermission = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await permissionServices.createPermission(
		data
	);
	res.status(httpStatus.CREATED).json(result);
});

const getAllPermissions = catchAsync(async (req: Request, res: Response) => {
	const workerData =
		await permissionServices.getAllPermissions();
	res.status(httpStatus.OK).json(workerData);
});

const getPermissionById = catchAsync(async (req: Request, res: Response) => {
	const permissionId = +req.params.id;
	const result = await permissionServices.getPermissionById(
		permissionId
	);
	res.status(httpStatus.OK).json(result);
});
const updatePermission = catchAsync(async (req: Request, res: Response) => {
	
	const permissionId = +req.params.id;
	const data = req.body;

	const result = await permissionServices.updatePermission(
		permissionId,
		data,
	);
	res.status(httpStatus.OK).json(result);
});

const deletePermission = catchAsync(async (req: Request, res: Response) => {


	const permissionId = +req.params.id;
	const result = await permissionServices.deletePermission(
		permissionId,
	);
	res.status(httpStatus.OK).json(result);
});
const getAllPermissionTypes = catchAsync(async (req: Request, res: Response) => {
	const workerData =
		await permissionServices.getAllPermissionTypes();
	res.status(httpStatus.OK).json(workerData);
});
export default {
	createPermission,
	getAllPermissions,
	getPermissionById,
	updatePermission,
	deletePermission,
	getAllPermissionTypes
};
