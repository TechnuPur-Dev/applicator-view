import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { UpdateUser, UpdateStatus } from './user-types';
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
				'Error while uploading profile image.',
			);
		}
	}
};

// to update user profile
const updateProfile = async (data: UpdateUser, userId: number) => {
	try {
		const udpatedUser = await prisma.user.update({
			where: {
				id: userId,
			},
			data,
		});
		return udpatedUser;
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while updating user profile.',
			);
		}
	}
};

// service for user
const getUserByID = async (userId: number) => {
	try {
		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
			omit: {
				password: true,
			},
		});
		// Check if user is null
		if (!user) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'A user with this id does not exist.',
			);
		}
		return user;
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			// Handle generic errors or unexpected errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retrieving user with this id.',
			);
		}
	}
};

// to delete Use
const deleteUser = async (userId: number) => {
	try {
		await prisma.user.delete({
			where: {
				id: userId,
			},
		});

		return {
			message: 'User deleted successfully.',
		};
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.CONFLICT,
				'Errror while deleting user.',
			);
		}
	}
};

// get user List
const getAllUsers = async () => {
	try {
		const users = await prisma.user.findMany(); // Fetch all users
		return users;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving all users.',
			);
		}
	}
};

// getUserByEmail
const getGrowerByEmail = async (userEmail: string) => {
	try {
		const grower = await prisma.user.findFirst({
			where: {
				email: {
					equals: userEmail,
					mode: 'insensitive',
				},
				role: 'GROWER',
			},
			omit: {
				password: true,
			},
		});
		if (!grower) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Grower with this email not found.',
			);
		}

		return grower;
	} catch (error) {
		if (error instanceof ApiError) {
			// Handle generic errors or unexpected errors
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			// Handle generic errors or unexpected errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving grower.',
			);
		}
	}
};

// create grower
const createGrower = async (data: UpdateUser, userId: number) => {
	try {
		const { firstName, lastName } = data;

		const [grower] = await prisma.$transaction(async (prisma) => {
			const grower = await prisma.user.create({
				data: {
					...data,
					fullName: `${firstName} ${lastName}`,
					role: 'GROWER',
				},
			});

			await prisma.applicatorGrower.create({
				data: {
					applicatorId: userId,
					growerId: grower.id,
					growerFirstName: firstName,
					growerLastName: lastName,
				},
			});

			return [grower];
		});

		return grower;
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
const getAllGrowersByApplicator = async (applicatorId: number) => {
	try {
		const growers = await prisma.applicatorGrower.findMany({
			where: {
				applicatorId,
			},
			select: {
				growerFirstName: true,
				growerLastName: true,
				inviteStatus: true,
				isArchived: true,
				grower: {
					include: {
						farms: {
							include: {
								fields: true,
							},
						},
					},
					omit: {
						password: true,
					},
				}, // Include related grower data
			},
		}); // Fetch all users
		return growers;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Error while retrieving growers.',
			);
		}
	}
};

const updateInviteStatus = async (data: UpdateStatus) => {
	try {
		// Destructure
		const { status, applicatorId, growerId } = data;
		if (status === 'PENDING') {
			// Update the inviteStatus field
			await prisma.applicatorGrower.update({
				where: {
					applicatorId_growerId: {
						applicatorId,
						growerId,
					},
				},
				data: {
					inviteStatus: status, // Only updating the inviteStatus field
				},
			});
			return {
				message: 'Invite sent successfully.',
			};
		}
		if (status === 'ACCEPTED') {
			// Update the inviteStatus field
			await prisma.applicatorGrower.update({
				where: {
					applicatorId_growerId: {
						applicatorId,
						growerId,
					},
				},
				data: {
					inviteStatus: status, // Only updating the inviteStatus field
				},
			});
			return {
				message: 'Invite accepted successfully.',
			};
		}
		if (status === 'REJECTED') {
			// Update the inviteStatus field
			await prisma.applicatorGrower.update({
				where: {
					applicatorId_growerId: {
						applicatorId,
						growerId,
					},
				},
				data: {
					inviteStatus: status, // Only updating the inviteStatus field
				},
			});
			return {
				message: 'Invite rejected successfully.',
			};
		}
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
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};
// delete grower

const deleteGrower = async (growerId: number, applicatorId: number) => {
	try {
		await prisma.applicatorGrower.delete({
			where: {
				applicatorId_growerId: {
					growerId,
					applicatorId,
				},
			},
		});

		return {
			message: 'Grower deleted successfully',
		};
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while deleting grower.',
			);
		}
	}
};

const getPendingInvites = async (userId: number) => {
	try {
		const pendingInvites = await prisma.applicatorGrower.findMany({
			where: {
				OR: [{ applicatorId: userId }, { growerId: userId }],
				inviteStatus: 'PENDING',
			},
			include: {
				grower: {
					omit: {
						password: true,
					},
				},
				applicator: {
					omit: {
						password: true,
					},
				},
			},
		});

		return pendingInvites;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors or unexpected error
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retrieving pending invites.',
			);
		}
	}
};
export default {
	uploadProfileImage,
	updateProfile,
	getUserByID,
	deleteUser,
	getAllUsers,
	getGrowerByEmail,
	createGrower,
	getAllGrowersByApplicator,
	updateInviteStatus,
	getPendingInvites,
	deleteGrower,
};
