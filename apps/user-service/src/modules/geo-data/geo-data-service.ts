import httpStatus from 'http-status';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import {
	StateData,
	CountyData,
	TownShipData,
	UpdateTownShipData,
	UpdateCountyData,
} from './geo-data-types';
import axios from 'axios';

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
	const uniqueStates = [...new Set(data.map((c) => c.State))];

	// Fetch state IDs for all unique states
	const states = await prisma.state.findMany({
		where: { name: { in: uniqueStates } },
		select: { id: true, name: true },
	});
	const stateMap = states.reduce((acc: any, state) => {
		acc[state.name] = state.id;
		return acc;
	}, {});
	// Prepare county data with stateId
	const countyData = data
		.map(({ County, State }: any) => ({
			name: County,
			stateId: stateMap[State],
		}))
		.filter(({ stateId }: any) => stateId); // Filter out counties where state is not found

	if (countyData.length === 0) {
		console.log('No valid state IDs found. Counties not added.');
		return;
	}
	return await prisma.county.createMany({
		data: countyData,
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
	const uniqueCounties = [...new Set(data.map((c) => c.County))];

	// Fetch county IDs for all unique townships
	const counties = await prisma.county.findMany({
		where: { name: { in: uniqueCounties } },
		select: { id: true, name: true },
	});
	const countyMap = counties.reduce((acc: any, county) => {
		acc[county.name] = county.id;
		return acc;
	}, {});
	// Prepare county data with countyId
	const townshipData = data
		.map(({ Township, County }: any) => ({
			name: Township,
			countyId: countyMap[County],
		}))
		.filter(({ countyId }: any) => countyId); // Filter out counties where state is not found

	if (townshipData.length === 0) {
		console.log('No valid county IDs found.Townships not added.');
		return;
	}
	return await prisma.township.createMany({
		data: townshipData,
		skipDuplicates: true, // Skip duplicates based on unique fields (like name)
	});
};
const getAllStates = async () =>
	await prisma.state.findMany({ orderBy: { id: 'asc' } });
const getAllCounties = async () =>
	await prisma.county.findMany({ orderBy: { id: 'asc' } });
const getAllTownships = async () =>
	await prisma.township.findMany({ orderBy: { id: 'asc' } });

const deleteState = async (Id: number) => {
	await prisma.state.delete({
		where: {
			id: Id,
		},
	});

	return {
		message: 'State deleted successfully.',
	};
};
const deleteCounty = async (Id: number) => {
	await prisma.county.delete({
		where: {
			id: Id,
		},
	});

	return {
		message: 'County deleted successfully.',
	};
};
const deleteTownship = async (Id: number) => {
	await prisma.township.delete({
		where: {
			id: Id,
		},
	});

	return {
		message: 'Township deleted successfully.',
	};
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

	return updatedState;
};
const updateCounty = async (countyId: number, data: UpdateCountyData) => {
	const county = await prisma.county.findUnique({
		where: { id: countyId },
		select: { id: true },
	});
	if (!county) {
		throw new ApiError(httpStatus.NOT_FOUND, 'County not found.');
	}
	const updatedCounty = await prisma.county.update({
		where: { id: countyId },
		data,
	});

	return updatedCounty;
};
const updateTownship = async (townshipId: number, data: UpdateTownShipData) => {
	const township = await prisma.township.findUnique({
		where: { id: townshipId },
		select: { id: true },
	});
	if (!township) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Township not found.');
	}
	const updatedTownship = await prisma.township.update({
		where: { id: townshipId },
		data,
	});

	return updatedTownship;
};
const getCountiesByState = async (stateId: number) => {
	return await prisma.county.findMany({
		where: { stateId },
	});
};

const getTownshipsByCounty = async (countyId: number) => {
	return await prisma.township.findMany({
		where: { countyId },
	});
};

const validateAddress = async (street: string, city: string, state: string) => {
	const AUTH_ID = '3c1db701-d45f-5411-cafd-7ead392570eb';
	const AUTH_TOKEN = 'cvuxc0QLqUmBhkpuAkxk';

	try {
		// Step 1: Validate City and State
		const cityStateUrl = `https://us-zipcode.api.smarty.com/lookup?auth-id=${AUTH_ID}&auth-token=${AUTH_TOKEN}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
		const cityStateResponse = await axios.get(cityStateUrl);

		if (
			cityStateResponse.data[0].reason ||
			cityStateResponse.data[0].status
		) {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				cityStateResponse.data[0].reason,
			);
		}

		// Step 2: Validate Full Address if City and State are valid
		if (street) {
			const streetUrl = `https://us-street.api.smarty.com/street-address?auth-id=${AUTH_ID}&auth-token=${AUTH_TOKEN}&street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
			const streetResponse = await axios.get(streetUrl);

			if (!streetResponse.data || streetResponse.data.length === 0) {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					'Invalid Street Address',
				);
			}
		}

		return { message: 'Valid Address' };
	} catch (error: any) {
		return { message: error.response?.data || error.message };
	}
};

const getCityByZip = async (zipCode: string) => {
	const AUTH_ID = '3c1db701-d45f-5411-cafd-7ead392570eb';
	const AUTH_TOKEN = 'cvuxc0QLqUmBhkpuAkxk';

	// Step 1: Validate City and State
	const cityStateUrl = `https://us-zipcode.api.smarty.com/lookup?auth-id=${AUTH_ID}&auth-token=${AUTH_TOKEN}&city=&state=&zipcode=${zipCode}`;
	const cityStateResponse = await axios.get(cityStateUrl);
	console.log(cityStateResponse.data[0]);

	if (cityStateResponse.data[0].reason || cityStateResponse.data[0].status) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			cityStateResponse.data[0].reason,
		);
	}

	return {
		cityName: cityStateResponse.data[0].city_states[0].city,
	};
};
export default {
	createStates,
	createCounties,
	createTownships,
	getAllStates,
	getAllCounties,
	getAllTownships,
	deleteState,
	deleteCounty,
	deleteTownship,
	updateState,
	updateCounty,
	updateTownship,
	getCountiesByState,
	getTownshipsByCounty,
	validateAddress,
	getCityByZip,
};
