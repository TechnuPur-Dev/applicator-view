import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import viewService from './table-view-service';
import { ViewTable } from '@prisma/client';

const createView = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const data = req.body; // Destructure body
	const result = await viewService.createView(data, userId);
	res.status(httpStatus.CREATED).json(result);
});
// get all Views
const getAllViews = catchAsync(async (req: Request, res: Response) => {
	const tableName = req.params.tableName as ViewTable;
	const userId = req.payload.id;
	const userData = await viewService.getAllViews(userId, tableName);
	res.status(httpStatus.OK).json({ result: userData });
});
const getViewById = catchAsync(async (req: Request, res: Response) => {
	const id = +req.params.viewId;
	const result = await viewService.getViewById(id);
	res.status(httpStatus.OK).json(result);
});

// controller to delete view by ID
const deleteView = catchAsync(async (req: Request, res: Response) => {
	const viewId = +req.params.viewId;
	// const createdById = +req.payload.id
	await viewService.deleteView(viewId);
	res.status(httpStatus.OK).json({
		message: 'View deleted successfully.',
	});
});

// // controler to update View
const updateView = catchAsync(async (req: Request, res: Response) => {
	const viewId = +req.params.viewId;
	// const updatedById = req.payload.id;
	const data = req.body;
	const result = await viewService.updateView(viewId, data);
	res.status(httpStatus.OK).json(result);
});
export default {
	createView,
	getAllViews,
	getViewById,
	deleteView,
	updateView,
};
