/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { hashPassword } from '../../helper/bcrypt';
import { PaginateOptions } from '../../../../../shared/types/global';
import ApiError from '../../../../../shared/utils/api-error';
import { UserData } from './admin-user-types';
import { EntityType } from '../../../../../shared/constants';

// get user List
const createUser = async (adminId: number, data: UserData) => {
	const { firstName, lastName, email } = data;
	const userExist = await prisma.user.findUnique({
		where: { email },
	});

	if (userExist) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'User with this email already exists.',
		);
	}

	let { password } = data;
	if (password) {
		password = await hashPassword(password);
	}

	const result = await prisma.$transaction(async (tx) => {
		const user = await tx.user.create({
			data: {
				...data,
				email,
				password,
				fullName: `${firstName} ${lastName}`,
				role: 'SUPER_ADMIN_USER',
			},
			include: {
				state: true,
			},
		});

		await tx.activityLog.create({
			data: {
				adminId,
				action: 'CREATE',
				entityType: EntityType.ADMIN,
				entityId: user.id,
				details: `Created admin with email ${user.email}`,
			},
		});

		return user;
	});

	const formattedResponse = {
		...result,
		state: undefined,
		stateId: result.state?.id,
		stateName: result.state?.name,
	};

	return formattedResponse;
};
const getAllUsers = async (options: PaginateOptions) => {
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
	const users = await prisma.user.findMany({
		where: {
			role: 'SUPER_ADMIN_USER',
		},
		include: {
			state: true,
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
		omit: {
			password: true,
			joiningDate: true,
			lastViewedAt: true,
		},
	}); // Fetch all users
	const totalResults = await prisma.user.count({
		where: {
			role: 'SUPER_ADMIN_USER',
		},
	});
	const formattedResponse = users.map((item) => {
		// flate response
		return {
			...item,
			state: undefined,
			stateId: item.state?.id,
			stateName: item.state?.name,
		};
	});
	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: formattedResponse,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

const getUserById = async (userId: number) => {
	const userDetail = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		include: {
			state: true,
		},
		omit: {
			password: true,
			joiningDate: true,
			lastViewedAt: true,
		},
	});
	if (!userDetail) {
		throw new ApiError(httpStatus.NOT_FOUND, 'user not found');
	}
	const formattedResponse = {
		...userDetail,
		state: undefined,
		stateId: userDetail.state?.id,
		stateName: userDetail.state?.name,
	};
	return formattedResponse;
};
const deleteUser = async (userId: number) => {
	const userExist = await prisma.user.findUnique({
		where: {
			id: userId,
			role: 'SUPER_ADMIN_USER',
		},
	});
	if (!userExist) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'Admin user with this Id not found.',
		);
	}
	await prisma.user.delete({
		where: {
			id: userId,
		},
		omit: {
			password: true,
		},
	});

	return {
		result: 'Admin user deleted successfully',
	};
};
const disableUser = async (data: { userId: number; status: boolean }) => {
	console.log(data, 'userId');
	const { userId, status } = data;
	const userExist = await prisma.user.findUnique({
		where: {
			id: userId,
			role: 'SUPER_ADMIN_USER',
		},
	});
	console.log(userExist, 'userExist');
	if (!userExist) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'Admin user with this Id not found.',
		);
	}
	await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			isActive: status,
		},
	});
	return {
		message: status
			? 'User activated successfully'
			: 'User deactivated successfully',
	};
};
const getAdminActivities = async (options: PaginateOptions) => {
	const limit =
		options.limit && parseInt(options.limit, 10) > 0
			? parseInt(options.limit, 10)
			: 10;
	const page =
		options.page && parseInt(options.page, 10) > 0
			? parseInt(options.page, 10)
			: 1;
	const skip = (page - 1) * limit;

	const [logs, totalResults] = await prisma.$transaction([
		prisma.activityLog.findMany({
			orderBy: { timestamp: 'desc' },
			skip,
			take: limit,
			include: {
				admin: {
					select: {
						id: true,
						fullName: true,
						email: true,
						role: true,
					},
				},
			},
		}),
		prisma.activityLog.count(),
	]);

	const groupedIds: Record<EntityType, number[]> = {
		[EntityType.USER]: [],
		[EntityType.ADMIN]: [],
	};

	for (const log of logs) {
		const type = log.entityType as EntityType;
		if (log.entityId && groupedIds[type]) {
			groupedIds[type].push(log.entityId);
		}
	}

	const userMap = new Map<number, any>();
	const adminMap = new Map<number, any>();

	if (groupedIds[EntityType.USER].length > 0) {
		const users = await prisma.user.findMany({
			where: { id: { in: groupedIds[EntityType.USER] } },
			select: {
				id: true,
				fullName: true,
				email: true,
				role: true,
			},
		});
		users.forEach((user) => userMap.set(user.id, user));
	}

	if (groupedIds[EntityType.ADMIN].length > 0) {
		const admins = await prisma.user.findMany({
			where: { id: { in: groupedIds[EntityType.ADMIN] } },
			select: {
				id: true,
				fullName: true,
				email: true,
				role: true,
			},
		});
		admins.forEach((admin) => adminMap.set(admin.id, admin));
	}

	const enrichedLogs = logs.map((log) => {
		let targetEntity = null;

		if (log.entityType === EntityType.USER) {
			targetEntity = userMap.get(log.entityId ?? 0);
		} else if (log.entityType === EntityType.ADMIN) {
			targetEntity = adminMap.get(log.entityId ?? 0);
		}

		return {
			activityId: log.id,
			action: log.action,
			details: log.details,
			timestamp: log.timestamp,
			performedBy: {
				id: log.admin.id,
				name: log.admin.fullName,
				email: log.admin.email,
				role: log.admin.role,
			},
			target: log.entityId
				? {
						type: log.entityType,
						id: log.entityId,
						...(targetEntity || {}),
					}
				: null,
		};
	});

	const totalPages = Math.ceil(totalResults / limit);

	return {
		data: enrichedLogs,
		pagination: {
			page,
			limit,
			totalPages,
			totalResults,
		},
	};
};

export default {
	createUser,
	getAllUsers,
	getUserById,
	deleteUser,
	disableUser,
	getAdminActivities,
};
