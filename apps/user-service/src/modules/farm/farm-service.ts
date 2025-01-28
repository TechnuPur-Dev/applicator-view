import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';

import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { CreateFarmParams, AssignFarmPermission } from './farm-types';
import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
import { sendEmail } from '../../../../../shared/helpers/node-mailer';
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
		const farms = await prisma.farm.findMany({
			where: {
				growerId,
			},
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
			},
			orderBy: {
				createdAt: 'desc',
			},
		}); // Fetch all users
		// Calculate total acres for each grower and each farm
		const enrichedFarms = farms.map((farm) => {
			const totalAcresByFarm = farm.fields.reduce(
				(totalFarmAcres, field) => {
					return (
						totalFarmAcres +
						parseFloat(field.acres?.toString() || '0')
					);
				},
				0,
			);

			// Add total acres to the grower object
			return {
				...farm,
				totalAcres: totalAcresByFarm,
			};
		});
		return enrichedFarms;
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

const assignFarmPermission = async (data: AssignFarmPermission) => {
	try {
		const { farmId, applicatorId, canView, canEdit } = data;

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
		const permission = await prisma.farmPermission.create({
			data: { farmId, applicatorId, canView, canEdit },
		});

		return permission;
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
			throw new ApiError(httpStatus.CONFLICT, 'An error occurred.');
		}
	}
};
const updateFarmPermission = async (
	permissionId: number,
	data: AssignFarmPermission,
) => {
	try {
		// Update farm
		const updatedPermission = await prisma.farmPermission.update({
			where: { id: permissionId },
			data,
		});

		return updatedPermission;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A record to udpate with this id does not exist',
				);
			}
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
const deleteFarmPermission = async (permissionId: number) => {
	try {
		// Update farm
		await prisma.farmPermission.delete({
			where: { id: permissionId },
		});

		return {
			message: 'Farm permission deleted successfully.',
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A record to delete with this id does not exist',
				);
			}
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
const askFarmPermission = async (email: string) => {
	console.log(email,"req.body")
	try {
		const isEmailExist = await prisma.user.findFirst({
			where: {
				email: {
					equals: email,
					mode: 'insensitive',
				},
				profileStatus: 'COMPLETE',
			},
			select: {
				id: true, // Omit password from the response to prevent exposing it to clients
			},
		});

		if (!isEmailExist) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'An account with this email not exists.',
			);
		}
	
		const subject = 'Request For Farm Permissions';
		const message = `
		You have received a request for farm access permissions.<br><br>
		To grant access, please review and approve the request.<br><br>
		If you did not initiate this request, please ignore this email.<br><br>
		Thank you.
	  `;
		const html = await mailHtmlTemplate(subject, message);
		await sendEmail({
			emailTo: email,
			subject,
			text: 'Request Verification',
			html,
		});
		return {
			message:"Request email for permission has been sent to the user Succesfully",
		};

	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
	}
};
export default {
	createFarm,
	getAllFarmsByGrower,
	getFarmById,
	deleteFarm,
	updateFarm,
	assignFarmPermission,
	updateFarmPermission,
	deleteFarmPermission,
	askFarmPermission
};
