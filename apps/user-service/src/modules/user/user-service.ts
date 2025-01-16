import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { UpdateUser } from './user-types';
import config from '../../../../../shared/config/env-config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // Adjust based on Azure SDK usage

const uploadProfileImage = async (file: Express.Multer.File) => {
	try {
		const storageUrl = config.azureStorageUrl;
		const containerName = config.azureContainerName;

		const blobServiceClient =
			BlobServiceClient.fromConnectionString(storageUrl);
		const containerClient: ContainerClient =
			blobServiceClient.getContainerClient(containerName);
		// Generate unique blob names
		const blobName = `users/profiles/${uuidv4()}_${file.originalname}`;
		const thumbnailBlobName = `users/profiles/thumbnail_${uuidv4()}_${file.originalname}`;

		// Get original image dimensions
		const imageMetadata = await sharp(file.buffer).metadata();
		const originalWidth = imageMetadata.width || 0;
		const originalHeight = imageMetadata.height || 0;
		const thumbnailSize = Math.min(originalWidth, originalHeight);
		const left = Math.floor((originalWidth - thumbnailSize) / 2);
		const top = Math.floor((originalHeight - thumbnailSize) / 2);

		// Create and upload the original image
		const compressedImageBuffer = await sharp(file.buffer)
			.extract({ left, top, width: thumbnailSize, height: thumbnailSize })
			.resize({
				width: thumbnailSize,
				height: thumbnailSize,
				fit: 'cover',
			})
			.toBuffer();

		const blockBlobClient = containerClient.getBlockBlobClient(blobName);
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
			.extract({ left, top, width: thumbnailSize, height: thumbnailSize })
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

		return {
			profileImage: `/${containerName}/${blobName}`,
			thumbnailProfileImage: `/${containerName}/${thumbnailBlobName}`,
		};
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors or unexpected errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error uploading profile image.',
			);
		}
	}
};

// service for user
const getUserByID = async (userId: string) => {
	try {
		const user = await prisma.user.findUnique({
			where: {
				id: parseInt(userId),
			},
			include: {
				applicators: true,
			},
		});

		return user;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A user with this id does not exist.',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors or unexpected errors
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
		}
	}
};

// to update user
const updateUserById = async (data: UpdateUser, userId: string) => {
	// Only accept the fields sent by the frontend
	const dataToUpdate = data;
	try {
		await prisma.user.update({
			where: {
				id: Number(userId),
			},

			data: {
				// update only those value which are send by the frontend and the values that are not sended by the frontend will remain the same
				...dataToUpdate,
			},
		});

		return {
			status: httpStatus.OK, // 200
			message: 'User updated successfully',
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2002') {
				throw new ApiError(
					httpStatus.CONFLICT,
					'A user with this email already exists.',
				);
			}
			// it depends on one or more records that were required but not found.
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A user with this id does not exist.',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

// to delete User

const deleteUser = async (userId: string) => {
	try {
		await prisma.user.delete({
			where: {
				id: parseInt(userId),
			},
		});

		return {
			status: httpStatus.NO_CONTENT, // 204
			message: 'User deleted successfully',
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A user to delete with this id not exist',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
		}
	}
};

// get user List
const getUserList = async () => {
	try {
		const users = await prisma.user.findMany(); // Fetch all users
		return users;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.NOT_FOUND, 'some thing went wrong');
		}
	}
};

// getUserByEmail
const getUserByEmail = async (userEmail: string) => {
	try {
		const user = await prisma.user.findUnique({
			where: {
				email: userEmail,
				role: 'GROWER',
			},
			// Ensure the user has the 'GROWER' role
		});

		return user || null;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A user with this email does not exist.',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors or unexpected errors
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
		}
	}
};

// create grower
const createGrower = async (data: UpdateUser, userId: number) => {
	// Only accept the fields sent by the frontend
	try {
		const {
			firstName,
			lastName,
			email,
			phoneNumber,
			businessName,
			experience,
			address1,
			address2,
			state,
			county,
			township,
			zipCode,
			bio,
			additionalInfo,
		} = data;

		// to extract applicator data for applcatorGrower model
		const applicator = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});
		const grower = await prisma.user.create({
			data: {
				firstName,
				lastName,
				fullName: `${firstName} ${lastName}`,
				email,
				phoneNumber,
				businessName,
				experience,
				address1,
				address2,
				state,
				county,
				township,
				zipCode,
				bio,
				additionalInfo,
				role: 'GROWER',
			},
			omit: {
				password: true, // Omit password from the response to prevent exposing it to clients
			},
		});

		await prisma.applcatorGrower.create({
			data: {
				applicatorId: userId,
				growerId: grower.id,
				applicatorFirstName: applicator?.firstName,
				applicatorLastName: applicator?.lastName,
				growerFirstName: grower.firstName,
				growerLastName: grower.lastName,
				inviteStatus: 'NOT_SENT',
				isArchived: false,
				// Optionally set other fields like inviteStatus, isArchived
			},
		});

		return { grower, message: 'Grower successfully added.' };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2002') {
				throw new ApiError(
					httpStatus.CONFLICT,
					'A user with this email already exists.',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};
// get All Growers
const getAllGrowers = async () => {
	try {
		const users = await prisma.applcatorGrower.findMany({
			// where: {
			// 	isArchived: false, // You can filter out archived records if needed
			//   },
			include: {
				grower: {
					select: {
						id: true,
						profileImage: true,
						thumbnailProfileImage: true,
						firstName: true,
						lastName: true,
						fullName: true,
						email: true,
						phoneNumber: true,
						role: true,
						businessName: true,
						experience: true,
						address1: true,
						address2: true,
						state: true,
						county: true,
						township: true,
						zipCode: true,
						bio: true,
						additionalInfo: true,
						// No password field included here
					},
				}, // Include related grower data
			},
		}); // Fetch all users
		return users || [];
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.NOT_FOUND, 'some thing went wrong');
		}
	}
};

// delete grower

const deleteGrower = async (growerId: number, applicatorId: number) => {
	try {
		const result = await prisma.applcatorGrower.deleteMany({
			where: {
				growerId: growerId,
				applicatorId: applicatorId,
			},
		});
		// if grower id is not found
		if (result.count === 0) {
			return {
				status: httpStatus.NOT_FOUND, // 204
				message: 'Grower not found ',
			};
		}
		return {
			status: httpStatus.NO_CONTENT, // 204
			message: 'Grower deleted successfully',
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A grower with this ID and applicator ID does not exist',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
		}
	}
};

export default {
	uploadProfileImage,
	getUserByID,
	deleteUser,
	updateUserById,
	getUserList,
	getUserByEmail,
	createGrower,
	getAllGrowers,
	deleteGrower,
};
