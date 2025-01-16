import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';

import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { CreateFarmParams } from './farm-types';

const createForm = async (
	data: CreateFarmParams,
	createdById: number,
	growerId: number,
) => {
	try {
		const { name, state, county, township, zipCode, isActive } = data;
		// Validate grower existence
		const grower = await prisma.user.findUnique({
			where: { id: growerId },
		});
		if (!grower) {
			throw new ApiError(
				httpStatus.BAD_REQUEST,
				'Invalid growerId. Grower does not exist.',
			);
		}

		// Create farm
		const result = await prisma.farm.create({
			data: {
				name: name || null, // Optional fields should allow null
				state: state || null,
				county: county || null,
				township: township || null,
				zipCode: zipCode || null,
				isActive: isActive ?? true, // Default isActive to true if not provided
				createdById,
				growerId,
			},
		});

		return { result, message: 'Farm created successfully.' };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2003') {
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					'Foreign key constraint violated. non-existent growerId.',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

const getAllFarms = async () => {
	try {
		const result = await prisma.farm.findMany(); // Fetch all users
		return result;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.NOT_FOUND, 'some thing went wrong');
		}
	}
};
const getFarmById = async (Id: number) => {
	try {
		const result = await prisma.farm.findMany({
			where: {
				id: Id,
			},
			include: {
				fields: true, // Include related fields in the result
			},
			
		}); // Fetch all users
		return result;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.NOT_FOUND, 'some thing went wrong');
		}
	}
};

const deleteFarm = async (Id: string, userId: string) => {
	try {
		await prisma.farm.delete({
			where: {
				id: parseInt(Id),
				createdById: parseInt(userId),
			},
		});

		return {
			status: httpStatus.NO_CONTENT, // 204
			message: 'User deleted successfully',
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A farm to delete with this id not exist',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
		}
	}
};
const updateFarm = async (
	farmId: number,
	data: CreateFarmParams,
	updatedById: number,
) => {
	try {
		// Validate farm existence
		const farm = await prisma.farm.findUnique({ where: { id: farmId } });
		if (!farm) {
			throw new ApiError(httpStatus.NOT_FOUND, 'Farm not found.');
		}
         console.log(farm,"farm")
		// Update farm
		const updatedFarm = await prisma.farm.update({
			where: { id: farmId },
			data: {
				...data,
				createdById: updatedById,
				growerId: farm.growerId, // Retain the existing growerId from farmModel
				updatedAt: new Date(), // Ensure updatedAt is updated
			},
		});

		return { updatedFarm, message: 'Farm updated successfully.' };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === 'P2003') {
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					'Foreign key constraint violated.',
				);
			}
		}

		// Generic error handling
		throw new ApiError(
			httpStatus.INTERNAL_SERVER_ERROR,
			'An error occurred.',
		);
	}
};

export default {
	createForm,
	getAllFarms,
	getFarmById,
	deleteFarm,
	updateFarm,
};
