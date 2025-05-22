/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { Prisma } from '@prisma/client';
// import { PaginateOptions } from '../../../../../shared/types/global';
import ApiError from '../../../../../shared/utils/api-error';
import { StateData } from './state-types';
import { PaginateOptions } from '../../../../../shared/types/global';
import * as XLSX from 'xlsx';
// import { EntityType } from '../../../../../shared/constants';

// get user List
const getAllStates = async (options: PaginateOptions & {
	searchValue?: string;
},) => {
	const limit =
		options.limit && parseInt(options.limit, 10) > 0
			? parseInt(options.limit, 10)
			: 10;
	// Set the page number, default to 1 if not specified or invalid
	const page =
		options.page && parseInt(options.page, 10) > 0
			? parseInt(options.page, 10)
			: 1;
	// Calculate the number of users to skip based on the current page and limit
	const skip = (page - 1) * limit;
	const filters: Prisma.StateWhereInput = {}
	if (options?.searchValue) {
		filters.OR = [
			{
				name: {
					contains: options.searchValue,
					mode: 'insensitive',
				},
			},
		]
	}
	const states = await prisma.state.findMany({
		where: filters ? filters : undefined,
		skip,
		take: limit,
		orderBy: { id: 'asc' }
	});
	const totalResults = await prisma.state.count({
		where: filters ? filters : undefined,
	});

	const totalPages = Math.ceil(totalResults / limit);
	return {
		result: states,
		page,
		limit,
		totalPages,
		totalResults,
	};
}
// create state
const createStates = async (data: StateData) => {
	const dataExist = await prisma.state.findFirst({
		where: {
			name: data.name
		},
	});
	if (dataExist) {
		throw new ApiError(httpStatus.CONFLICT, 'state already exist.');
	}
	return await prisma.state.create({
		data: {
			name: data.name,
		},
	});
};
const updateState = async (stateId: number, data: StateData) => {
	const state = await prisma.state.findUnique({
		where: { id: stateId },
		select: { id: true },
	});
	if (!state) {
		throw new ApiError(httpStatus.NOT_FOUND, 'State not found.');
	}
	const updatedState = await prisma.state.update({
		where: { id: stateId },
		data,
	});

	return { updatedState };
};
const deleteState = async (Id: number) => {
	// Check if related records exist
	const relatedRecords = await prisma.state.findUnique({
		where: { id: Id },
		select: {
			counties: { select: { id: true }, take: 1 },
			Farm: { select: { id: true }, take: 1 },
			User: { select: { id: true }, take: 1 },
		},
	});
	if (!relatedRecords) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'state not found.',
		);
	}

	if (relatedRecords.counties.length > 0 ||
		relatedRecords.Farm.length > 0 ||
		relatedRecords.User.length > 0) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'state cannot be deleted.It is currently in use',
		);
	}
	await prisma.state.delete({
		where: {
			id: Id,
		},
	});

	return {
		message: 'State deleted successfully.',
	};
};
const getStateById = async (stateId: number) => {
	const state = await prisma.state.findUnique({
		where: { id: stateId },
		select: { id: true },
	});
	if (!state) {
		throw new ApiError(httpStatus.NOT_FOUND, 'State not found.');
	}
	const result = await prisma.state.findUnique({
		where: { id: stateId },

	});

	return { result };
};
// bulk upload
const bulkUploadstate = async (fileBuffer: Buffer) => {
	const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	const jsonData = XLSX.utils.sheet_to_json<any>(sheet);

	if (!jsonData || jsonData.length === 0) {
		throw new Error('Excel file is empty or format is invalid.');
	}
	console.log(jsonData, 'jsonData')
	// Insert all data
	await prisma.state.createMany({
		data: jsonData,
		skipDuplicates: true,
	});

	return {
		message: 'Data uploaded successfully.',
		total: jsonData.length,// how much records added 
	};
};

export default {
	getAllStates,
	createStates,
	updateState,
	deleteState,
	getStateById,
	bulkUploadstate

};
