import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import warrantyRegistrationService from './warranty-registration-service';
import pick from '../../../../../shared/utils/pick';

const getAllEquipmentType = catchAsync(async (req: Request, res: Response) => {
	const result = await warrantyRegistrationService.getAllEquipmentType();
	res.status(httpStatus.OK).json(result);
});

const uploadImage = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const files = req.files;

	if (!files || !Array.isArray(files)) {
		throw new Error('No files uploaded');
	}

	if (!files) {
		return res.status(400).json({ error: 'File is required.' });
	}
	const result = await warrantyRegistrationService.uploadImage(userId, files);
	res.status(httpStatus.OK).json({
		message: 'Images uploaded successfully',
		result,
	});
});

const uploadDocAttachments = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const files = req.files;

	if (!files || !Array.isArray(files)) {
		throw new Error('No files uploaded');
	}

	if (!files) {
		return res.status(400).json({ error: 'File is required.' });
	}
	const result = await warrantyRegistrationService.uploadDocAttachments(
		userId,
		files,
	);
	res.status(httpStatus.OK).json({
		message: 'Documents uploaded successfully',
		result,
	});
});

const createWarrantyReg = catchAsync(async (req: Request, res: Response) => {
	const createdById = req.payload.id;
	const data = req.body;
	const result = await warrantyRegistrationService.createWarrantyReg(
		createdById,
		data,
	);
	res.status(httpStatus.CREATED).json(result);
});
const getAllWarrantyRegList = catchAsync(
	async (req: Request, res: Response) => {
		const options = pick(req.query, ['limit', 'page']);
		const currentUser = req.user;
		const result = await warrantyRegistrationService.getAllWarrantyRegList(
			currentUser,
			options,
		);
		res.status(httpStatus.OK).json(result);
	},
);
const getWarrantyRegById = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = +req.params.id;
	const result = await warrantyRegistrationService.getWarrantyRegById(
		currentUser,
		id,
	);
	res.status(httpStatus.OK).json(result);
});
const updateWarrantyReg = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = +req.params.id;
	const data = req.body;
	const result = await warrantyRegistrationService.updateWarrantyReg(
		currentUser,
		id,
		data,
	);
	res.status(httpStatus.OK).json(result);
});
const deleteWarrantyReg = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = +req.params.id;
	await warrantyRegistrationService.deleteWarrantyReg(currentUser, id);
	res.status(httpStatus.OK).json({ message: 'Delete successfully.' });
});
export default {
	getAllEquipmentType,
	uploadDocAttachments,
	uploadImage,
	createWarrantyReg,
	getAllWarrantyRegList,
	getWarrantyRegById,
	updateWarrantyReg,
	deleteWarrantyReg,
};
