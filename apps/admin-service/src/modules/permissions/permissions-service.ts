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
		select:{
            id:true,
			name:true
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
							fullName: true
						}
					},
					accessLevel: true

				}
			}
		}
	});
	const formatData = permissionData.map((item) => (
		{
			...item,
			adminPermissions: item.adminPermissions.map((item) => (
				{
					adminId: item.adminId,
					fullName: item.admin.fullName,
					accessLevel: item.accessLevel
				}

			))

		}
	))
	return formatData;
};

const getAdminUserPermissions = async () => {
	
	const permissionData = await prisma.permission.findMany({
		include: {
			adminPermissions: {
				select: {
					adminId: true,
					admin: {
						select: {
							fullName: true
						}
					},
					accessLevel: true

				}
			}
		},
		omit:{
			createdAt:true,
			updatedAt:true
		}
	});
	const formatData = permissionData.map((item) => (
		{
			...item,
			adminPermissions: item.adminPermissions.map((item) => (
				{
					adminId: item.adminId,
					fullName: item.admin.fullName,
					accessLevel: item.accessLevel
				}

			))

		}
	))
	return formatData;
};




export default {
	getAllPermissions,
	getAdminUserPermissions

};
