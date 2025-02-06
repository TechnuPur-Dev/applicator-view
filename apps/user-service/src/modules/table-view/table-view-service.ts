import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
// import { Prisma } from '@prisma/client';
import { CreateViewParams } from './table-view-types';
import { ViewTable } from '@prisma/client';

const createView = async (data: CreateViewParams, createdById: number) => {
	// Create View
	const result = await prisma.tableView.create({
		data: {
			...data,
			createdById,
		},
	});

	return result;
};

const getAllViews = async (userId: number, tableName: ViewTable) => {
	const result = await prisma.tableView.findMany({
		where: {
			tableName,
			createdById: userId,
		},
	}); // Fetch all users
	return result;
};
const getViewById = async (id: number) => {
	const view = await prisma.tableView.findUnique({
		where: {
			id,
		},
	}); // Fetch all users
	if (!view) {
		throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid table view Id');
	}
	return view;
};

const deleteView = async (Id: number) => {
	await prisma.tableView.delete({
		where: {
			id: Id,
		},
	});
};
const updateView = async (viewId: number, data: CreateViewParams) => {
	// Update View
	const updatedView = await prisma.tableView.update({
		where: { id: viewId },
		data,
	});
	if (!updatedView) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Invalid table view Id');
	}
	return updatedView;
};

export default {
	createView,
	getAllViews,
	getViewById,
	deleteView,
	updateView,
};
