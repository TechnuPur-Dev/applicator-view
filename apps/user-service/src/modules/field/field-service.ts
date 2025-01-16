import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { field } from './field-types';

// service for field
const getFieldById = async (fieldId: string) => {
	try {
		const field = await prisma.field.findUnique({
			where: {
				id: parseInt(fieldId),
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
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A field with this id does not exist.',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors or unexpected errors
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
		}
	}
};

// to update field
const updateFieldById = async (data: field, fieldId: string) => {
	// Only accept the fields sent by the frontend
	const dataToUpdate = data;
	try {
		await prisma.field.update({
			where: {
				id: Number(fieldId),
			},

			data: {
				// update value
				...dataToUpdate,
			},
		});

		return {
			status: httpStatus.OK,
			message: 'Field updated successfully',
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2002') {
				throw new ApiError(
					httpStatus.CONFLICT,
					'A Field with this email already exists.',
				);
			}
			// it depends on one or more records that were required but not found.
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A Field with this id does not exist.',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

// to delete field

const deleteField = async (fieldId: string) => {
	try {
		await prisma.field.delete({
			where: {
				id: parseInt(fieldId),
			},
		});

		return {
			status: httpStatus.NO_CONTENT, // 204
			message: 'Field deleted successfully',
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A field to delete with this id not exist',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
		}
	}
};

// get field List
const getFieldList = async () => {
	try {
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
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.NOT_FOUND, 'some thing went wrong');
		}
	}
};

// create field
const createField = async (data: field) => {
	// Only accept the fields sent by the frontend
	try {
		const {
			name,
			crop,
			acres,
			legal,
			latitude,
			longitude,
			createdById,
			farmId,
		} = data;

		// to extract applicator data for applcatorGrower model
		if (!createdById) {
			throw new ApiError(
				httpStatus.BAD_REQUEST,
				'createdById is required.',
			);
		}

		if (!farmId) {
			throw new ApiError(httpStatus.BAD_REQUEST, 'farmId is required.');
		}
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

		return { field, message: 'Field successfully added.' };
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

export default {
	getFieldById,
	updateFieldById,
	deleteField,
	getFieldList,
	createField,
};
