import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';

import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { CreateFarmParams, AssignFarmPermission } from './farm-types';
import { PaginateOptions, User } from './../../../../../shared/types/global';
import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
import { sendEmail } from '../../../../../shared/helpers/node-mailer';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // Adjust based on Azure SDK usage
import config from '../../../../../shared/config/env-config';
// import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const createFarm = async (
	user: User,
	growerId: number,
	data: CreateFarmParams,
) => {
	const { role, id: userId } = user;

	const farmData = {
		...data,
		createdById: userId,
		growerId,
	};

	if (role === 'GROWER') {
		return prisma.farm.create({
			data: {
				...data,
				createdById: userId,
				growerId: userId,
			},
			include: {
				state: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});
	}

	if (role === 'APPLICATOR') {
		const grower = await prisma.applicatorGrower.findUnique({
			where: {
				applicatorId_growerId: {
					applicatorId: userId,
					growerId,
				},
				inviteStatus: 'ACCEPTED',
			},
			select: { canManageFarms: true },
		});

		if (!grower?.canManageFarms) {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'You are not authorized to add a farm for this grower.',
			);
		}

		return prisma.farm.create({
			data: {
				...farmData,
				permissions: {
					create: {
						applicatorId: userId,
						canView: true,
						canEdit: true,
					},
				},
			},
			include: {
				state: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});
	}

	throw new ApiError(httpStatus.FORBIDDEN, 'Invalid user role.');
};

const getAllFarmsByGrower = async (
	growerId: number,
	options: PaginateOptions,
) => {
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

	const farms = await prisma.farm.findMany({
		where: {
			growerId,
		},
		include: {
			fields: true, // Include related fields in the result
			permissions: {
				include: {
					applicator: {
						select: {
							id: true,
							profileImage: true,
							thumbnailProfileImage: true,
							firstName: true,
							lastName: true,
							fullName: true,
						},
					},
				},
			},
			state: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
		skip,
		take: limit,
	}); // Fetch all users
	// Calculate total acres for each grower and each farm
	const enrichedFarms = farms.map((farm) => {
		const totalAcresByFarm = farm.fields.reduce((totalFarmAcres, field) => {
			return totalFarmAcres + parseFloat(field.acres?.toString() || '0');
		}, 0);

		// Add total acres to the grower object
		return {
			...farm,
			totalAcres: totalAcresByFarm,
		};
	});

	const totalResults = await prisma.farm.count({
		where: {
			growerId,
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: enrichedFarms,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getFarmById = async (Id: number) => {
	const farm = await prisma.farm.findUnique({
		where: {
			id: Id,
		},
		include: {
			fields: true, // Include related fields in the result
			state: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});
	console.log(farm, 'farm');
	if (!farm) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Farm with this ID not found.',
		);
	}
	return farm;
};

const deleteFarm = async (id: number, user: User) => {
	const { role, id: userId } = user;

	if (role === 'GROWER') {
		await prisma.farm.delete({
			where: {
				id,
				growerId: userId,
			},
		});
	}

	// If user is APPLICATOR, check if they have edit permission
	else if (role === 'APPLICATOR') {
		const farm = await prisma.farm.findUnique({
			where: {
				id,
			},
			include: {
				permissions: {
					select: {
						canEdit: true,
						canView: true,
					},
				},
			},
		});
		// Check if the farm exists

		if (!farm) {
			throw new ApiError(httpStatus.NOT_FOUND, 'Farm not found');
		}
		const hasEditPermission = farm?.permissions.some(
			(permission) => permission.canEdit,
		);
		if (hasEditPermission) {
			await prisma.farm.delete({
				where: { id },
			});
		} else {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'You do not have permission to delete this farm',
			);
		}
	}

	return {
		message: 'Farm deleted successfully.',
	};
};
const updateFarm = async (
	user: User,
	farmId: number,
	data: CreateFarmParams,
) => {
	// Validate farm existence
	const { role, id: userId } = user;

	if (role === 'GROWER') {
		// Update farm
		const updatedFarm = await prisma.farm.update({
			where: { id: farmId, growerId: userId },
			data,
			include: {
				state: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});
		return updatedFarm;
	}
	// If user is APPLICATOR, check if they have atleast one edit permission because permissions is an array
	else if (role === 'APPLICATOR') {
		const farm = await prisma.farm.findUnique({
			where: {
				id: farmId,
			},
			include: {
				// If user is APPLICATOR, check if they have permission because permissions is an array
				permissions: {
					where: {
						applicatorId: userId,
					},
					select: {
						canEdit: true,
						canView: true,
					},
				},
			},
		});
		// Check if the farm exists

		if (!farm) {
			throw new ApiError(httpStatus.NOT_FOUND, 'Farm not found');
		}
		const hasEditPermission = farm?.permissions.some(
			(permission) => permission.canEdit,
		);

		if (hasEditPermission) {
			// Update farm
			const updatedFarm = await prisma.farm.update({
				where: { id: farmId },
				data,
				include: {
					state: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			});
			return updatedFarm;
		} else {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'You do not have permission to update this farm',
			);
		}
	}
};

const assignFarmPermission = async (user: User, data: AssignFarmPermission) => {
	const { id: userId } = user;
	const { farmId, applicatorId, canView, canEdit } = data;

	// Validate farm existence
	const farm = await prisma.farm.findUnique({
		where: { id: farmId, growerId: userId },
		select: { id: true },
	});
	if (!farm) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized or the farm does not exist.',
		);
	}
	// Update farm
	const permission = await prisma.farmPermission.create({
		data: { farmId, applicatorId, canView, canEdit },
	});

	return permission;
};
const updateFarmPermission = async (
	user: User,
	permissionId: number,
	data: AssignFarmPermission,
) => {
	const { canEdit, canView } = data;
	const { id: userId } = user;
	// Validate farm existence
	const permission = await prisma.farmPermission.findUnique({
		where: { id: permissionId },
		select: {
			farm: {
				select: {
					growerId: true,
				},
			},
		},
	});
	if (permission?.farm?.growerId !== userId) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized to perform this action.',
		);
	}
	// Update farm
	const updatedPermission = await prisma.farmPermission.update({
		where: { id: permissionId },
		data: {
			canEdit,
			canView,
		},
	});

	return updatedPermission;
};
const deleteFarmPermission = async (user: User, permissionId: number) => {
	const { id: userId } = user;
	// Validate farm existence
	const permission = await prisma.farmPermission.findUnique({
		where: { id: permissionId },
		select: {
			farm: {
				select: {
					growerId: true,
				},
			},
		},
	});
	if (permission?.farm?.growerId !== userId) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized to perform this action.',
		);
	}
	// Update farm
	await prisma.farmPermission.delete({
		where: { id: permissionId },
	});

	return {
		message: 'Farm permission deleted successfully.',
	};
};
const askFarmPermission = async (email: string) => {
	console.log(email, 'req.body');

	const isEmailExist = await prisma.user.findFirst({
		where: {
			email: {
				equals: email,
				mode: 'insensitive',
			},
			profileStatus: 'COMPLETE',
		},
		select: {
			id: true, // Omit password from the response to prevent exposing it to clients
		},
	});

	if (!isEmailExist) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'An account with this email not exists.',
		);
	}

	const subject = 'Request For Farm Permissions';
	const message = `
		You have received a request for farm access permissions.<br><br>
		To grant access, please review and approve the request.<br><br>
		If you did not initiate this request, please ignore this email.<br><br>
		Thank you.
	  `;
	const html = await mailHtmlTemplate(subject, message);
	await sendEmail({
		emailTo: email,
		subject,
		text: 'Request Verification',
		html,
	});
	return {
		message:
			'Request email for permission has been sent to the user Succesfully',
	};
};
const uploadFarmImage = async (
	userId: number,
	type: string,
	fileBuffer: Buffer,
) => {
	const storageUrl = config.azureStorageUrl;
	const containerName = config.azureContainerName;

	const blobServiceClient =
		BlobServiceClient.fromConnectionString(storageUrl);
	const containerClient: ContainerClient =
		blobServiceClient.getContainerClient(containerName);

	// Generate a unique blob name
	const blobName = `${type}/${uuidv4()}`;

	// Upload the file buffer to Azure Blob Storage
	const blockBlobClient = containerClient.getBlockBlobClient(blobName);
	await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
		blobHTTPHeaders: {
			blobContentType: 'image/webp', // Adjust based on file type
		},
	});

	return {
		imageUrl: `/${containerName}/${blobName}`,
	};
};
export default {
	createFarm,
	getAllFarmsByGrower,
	getFarmById,
	deleteFarm,
	updateFarm,
	assignFarmPermission,
	updateFarmPermission,
	deleteFarmPermission,
	askFarmPermission,
	uploadFarmImage,
};
