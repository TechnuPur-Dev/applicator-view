import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { StateData, CountyData, TownShipData } from './geo-data-types';

// to update user profile
const createStates = async (data: StateData[]) => {
	if (!Array.isArray(data) || data.length === 0) {
		throw new ApiError(
			httpStatus.CONFLICT,
			'Request body must be a non-empty array of states.',
		);
	}

	return await prisma.state.createMany({
		data,
	});
};

// to update user profile
const createCounties = async (data: CountyData) => {
	if (!Array.isArray(data) || data.length === 0) {
		throw new ApiError(
			httpStatus.CONFLICT,
			'Request body must be a non-empty array of states.',
		);
	}

	return await prisma.state.createMany({
		data,
		skipDuplicates: true, // Skip duplicates based on unique fields (like name)
	});
};
// to update user profile
const createTownships = async (data: TownShipData) => {
	if (!Array.isArray(data) || data.length === 0) {
		throw new ApiError(
			httpStatus.CONFLICT,
			'Request body must be a non-empty array of states.',
		);
	}

	return await prisma.state.createMany({
		data,
		skipDuplicates: true, // Skip duplicates based on unique fields (like name)
	});
};
export default {
	createStates,
	createCounties,
	createTownships,
};
