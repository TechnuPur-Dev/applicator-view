/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { Decimal } from '@prisma/client/runtime/library';

import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { CreateFarmParams } from './farm-types';
import { PaginateOptions, User } from './../../../../../shared/types/global';
import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
import { sendEmail } from '../../../../../shared/helpers/node-mailer';
// import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { getUploader } from '../../../../../shared/helpers/uploaderFactory';

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
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.FarmWhereInput = {
		growerId,
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.FarmWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			Object.assign(filters, {
				OR: [
					{
						name: {
							contains: options.searchValue,
							mode: 'insensitive',
						},
					},
					{
						id: parseInt(searchValue, 10),
					},
				],
			});
		} else {
			switch (options.label) {
				case 'id':
					searchFilter.id = parseInt(searchValue, 10);
					break;
				case 'name':
					searchFilter.name = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}
			Object.assign(filters, searchFilter); // Merge filters dynamically
		}
	}
	const farms = await prisma.farm.findMany({
		where: filters,
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
		// Ensure totalFarmAcres is a Decimal to prevent floating-point errors
		const totalAcresByFarm = farm.fields.reduce((totalFarmAcres, field) => {
			return totalFarmAcres.plus(new Decimal(field.acres || 0));
		}, new Decimal(0));

		return {
			...farm,
			totalAcres: totalAcresByFarm.toFixed(2), // Convert back to string with 2 decimal places
		};
	});

	const totalResults = await prisma.farm.count({
		where: filters,
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
	const { role } = user;
	const whereCondition: {
		id: number;
		applicatorId?: number;
		growerId?: number;
		permissions?: {
			some: {
				applicatorId: number;
			};
		};
	} = { id };

	if (role === 'APPLICATOR') {
		whereCondition.permissions = {
			some: {
				applicatorId: user.id,
			},
		};
	} else if (role === 'GROWER') {
		whereCondition.growerId = user.id;
	}

	const farm = await prisma.farm.findUnique({
		where: whereCondition,
		include: {
			fields: {
				orderBy: {
					id: 'desc',
				},
			}, // Include related fields in the result
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
		totalAcres: totalAcresByFarm.toFixed(2), // Keep totalAcres
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
	data: {
		farmId: number;
		canView: boolean;
		canEdit: boolean;
	}[],
) => {
	const { id: applicatorId, role } = currentUser;

	// Check if the user is an applicator
	if (role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'You are not allowed to perform this action.',
		);
	}

	// Check if the applicator has an accepted invitation from the grower
	const existingInvite = await prisma.applicatorGrower.findUnique({
		where: {
			applicatorId_growerId: {
				growerId,
				applicatorId,
			},
		},
		include: {
			grower: {
				select: {
					email: true,
				},
			},
		},
	});

	if (!existingInvite || existingInvite.inviteStatus !== 'ACCEPTED') {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'You are not allowed to perform this action.',
		);
	}

	// Validate that all farmIds belong to the given growerId
	const validFarms = await prisma.farm.findMany({
		where: {
			id: {
				in: data.map((farm) => farm.farmId),
			},
			growerId, // Ensure the farm belongs to the grower
		},
		select: { id: true },
	});

	const validFarmIds = validFarms.map((farm) => farm.id);
	const invalidFarmIds = data
		.map((farm) => farm.farmId)
		.filter((farmId) => !validFarmIds.includes(farmId));

	if (invalidFarmIds.length > 0) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			`Invalid farm IDs: ${invalidFarmIds.join(', ')}. These farms do not belong to the specified grower.`,
		);
	}
	// **Step 1: Filter out farms where `canView` is false**
	const farmsToCheck = data.filter((farm) => !farm.canView);
	const farmsToProcess = data.filter((farm) => farm.canView);

	// **Step 2: Check if these farms exist in `pendingFarmPermission`**
	const existingPermissions = await prisma.pendingFarmPermission.findMany({
		where: {
			farmId: { in: farmsToCheck.map((farm) => farm.farmId) },
			inviteId: existingInvite.id,
		},
		select: { id: true, farmId: true },
	});

	const existingFarmIds = existingPermissions.map((perm) => perm.farmId);

	// **Step 3: Delete records that exist, ignore others**
	if (existingFarmIds.length > 0) {
		await prisma.pendingFarmPermission.deleteMany({
			where: {
				inviteId: existingInvite.id,
				farmId: { in: existingFarmIds },
			},
		});
	}

	// Proceed with updating pending farm permissions
	await prisma.$transaction(async (tx) => {
		// await prisma.applicatorGrower.update({
		// 	where: {
		// 		applicatorId_growerId: {
		// 			growerId,
		// 			applicatorId,
		// 		},
		// 	},
		// 	data: {
		// 		canManageFarms: data.canManageFarms,
		// 	},
		// });
		// Remove existing pending permissions for this invite
		await tx.pendingFarmPermission.deleteMany({
			where: { inviteId: existingInvite.id },
		});

		// Create new pending permissions only for farms with `canView: true`
		if (farmsToProcess.length > 0) {
			await tx.pendingFarmPermission.createMany({
				data: farmsToProcess.map((farm) => ({
					farmId: farm.farmId,
					inviteId: existingInvite.id,
					canView: farm.canView,
					canEdit: farm.canEdit,
				})),
			});
		}
	});
	const subject = 'Ask for Farm Permissions';
	const message = `
	<p>Hello,</p>
	
	<p>An applicator is requesting access to manage your farms on our platform.</p>
  
	<p>Here are the details of the request:</p>
  
	<ul>
	  <li><strong>Requested by:</strong> ${currentUser.firstName} ${currentUser.lastName}</li>
	</ul>
  
	<p>You can review and approve or deny this request by clicking the link below:</p>
  
	<p><a href="[APPROVAL_LINK]" target="_blank">Manage Farm Permissions</a></p>
  
	<p>If you were not expecting this request, you can safely ignore this email.</p>
  
	<p>Best regards,<br> The Team</p>
  `;

	const email = existingInvite?.grower?.email;

	if (!email) {
		throw new Error('Email address is not available for the grower.');
	}

	const html = await mailHtmlTemplate(subject, message);

	await sendEmail({
		emailTo: email,
		subject,
		text: 'Ask for Farm Permissions',
		html,
	});

	return {
		message: 'Permissions request sent successfully.',
	};
};

const uploadFarmImage = async (
	userId: number,
	type: string, // e.g., "farms", "fields"
	fileBuffer: Buffer,
): Promise<{ imageUrl: string }> => {
	const uploader = getUploader();
	const blobName = `${type}/${userId}/${uuidv4()}.webp`;

	const uploadObjects = [
		{
			Key: blobName,
			Body: fileBuffer,
			ContentType: 'image/webp', // adjust as needed
		},
	];

	const res = await uploader(uploadObjects);

	return {
		imageUrl: res[0],
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
			totalAcres: totalAcresByFarm.toFixed(2), // Keep totalAcres
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
		return { message: 'You are not allowed to perform this action.' };

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
const getAvailableApplicators = async (user: User, farmId: number) => {
	const farm = await prisma.farm.findUnique({
		where: {
			id: farmId,
			growerId: user.id,
		},
	});
	if (!farm) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Farm not found.');
	}
	const availableApplicators = await prisma.user.findMany({
		where: {
			// Ensure the applicator is connected to the current grower with an accepted invite
			applicators: {
				some: {
					growerId: user.id,
					inviteStatus: 'ACCEPTED',
				},
			},
			// Ensure farmPermissions are not already assigned for the given farmId
			NOT: {
				farmPermissions: {
					some: {
						farmId: farmId,
					},
				},
			},
			role: 'APPLICATOR',
		},
		select: {
			id: true,
			fullName: true,
			email: true,
		},
	});
	return availableApplicators;
};
const getFarmsWithPermissions = async (user: User, growerId: number) => {
	const invite = await prisma.applicatorGrower.findUnique({
		where: {
			applicatorId_growerId: {
				applicatorId: user.id,
				growerId,
			},
		},
		select: {
			id: true,
		},
	});

	const farms = await prisma.farm.findMany({
		where: {
			growerId,
		},
		select: {
			id: true,
			name: true,
			permissions: {
				where: {
					applicatorId: user.id,
				},
				select: {
					id: true,
					canView: true,
					canEdit: true,
				},
			},
			pendingFarmPermission: {
				where: {
					inviteId: invite?.id,
				},
				select: {
					id: true,
					canView: true,
					canEdit: true,
				},
			},
		},
	});

	if (!farms) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Farm not found.');
	}

	console.log(farms);

	// Separate farms into two arrays
	const farmPermissions = farms
		// .filter((farm) => farm.permissions.length > 0)
		.map((farm) => ({
			farmId: farm.id,
			name: farm.name,
			permissionId:
				farm.permissions.length > 0 ? farm.permissions[0].id : null,
			canView:
				farm.permissions.length > 0
					? farm.permissions[0].canView
					: null,
			canEdit:
				farm.permissions.length > 0
					? farm.permissions[0].canEdit
					: null,
		}));

	const pendingFarmPermissions = farms
		.filter((farm) => farm.pendingFarmPermission.length > 0)
		.map((farm) => ({
			farmId: farm.id,
			name: farm.name,
			permissionId: farm.pendingFarmPermission[0].id,
			canView: farm.pendingFarmPermission[0].canView,
			canEdit: farm.pendingFarmPermission[0].canEdit,
		}));

	return {
		farmPermissions,
		pendingFarmPermissions,
	};
};

const importJDFarmAndFields = async (
	currentUserId: number,
	growerId: number,
	data: any,
) => {
	const {
		id: jdFarmId,
		name,
		stateId,
		county,
		township,
		zipCode,
		fields = [],
	} = data;

	const grower = await prisma.applicatorGrower.findUnique({
		where: {
			applicatorId_growerId: {
				applicatorId: currentUserId,
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

	// Check if farm exists
	let farm = await prisma.farm.findFirst({
		where: {
			jdFarmId,
			growerId,
			createdById: currentUserId,
		},
	});

	if (farm) {
		// Update existing farm
		farm = await prisma.farm.update({
			where: { id: farm.id },
			data: {
				name,
				stateId,
				county,
				township,
				zipCode,
			},
		});
	} else {
		// Create new farm
		farm = await prisma.farm.create({
			data: {
				name,
				stateId,
				county,
				township,
				zipCode,
				growerId,
				createdById: currentUserId,
				isActive: true,
				jdFarmId,
				permissions: {
					create: {
						applicatorId: currentUserId,
						canView: true,
						canEdit: true,
					},
				},
			},
		});
	}

	// Always create new fields, even if jdFieldId already exists
	for (const field of fields) {
		const jdFieldId = field.config?.id || field.id;

		await prisma.field.create({
			data: {
				name: field.name,
				crop: field.crop,
				acres: field.acres,
				legal: field.legal,
				latitude: field.latitude,
				longitude: field.longitude,
				config: field.config,
				fieldImageUrl: field.fieldImageUrl,
				jdFieldId,
				farmId: farm.id,
				createdById: growerId, // Or use currentUserId if that's the correct creator
			},
		});
	}

	return {
		message: 'Import completed (fields always created new)',
		farmId: farm.id,
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
	getAvailableApplicators,
	getFarmsWithPermissions,
	importJDFarmAndFields,
};
