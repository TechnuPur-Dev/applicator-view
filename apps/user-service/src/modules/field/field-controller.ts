import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import fieldService from './field-service';

// Controller to get field by ID

const getFieldById = catchAsync(async (req: Request, res: Response) => {
	const fieldId = +req.params.id;
	const result = await fieldService.getFieldById(fieldId);
	res.status(httpStatus.OK).json(result);
});

// Controller to update field by ID
const updateFieldById = catchAsync(async (req: Request, res: Response) => {
	const fieldId = +req.params.id;
	const data = req.body;
	const currentUser = req.user;
	const result = await fieldService.updateFieldById(
		data,
		fieldId,
		currentUser,
	);
	res.status(httpStatus.OK).json(result);
});
// Controller to get fieldList
const getAllFields = catchAsync(async (req: Request, res: Response) => {
	const fieldData = await fieldService.getAllFields();
	res.status(httpStatus.OK).json({ result: fieldData });
});

// Controller to delete field by ID
const deleteField = catchAsync(async (req: Request, res: Response) => {
	const fieldId = +req.params.id;
	const currentUser = req.user;
	const result = await fieldService.deleteField(fieldId, currentUser);
	res.status(httpStatus.OK).json(result);
});

const createField = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const data = req.body;
	const currentUser = req.user;
	const result = await fieldService.createField(userId, data, currentUser);
	res.status(httpStatus.OK).json(result);
});

export default {
	getFieldById,
	updateFieldById,
	deleteField,
	getAllFields,
	createField,
};
