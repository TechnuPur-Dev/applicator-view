import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import equipmentService from './equipment-service';
import pick from '../../../../../shared/utils/pick';

const createEquipment = catchAsync(async (req: Request, res: Response) => {
	const createdById = req.payload.id;
	const data = req.body;
	const result = await equipmentService.createEquipment(createdById, data);
	res.status(httpStatus.CREATED).json(result);
});
const getAllEquipmentList = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page','label','searchValue']);
	const currentUser = req.user;
	const result = await equipmentService.getAllEquipmentList(
		currentUser,
		options,
	);
	res.status(httpStatus.OK).json(result);
});
const getEquipmentById = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = +req.params.id;
	const result = await equipmentService.getEquipmentById(currentUser, id);
	res.status(httpStatus.OK).json(result);
});
const updateEquipment = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = +req.params.id;
	const data = req.body;
	console.log(data);
	const result = await equipmentService.updateEquipment(
		currentUser,
		id,
		data,
	);
	res.status(httpStatus.OK).json(result);
});
const deleteEquipment = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = +req.params.id;
	await equipmentService.deleteEquipment(currentUser, id);
	res.status(httpStatus.OK).json({ message: 'Deleted successfully.' });
});
export default {
	createEquipment,
	getAllEquipmentList,
	getEquipmentById,
	updateEquipment,
	deleteEquipment,
};
