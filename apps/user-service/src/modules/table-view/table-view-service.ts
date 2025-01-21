import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { CreateViewParams } from './table-view-types';

const createView = async (data: CreateViewParams, createdById: number) => {
	try {
		// Create View
		const result = await prisma.tableView.create({
			data: {
				...data,
				config: JSON.stringify(data.config), // Ensure config is in JSON format
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

const getAllViews = async (userId:number) => {
	try {
		const result = await prisma.tableView.findMany({
			where:{
				createdById:userId
			}
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
const getViewById = async (Id: number) => {
	try {
		const View = await prisma.tableView.findUnique({
			where: {
				id: Id,
			},
		}); // Fetch all users
		if (!View) {
			throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid table view Id');
		}
		return View;
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
		const View = await prisma.tableView.findUnique({
			where: {
				id: Id,
			},
		}); // Fetch all users
		if (!View) {
			throw new ApiError(httpStatus.NOT_FOUND, 'Invalid table view Id');
		}

		const result = await prisma.tableView.delete({
			where: {
				id: Id,
			},
		});
		return result ;
	} catch (error) {
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
const updateView = async (
	ViewId: number,
	data: CreateViewParams,
	// updatedById: number,
) => {
	console.log(data,"data")
	try {
		// Validate View existence
		const View = await prisma.tableView.findUnique({
			where: {
				id: ViewId,
			},
		}); // Fetch all users
		if (!View) {
			throw new ApiError(httpStatus.NOT_FOUND, 'Invalid table view Id');
		}
		// Update View
		const updatedView = await prisma.tableView.update({
			where: { id: ViewId },
			data: {
				...data,
				config: JSON.stringify(data.config), // Ensure config is in JSON format
			},
		});

		return updatedView;
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
		if (error instanceof Error) {
			console.log(error,"actual error")
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
