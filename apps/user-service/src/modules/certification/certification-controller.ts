import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import certificationService from './certification-service';

const createCertification = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const data = req.body;

	const certification = await certificationService.createCertification(
		currentUser.id,
		data,
	);
	res.status(httpStatus.CREATED).json(certification);
});

const getAllCertifications = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const certifications = await certificationService.getAllCertifications(
		currentUser.id,
	);
	res.status(httpStatus.OK).json(certifications);
});

const getCertificationById = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = parseInt(req.params.id);
	const certification = await certificationService.getCertificationById(
		currentUser.id,
		id,
	);
	res.status(httpStatus.OK).json(certification);
});

const updateCertification = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = parseInt(req.params.id);
	const updated = await certificationService.updateCertification(
		currentUser.id,
		id,
		req.body,
	);
	res.status(httpStatus.OK).json(updated);
});

const deleteCertification = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = parseInt(req.params.id);
	const result = await certificationService.deleteCertification(
		currentUser.id,
		id,
	);
	res.status(httpStatus.OK).json(result);
});

const getCertificationTypes = catchAsync(
	async (_req: Request, res: Response) => {
		const result = await certificationService.getCertificationTypes();
		res.status(httpStatus.OK).json(result);
	},
);

const uploadCertification = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const files = req.files;
	if (!files || !Array.isArray(files)) {
		throw new Error('No files uploaded');
	}

	if (!files) {
		return res.status(400).json({ error: 'File is required.' });
	}
	const result = await certificationService.uploadCertification(
		userId,
		files,
	);
	res.status(httpStatus.OK).json({
		message: 'Certification uploaded successfully',
		result,
	});
});

export default {
	createCertification,
	getAllCertifications,
	getCertificationById,
	updateCertification,
	deleteCertification,
	getCertificationTypes,
	uploadCertification,
};
