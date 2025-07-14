import httpStatus from 'http-status';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { EquipmentType } from '@prisma/client';
import { CreateData } from './warranty-registration-types';
import ApiError from '../../../../../shared/utils/api-error';
import { PaginateOptions, User } from './../../../../../shared/types/global';
import { getUploader } from '../../../../../shared/helpers/uploaderFactory';

const getAllEquipmentType = async () => {
	const ticketCategoryList = Object.values(EquipmentType).map(
		(equipmentType, index) => ({
			id: index + 1,
			name: equipmentType,
		}),
	);
	return ticketCategoryList;
};

const uploadImage = async (
	userId: number,
	files: Express.Multer.File[],
): Promise<string[]> => {
	const uploader = getUploader();
	const uploads = await Promise.all(
		files.map(async (file) => {
			const blobKey = `equipments/${userId}/${uuidv4()}_${file.originalname}`;

			// Get image dimensions for cropping
			const metadata = await sharp(file.buffer).metadata();
			const width = metadata.width || 0;
			const height = metadata.height || 0;
			const size = Math.min(width, height);
			const left = Math.floor((width - size) / 2);
			const top = Math.floor((height - size) / 2);

			// Process the image: crop to square
			const imageBuffer = await sharp(file.buffer)
				.extract({ left, top, width: size, height: size })
				.resize(size, size)
				.toBuffer();

			const uploadObjects = [
				{
					Key: blobKey,
					Body: imageBuffer,
					ContentType: file.mimetype,
				},
			];

			// // Upload using helper
			// const res = await uploadToAzure(uploadObjects);
			const res = await uploader(uploadObjects);

			return res[0];
		}),
	);

	return uploads;
};

const uploadDocAttachments = async (
	userId: number,
	files: Express.Multer.File[],
): Promise<string[]> => {
	const uploader = getUploader();
	const uploadObjects = files.map((file) => ({
		Key: `equipments/${userId}/${uuidv4()}_${file.originalname}`,
		Body: file.buffer,
		ContentType: file.mimetype,
	}));

	// const res = await uploadToAzure(uploadObjects);
	const res = await uploader(uploadObjects);

	return res; // e.g. ["/containerName/equipments/123/file.pdf"]
};

const createWarrantyReg = async (createdById: number, data: CreateData) => {
	const existingEquipment = await prisma.warrantyRegistration.findFirst({
		where: { serialNumber: data.serialNumber },
	});

	if (existingEquipment) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'Serial number already exists, please use a unique serial number.',
		);
	}
	const result = await prisma.warrantyRegistration.create({
		data: {
			imageUrl: data.imageUrl,
			serialNumber: data.serialNumber,
			equipmentType: data.equipmentType,
			isRegistered: data.isRegistered,
			documentUrl: data.documentUrl,
			warrantyExpiration: data.warrantyExpiration,
			createdById: createdById, // Assign the user ID
		},
	});

	return result;
};

const getAllWarrantyRegList = async (user: User, options: PaginateOptions) => {
	// Set the limit of users to be returned per page, default to 10 if not specified or invalid
	const limit =
		options.limit && parseInt(options.limit, 10) > 0
			? parseInt(options.limit, 10)
			: 10;
	// Set the page number, default to 1 if not specified or invalid
	const page =
		options.page && parseInt(options.page, 10) > 0
			? parseInt(options.page, 10)
			: 1;
	// Calculate the number of users to skip based on the current page and limit
	const skip = (page - 1) * limit;
	const result = await prisma.warrantyRegistration.findMany({
		where: { createdById: user.id },
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	const totalResults = await prisma.warrantyRegistration.count({
		where: { createdById: user.id },
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: result,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getWarrantyRegById = async (user: User, id: number) => {
	const result = await prisma.warrantyRegistration.findUnique({
		where: {
			id,
			createdById: user.id,
		},
	});
	return result;
};
const updateWarrantyReg = async (user: User, id: number, data: CreateData) => {
	const result = await prisma.warrantyRegistration.update({
		where: { id, createdById: user.id },
		data: {
			...data,
		},
	});

	return result;
};

const deleteWarrantyReg = async (user: User, id: number) => {
	const result = await prisma.warrantyRegistration.delete({
		where: { id, createdById: user.id },
	});

	return result;
};
export default {
	getAllEquipmentType,
	uploadImage,
	uploadDocAttachments,
	createWarrantyReg,
	getAllWarrantyRegList,
	getWarrantyRegById,
	updateWarrantyReg,
	deleteWarrantyReg,
};
