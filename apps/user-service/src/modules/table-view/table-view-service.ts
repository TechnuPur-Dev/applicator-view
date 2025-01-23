import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { Prisma } from '@prisma/client';
import { CreateViewParams } from './table-view-types';
import { ViewTable } from '@prisma/client';

const createView = async (data: CreateViewParams, createdById: number) => {
	try {
		// Create View
		const result = await prisma.tableView.create({
			data: {
				...data,
				createdById,
			},
		});

		return result;
	} catch (error) {
		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};

const getAllViews = async (userId: number, tableName: ViewTable) => {
	try {
		const result = await prisma.tableView.findMany({
			where: {
				tableName,
				createdById: userId,
			},
		}); // Fetch all users
		return result;
	} catch (error) {
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Error while retrieving Views.',
			);
		}
	}
};
const getViewById = async (id: number) => {
	try {
		const view = await prisma.tableView.findUnique({
			where: {
				id,
			},
		}); // Fetch all users
		if (!view) {
			throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid table view Id');
		}
		return view;
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Error while retrieving View by this ID',
			);
		}
	}
};

const deleteView = async (Id: number) => {
	try {
		await prisma.tableView.delete({
			where: {
				id: Id,
			},
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A record to delete with this id does not exist.',
				);
			}
		}
		if (error instanceof ApiError) {
			// Handle generic errors
			throw new ApiError(error.statusCode, error.message);
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(
				httpStatus.CONFLICT,
				'Errror while deleting View.',
			);
		}
	}
};
const updateView = async (viewId: number, data: CreateViewParams) => {
	try {
		// Update View
		const updatedView = await prisma.tableView.update({
			where: { id: viewId },
			data,
		});

		return updatedView;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2025') {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'A record to update with this id does not exist.',
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
	createView,
	getAllViews,
	getViewById,
	deleteView,
	updateView,
};
