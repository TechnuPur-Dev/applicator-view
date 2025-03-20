import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';

import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { CreateFarmParams } from './farm-types';
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
const getFarmById = async (user: User, id: number) => {
	const farm = await prisma.farm.findUnique({
		where: {
			id,
			growerId: user.id,
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
	});

	if (!farm) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Farm with this ID not found.',
		);
	}

	const totalAcresByFarm = farm.fields.reduce((total, field) => {
		return total + parseFloat(field.acres?.toString() || '0');
	}, 0);

	return {
		...farm,
		totalAcres: totalAcresByFarm, // Keep totalAcres
	};
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

const assignFarmPermissions = async (
	user: User,
	data: {
		farmId: number;
		applicatorId: number;
		canView: boolean;
		canEdit: boolean;
	}[],
) => {
	const { id: userId } = user;

	// Validate farm existence (ensure the grower owns the farm)
	const farm = await prisma.farm.findUnique({
		where: { id: data[0].farmId, growerId: userId }, // Assuming all records have the same `farmId`
		select: { id: true },
	});

	if (!farm) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized or the farm does not exist.',
		);
	}

	// Insert multiple records at once
	const permissions = await prisma.farmPermission.createMany({
		data,
		skipDuplicates: true, // Prevents duplicate records if they exist
	});

	return permissions;
};

const updateFarmPermissions = async (
	user: User,
	permissions: { permissionId: number; canView: boolean; canEdit: boolean }[],
) => {
	const { id: userId } = user;

	// Validate farm existence and authorization for each permission
	const permissionChecks = await prisma.farmPermission.findMany({
		where: {
			id: { in: permissions.map((p) => p.permissionId) },
		},
		select: {
			id: true,
			farm: {
				select: {
					growerId: true,
				},
			},
		},
	});

	const unauthorized = permissionChecks.some(
		(perm) => perm.farm?.growerId !== userId,
	);

	if (unauthorized) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized to perform this action.',
		);
	}

	// Update permissions
	const updatePromises = permissions.map(
		({ permissionId, canView, canEdit }) =>
			prisma.farmPermission.update({
				where: { id: permissionId },
				data: { canView, canEdit },
			}),
	);

	const updatedPermissions = await Promise.all(updatePromises);

	return updatedPermissions;
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
const askFarmPermission = async (
	currentUser: User,
	growerId: number,

	farmPermission: {
		farmId: number;
		canView: boolean;
		canEdit: boolean;
	}[],
) => {
	const { id: applicatorId, role } = currentUser;

	if (role !== 'APPLICATOR')
		return 'You are not allowed to perform this action.';
	const grower = await prisma.user.findUnique({
		where: { id: growerId, role: 'GROWER' },
	});
	if (!grower) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Grower with email not found.',
		);
	}

	const existingInvite = await prisma.applicatorGrower.findUnique({
		where: {
			applicatorId_growerId: {
				growerId: growerId,
				applicatorId: applicatorId,
			},
		},
	});
	await prisma.$transaction(async (tx) => {
		if (existingInvite) {
			let pendingPermission =
				await prisma.pendingFarmPermission.findFirst({
					where: { inviteId: existingInvite.id },
				});
			if (pendingPermission) {
				await tx.pendingFarmPermission.deleteMany({
					where: { inviteId: existingInvite.id },
				});
			}

			await tx.pendingFarmPermission.createMany({
				data: farmPermission.map((farm) => ({
					farmId: farm.farmId,
					inviteId: existingInvite.id,
					canView: farm.canView,
					canEdit: farm.canEdit,
				})),
			});
		} else {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'An active invitation not found',
			);
		}
	});
	return {
		message: 'Permissions request sent successfully.',
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

const getAllFarms = async (growerId: number, options: PaginateOptions) => {
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
		select: {
			id: true,
			name: true,
			isActive: true,
			fields: {
				select: {
					acres: true,
				},
			}, // Include related fields in the result
			// state: {
			// 	select: {
			// 		id: true,
			// 		name: true,
			// 	},
			// },
		},
		orderBy: {
			createdAt: 'desc',
		},
		skip,
		take: limit,
	}); // Fetch all users
	// Calculate total acres for each grower and each farm
	const enrichedFarms = farms.map((farm) => {
		const totalAcresByFarm = farm.fields.reduce((total, field) => {
			return total + parseFloat(field.acres?.toString() || '0');
		}, 0);

		// Return the farm object without the `fields` property
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { fields, ...farmWithoutFields } = farm;

		return {
			...farmWithoutFields,
			totalAcres: totalAcresByFarm, // Keep totalAcres
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

const handleFarmPermissions = async (
	currentUser: User,
	applicatorId: number,
	action: string,
	pendingFarmPermission: {
		farmId: number;
	}[],
) => {
	const { id: growerId, role } = currentUser;

	if (role !== 'GROWER')
		return {message:'You are not allowed to perform this action.'}

	const applciator = await prisma.user.findUnique({
		where: { id: applicatorId, role: 'APPLICATOR' },
	});
	if (!applciator) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'APPLICATOR with email not found.',
		);
	}

	const existingInvite = await prisma.applicatorGrower.findUnique({
		where: {
			applicatorId_growerId: {
				growerId: growerId,
				applicatorId: applicatorId,
			},
		},
	});

	if (!existingInvite) {
		throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
	}

	let processedCount = 0;

	for (const permission of pendingFarmPermission) {
		const { farmId } = permission;

		const pendingRequest = await prisma.pendingFarmPermission.findUnique({
			where: {
				farmId_inviteId: {
					farmId,
					inviteId: existingInvite.id,
				},
			},
		});

		if (!pendingRequest) {
			continue;
		}

		if (action === 'ACCEPTED') {
			await prisma.farmPermission.create({
				data: {
					farmId,
					applicatorId: existingInvite.id,
					canView: pendingRequest.canView,
					canEdit: pendingRequest.canEdit,
				},
			});
		}

		await prisma.pendingFarmPermission.delete({
			where: {
				farmId_inviteId: {
					farmId,
					inviteId: existingInvite.id,
				},
			},
		});

		processedCount++;
	}

	if (processedCount === 0) {
		return {
			message: 'No matching pending permissions found to process.',
		};
	}

	return {
		message: `Permissions ${action.toLowerCase()} successfully.`,
	};
};

export default {
	createFarm,
	getAllFarmsByGrower,
	getFarmById,
	deleteFarm,
	updateFarm,
	assignFarmPermissions,
	updateFarmPermissions,
	deleteFarmPermission,
	askFarmPermission,
	uploadFarmImage,
	getAllFarms,
	handleFarmPermissions,
};
