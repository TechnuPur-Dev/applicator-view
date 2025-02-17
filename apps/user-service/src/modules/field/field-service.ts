import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { field } from './field-types';
import { User } from '../../../../../shared/types/global';

// service for field
const getFieldById = async (fieldId: number) => {
	const field = await prisma.field.findUnique({
		where: {
			id: fieldId,
		},
		include: {
			farm: {
				select: {
					id: true,
					name: true,
				},
			},
			createdBy: {
				select: {
					id: true,
					fullName: true,
				},
			},
		},
	});
	if (!field) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'A field with this id does not exist.',
		);
	}

	return field;
};

// to update field
const updateFieldById = async (data: field, fieldId: number, user: User) => {
	// Only accept the fields sent by the frontend
	const dataToUpdate = data;
	const { role, id: userId } = user;
	const fieldExist = await prisma.field.findUnique({
		where: {
			id: fieldId,
		},
		include: {
			farm: {
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
			},
		},
	});
	if (role === 'GROWER') {
		if (fieldExist?.farm.growerId === userId) {
			const updatedField = await prisma.field.update({
				where: {
					id: fieldId,
				},
				data: {
					// update value
					...dataToUpdate,
				},
			});

			return updatedField;
		} else {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'You are not authorized to edit this field',
			);
		}
	}

	// If user is APPLICATOR, check if they have atleast one edit permission because permissions is an array
	else if (role === 'APPLICATOR') {
		const hasEditPermission = fieldExist?.farm?.permissions.some(
			(permission) => permission.canEdit,
		);
		if (hasEditPermission) {
			const updatedField = await prisma.field.update({
				where: {
					id: fieldId,
				},
				data: {
					// update value
					...dataToUpdate,
				},
			});

			return updatedField;
		} else {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'You do not have permission to edit this field',
			);
		}
	}
};

// to delete field

const deleteField = async (fieldId: number, user: User) => {
	const { role, id: userId } = user;
	const fieldExist = await prisma.field.findUnique({
		where: {
			id: fieldId,
		},
		include: {
			farm: {
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
			},
		},
	});
	// Check if the farm exists

	if (!fieldExist) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Field  not found');
	}
	if (role === 'GROWER') {
		if (fieldExist?.farm.growerId === userId) {
			await prisma.field.delete({
				where: {
					id: fieldId,
				},
			});

			return {
				status: httpStatus.NO_CONTENT, // 204
				message: 'Field deleted successfully',
			};
		} else {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'You are not authorized to delete this field',
			);
		}
	}

	// If user is APPLICATOR, check if they have atleast one edit permission because permissions is an array
	else if (role === 'APPLICATOR') {
		const hasEditPermission = fieldExist?.farm?.permissions.some(
			(permission) => permission.canEdit,
		);
		if (hasEditPermission) {
			await prisma.field.delete({
				where: {
					id: fieldId,
				},
			});

			return {
				status: httpStatus.NO_CONTENT, // 204
				message: 'Field deleted successfully',
			};
		} else {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'You do not have permission to delete this field',
			);
		}
	}
};

// get field List
const getAllFields = async () => {
	const fields = await prisma.field.findMany({
		include: {
			farm: {
				select: {
					id: true,
					name: true,
				},
			},
			createdBy: {
				select: {
					id: true,
					fullName: true,
				},
			},
		},
	});
	return fields;
};

// create field
const createField = async (createdById: number, data: field, user: User) => {
	// Only accept the fields sent by the frontend
	const { role, id: userId } = user;
	const { name, crop, acres, legal, latitude, longitude, farmId, config } =
		data;
	const farm = await prisma.farm.findUnique({
		where: {
			id: data.farmId,
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
	console.log(farm, 'farm');
	if (!farm) {
		throw new ApiError(httpStatus.NOT_FOUND, 'FarmId not found');
	}
	if (role === 'GROWER') {
		if (farm?.growerId === userId) {
			const field = await prisma.field.create({
				data: {
					name,
					crop,
					acres,
					legal,
					latitude,
					longitude,
					createdById,
					farmId,
					config,
				},
			});

			return field;
		} else {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'You are not authorized to add this field',
			);
		}
	}

	// If user is APPLICATOR, check if they have atleast one edit permission because permissions is an array
	else if (role === 'APPLICATOR') {
		const hasEditPermission = farm?.permissions.some(
			(permission) => permission.canEdit,
		);
		console.log(hasEditPermission, 'hasEditPermission');
		if (hasEditPermission) {
			const field = await prisma.field.create({
				data: {
					name,
					crop,
					acres,
					legal,
					latitude,
					longitude,
					createdById,
					farmId,
					config,
				},
			});

			return field;
		} else {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'You do not have permission to add this field',
			);
		}
	}
};

export default {
	getFieldById,
	updateFieldById,
	deleteField,
	getAllFields,
	createField,
};
