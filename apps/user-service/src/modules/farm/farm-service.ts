import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';

import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { CreateFarmParams } from './farm-types';

const createFarm = async (
	data: CreateFarmParams,
	createdById: number,
	growerId: number,
) => {
	try {
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
				...data,
				createdById,
				growerId,
			},
		});

		return result;
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
		if (error instanceof ApiError) {
			// Handle APi error errors
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

const getAllFarmsByGrower = async (growerId: number) => {
	try {
		const result = await prisma.farm.findMany({
			where: {
				growerId,
			},
			include: {
				fields: true, // Include related fields in the result
			},
		}); // Fetch all users
		return result;
	} catch (error) {
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Error while retrieving farms.',
			);
		}
	}
};
const getFarmById = async (Id: number) => {
	try {
		const farm = await prisma.farm.findUnique({
			where: {
				id: Id,
			},
			include: {
				fields: true, // Include related fields in the result
			},
		});
		console.log(farm, 'farm');
		if (!farm) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Farm with this ID not found.',
			);
		}
		return farm;
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Error while retrieving Farm.',
			);
		}
	}
};

const deleteFarm = async (Id: number) => {
	try {
		await prisma.farm.delete({
			where: {
				id: Id,
			},
		});

		return {
			message: 'Farm deleted successfully.',
		};
	} catch (error) {
		if (error instanceof ApiError) {
			// Handle generic errors
			throw new ApiError(error.statusCode, error.message);
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Errror while deleting farm.',
			);
		}
	}
};
const updateFarm = async (farmId: number, data: CreateFarmParams) => {
	try {
		// Validate farm existence
		const farm = await prisma.farm.findUnique({
			where: { id: farmId },
			select: { id: true },
		});
		if (!farm) {
			throw new ApiError(httpStatus.NOT_FOUND, 'Farm not found.');
		}
		console.log(farm, 'farm');
		// Update farm
		const updatedFarm = await prisma.farm.update({
			where: { id: farmId },
			data,
		});

		return updatedFarm;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === 'P2003') {
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					'Foreign key constraint violated.',
				);
			}
		}
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.INTERNAL_SERVER_ERROR,
				'An error occurred.',
			);
		}
	}
};

export default {
	createFarm,
	getAllFarmsByGrower,
	getFarmById,
	deleteFarm,
	updateFarm,
};
