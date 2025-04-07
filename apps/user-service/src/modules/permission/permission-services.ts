import { PermissionType } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { Permission } from './permission-types';

const createPermission = async (data: Permission) => {
	const permission = await prisma.permission.create({
		data: data,
	});

	return permission;
};

const getAllPermissions = async () => {
	const permission = await prisma.permission.findMany();

	return permission;
};

const getPermissionById = async (permissionId: number) => {
	const permission = await prisma.permission.findUnique({
		where: {
			id: permissionId,
		},
	});

	return permission;
};
const updatePermission = async (permissionId: number, data: Permission) => {
	const permission = await prisma.permission.update({
		where: { id: permissionId },
		data: data,
	});

	return permission;
};

const deletePermission = async (permissionId: number) => {
	await prisma.permission.delete({
		where: {
			id: permissionId,
		},
	});

	return { result: 'Deleted successfully' };
};
const getAllPermissionTypes = async () => {
	const permission = Object.values(PermissionType);

	return permission;
};
export default {
	createPermission,
	getAllPermissions,
	getPermissionById,
	updatePermission,
	deletePermission,
	getAllPermissionTypes,
};
