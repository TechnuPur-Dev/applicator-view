import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { CreateJob } from './job-types';
// import config from '../../../../../shared/config/env-config';
// import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // Adjust based on Azure SDK usage

// create grower
const createJob = async (data: CreateJob, userId: number) => {
	const createdById = userId;
	try {
		// const { firstName, lastName } = data;

		const job = await prisma.user.create({
			data: {
				...data,
			},
		});

		return job;
	} catch (error) {
		// if (error instanceof Prisma.PrismaClientKnownRequestError) {
		// 	// Handle Prisma-specific error codes
		// 	if (error.code === 'P2002') {
		// 		throw new ApiError(
		// 			httpStatus.CONFLICT,
		// 			'A user with this email already exists.',
		// 		);
		// 	}
		// }

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

// get job List
const getAllJobs = async () => {
	try {
		const users = await prisma.user.findMany(); // Fetch all users
		return users;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retreiving all jobs list.',
			);
		}
	}
};

// service for Job
const getJobById = async (jobId: number) => {
	try {
		const user = await prisma.user.findUnique({
			where: {
				id: jobId,
			},
			
		});
		// Check if user is null
		if (!user) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'A job with this id does not exist.',
			);
		}
		return user;
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			// Handle generic errors or unexpected errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Error while retrieving user with this id.',
			);
		}
	}
};

// to delete job
const deleteJob = async (jobId: number) => {
	try {
		await prisma.user.delete({
			where: {
				id: jobId,
			},
		});

		return {
			message: 'User deleted successfully.',
		};
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.CONFLICT,
				'Errror while deleting user.',
			);
		}
	}
};

const updateJobById = async (data: CreateJob, jobId: number) => {
	try {
		await prisma.user.update({
			where: {
				id: jobId,
			},
			data,
		});

		return {
			message: 'Job updated successfully.',
		};
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.CONFLICT,
				'Errror while deleting job.',
			);
		}
	}
};

export default {
	createJob,
	getAllJobs,
	getJobById,
	deleteJob,
	updateJobById,
};
