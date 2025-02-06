import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { field } from './field-types';

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
const updateFieldById = async (data: field, fieldId: number) => {
	// Only accept the fields sent by the frontend
	const dataToUpdate = data;

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
};

// to delete field

const deleteField = async (fieldId: string) => {
	await prisma.field.delete({
		where: {
			id: parseInt(fieldId),
		},
	});

	return {
		status: httpStatus.NO_CONTENT, // 204
		message: 'Field deleted successfully',
	};
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
const createField = async (createdById: number, data: field) => {
	// Only accept the fields sent by the frontend

	const { name, crop, acres, legal, latitude, longitude, farmId } = data;

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
		},
	});

	return field;
};

export default {
	getFieldById,
	updateFieldById,
	deleteField,
	getAllFields,
	createField,
};
