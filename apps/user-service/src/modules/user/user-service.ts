import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { UpdateUser } from './user-types';

// service for user
const getUserByID = async (userId: string) => {
	try {
		const user = await prisma.user.findUnique({
			where: {
				id: parseInt(userId),
			},
		});

		return user;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A user with this id does not exist.',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors or unexpected errors
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
		}
	}
};

// to update user
const updateUserById = async (data: UpdateUser, userId: string) => {
	// Only accept the fields sent by the frontend
	const dataToUpdate = data;
	console.log(dataToUpdate, 'dataToUpdate');
	try {
		await prisma.user.update({
			where: {
				id: Number(userId),
			},

			data: {
				// update only those value which are send by the frontend and the values that are not sended by the frontend will remain the same
				...dataToUpdate,
			},
		});

		return {
			status: httpStatus.OK, // 200
			message: 'User updated successfully',
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2002') {
				throw new ApiError(
					httpStatus.CONFLICT,
					'A user with this email already exists.',
				);
			}
			// it depends on one or more records that were required but not found.
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A user with this id does not exist.',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

// to delete User

const deleteUser = async (userId: string) => {
	try {
		await prisma.user.delete({
			where: {
				id: parseInt(userId),
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
					'A user to delete with this id not exist',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
		}
	}
};

// get user List
const getUserList = async () => {
	try {
		const users = await prisma.user.findMany(); // Fetch all users
		return users;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.NOT_FOUND, 'some thing went wrong');
		}
	}
};
export default {
	getUserByID,
	deleteUser,
	updateUserById,
	getUserList,
};
