import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import fieldService from './field-service';

// contoroller to get field by ID

const getFieldById = catchAsync(async (req: Request, res: Response) => {
	const fieldId = req.params.id;
	const result = await fieldService.getFieldById(fieldId);
	res.status(httpStatus.OK).json(result);
});

// contoroller to update field by ID
const updateFieldById = catchAsync(async (req: Request, res: Response) => {
	const fieldId = req.params.id;
	const data = req.body;

	const result = await fieldService.updateFieldById(data, fieldId);
	res.status(httpStatus.OK).json(result);
});
// contoroller to get fieldList
const getFieldList = catchAsync(async (req: Request, res: Response) => {
	const fieldData = await fieldService.getFieldList();
	res.status(httpStatus.OK).json({ result: fieldData });
});

// contoroller to delete field by ID
const deleteField = catchAsync(async (req: Request, res: Response) => {
	const fieldId = req.params.id;
	const result = await fieldService.deleteField(fieldId);
	res.status(httpStatus.OK).json(result);
});

const createField = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const result = await fieldService.createField(data);
	res.status(httpStatus.OK).json({ result: result });
});

export default {
	getFieldById,
	updateFieldById,
	deleteField,
	getFieldList,
	createField,
};
