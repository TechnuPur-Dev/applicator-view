/* eslint-disable @typescript-eslint/no-explicit-any */
// import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
// import { PaginateOptions } from '../../../../../shared/types/global';
// import ApiError from '../../../../../shared/utils/api-error';
// import { UserData } from './admin-user-types';
// import { EntityType } from '../../../../../shared/constants';

// get user List

const getAllPermissions = async () => {
	const result = await prisma.permission.findMany({
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			id: 'desc',
		},
	}); // Fetch all permissions

	return {
		result: result,
	};
	const permissionData = await prisma.permission.findMany({
		include: {
			adminPermissions: {
				select: {
					adminId: true,
					admin: {
						select: {
							fullName: true,
						},
					},
					accessLevel: true,
				},
			},
		},
	});
	const formatData = permissionData.map((item) => ({
		...item,
		adminPermissions: item.adminPermissions.map((item) => ({
			adminId: item.adminId,
			fullName: item.admin.fullName,
			accessLevel: item.accessLevel,
		})),
	}));
	return formatData;
};

const getAdminUserPermissions = async () => {
	const permissionData = await prisma.permission.findMany({
		select: {
			name: true,
			adminPermissions: {
				orderBy: {
					id: 'desc',
				},
				select: {
					id: true,
					accessLevel: true,
					admin: {
						select: {
							fullName: true,
							profileImage: true,
							thumbnailProfileImage: true,
							email: true,
						},
					},
				},
			},
		},
		orderBy: {
			id: 'asc',
		},
	});
	const formatData = permissionData.map((item) => ({
		...item,
		adminPermissions: item.adminPermissions.map((item) => ({
			...item,
			fullName: item.admin.fullName,
			profileImage: item.admin.profileImage,
			thumbnailProfileImage: item.admin.thumbnailProfileImage,
			email: item.admin.email,
			accessLevel: item.accessLevel,
			admin: undefined,
		})),
	}));
	return formatData;
};
const updateAdminPermission = async (data: {
	adminPermissionId: number;
	accessLevel: 'read' | 'write';
}) => {
	// // Check if the AdminPermission exists
	// console.log(data.adminPermissionId, 'adminPermissionId');
	// const existing = await prisma.adminPermission.findUnique({
	// 	where: {
	// 		id: data?.adminPermissionId,
	// 	},
	// });
	// if (!existing) {
	// 	throw new Error('Permission not found for this admin.');
	// }
	// Update the permission access level
	await prisma.adminPermission.update({
		where: {
			id: data.adminPermissionId,
		},
		data: {
			accessLevel: data.accessLevel,
		},
	});

	return {
		message: 'Permission updated successfully',
	};
};

export default {
	getAllPermissions,
	getAdminUserPermissions,
	updateAdminPermission,
};
