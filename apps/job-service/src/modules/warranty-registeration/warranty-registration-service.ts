import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import config from '../../../../../shared/config/env-config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { EquipmentType } from '@prisma/client';
import { CreateData } from './warranty-registration-types';
import ApiError from '../../../../../shared/utils/api-error';
import { PaginateOptions, User } from './../../../../../shared/types/global';

const getAllEquipmentType = async () => {
	const ticketCategoryList = Object.values(EquipmentType).map(
		(equipmentType, index) => ({
			id: index + 1,
			name: equipmentType,
		}),
	);
	return ticketCategoryList;
};
const uploadImage = async (userId: number, files: Express.Multer.File[]) => {
	const storageUrl = config.azureStorageUrl;
	const containerName = config.azureContainerName;

	const blobServiceClient =
		BlobServiceClient.fromConnectionString(storageUrl);
	const containerClient: ContainerClient =
		blobServiceClient.getContainerClient(containerName);
	const uploadedFiles = await Promise.all(
		files.map(async (file) => {
			// Generate unique blob names
			const blobName = `equipments/${userId}/${uuidv4()}_${file.originalname}`;
			const thumbnailBlobName = `equipments/${userId}/thumbnail_${uuidv4()}_${file.originalname}`;

			// Get original image dimensions
			const imageMetadata = await sharp(file.buffer).metadata();
			const originalWidth = imageMetadata.width || 0;
			const originalHeight = imageMetadata.height || 0;
			const thumbnailSize = Math.min(originalWidth, originalHeight);
			const left = Math.floor((originalWidth - thumbnailSize) / 2);
			const top = Math.floor((originalHeight - thumbnailSize) / 2);

			// Create and upload the original image
			const compressedImageBuffer = await sharp(file.buffer)
				.extract({
					left,
					top,
					width: thumbnailSize,
					height: thumbnailSize,
				})
				.resize({
					width: thumbnailSize,
					height: thumbnailSize,
					fit: 'cover',
				})
				.toBuffer();

			const blockBlobClient =
				containerClient.getBlockBlobClient(blobName);
			await blockBlobClient.upload(
				compressedImageBuffer,
				compressedImageBuffer.length,
				{
					blobHTTPHeaders: {
						blobContentType: file.mimetype,
					},
				},
			);

			// Create and upload the thumbnail
			const thumbnailBuffer = await sharp(file.buffer)
				.extract({
					left,
					top,
					width: thumbnailSize,
					height: thumbnailSize,
				})
				.resize({ width: 50, height: 50, fit: 'cover' })
				.toBuffer();

			const thumbnailBlobClient =
				containerClient.getBlockBlobClient(thumbnailBlobName);
			await thumbnailBlobClient.upload(
				thumbnailBuffer,
				thumbnailBuffer.length,
				{
					blobHTTPHeaders: {
						blobContentType: file.mimetype,
					},
				},
			);

			return `/${containerName}/${blobName}`;
		}),
	);
	return uploadedFiles;
};

// Upload Attatchments
const uploadDocAttachments = async (
	userId: number,
	files: Express.Multer.File[],
) => {
	const storageUrl = config.azureStorageUrl;
	const containerName = config.azureContainerName;

	const blobServiceClient =
		BlobServiceClient.fromConnectionString(storageUrl);
	const containerClient: ContainerClient =
		blobServiceClient.getContainerClient(containerName);
	const uploadedFiles = await Promise.all(
		files.map(async (file) => {
			// Generate unique blob names
			const blobName = `equipments/${userId}/${uuidv4()}_${file.originalname}`;
			// const thumbnailBlobName = `equipments/${userId}/thumbnail_${uuidv4()}_${file.originalname}`;

			// Create and upload the original image

			const blockBlobClient =
				containerClient.getBlockBlobClient(blobName);
			await blockBlobClient.upload(file.buffer, file.buffer.length, {
				blobHTTPHeaders: {
					blobContentType: file.mimetype,
				},
			});

			return `/${containerName}/${blobName}`;
		}),
	);
	return uploadedFiles;
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
