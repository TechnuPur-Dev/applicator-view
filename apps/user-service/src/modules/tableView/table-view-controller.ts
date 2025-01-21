import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import viewService from './table-view-service';


const createView = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const data = req.body; // Destructure body
	const result = await viewService.createView(data,userId);
	res.status(httpStatus.OK).json({
		result,
		message: 'View created successfully.',
	});
});
// get all Views
const getAllViews = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const userData = await viewService.getAllViews(userId);
	res.status(httpStatus.OK).json({ result: userData });
});
const getViewById = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.viewId;
	const result = await viewService.getViewById(Id);
	res.status(httpStatus.OK).json(result);
});

// controller to delete view by ID
const deleteView = catchAsync(async (req: Request, res: Response) => {
	const ViewId = +req.params.viewId;
	// const createdById = +req.payload.id
	 await viewService.deleteView(ViewId);
	res.status(httpStatus.OK).json({
		message:"view deleted successfully"
	});
});

// // controler to update View
const updateView = catchAsync(async (req: Request, res: Response) => {
	const ViewID = +req.params.viewId;
	// const updatedById = req.payload.id;
	const data = req.body;

	const result = await viewService.updateView(ViewID, data,);
	res.status(httpStatus.OK).json({
		result,
		message: 'View Updated successfully',
	});
});
export default {
	createView,
	getAllViews,
	getViewById,
	deleteView,
	updateView,
};
