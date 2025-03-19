import { prisma } from '../../../../../shared/libs/prisma-client';
import { ForecastCity } from './forecast-city-types';

const createForecastCity = async (name: string, id: number) => {
	const forecastCity = await prisma.forecastCity.create({
		data: {
			name: name,
			userId: id,
		},
	});

	return forecastCity;
};

const getAllForecastCities = async (id: number) => {
	const forecastCities = await prisma.forecastCity.findMany({
		where: { userId: id },
	});

	return forecastCities;
};

const getForecastCityById = async (forecastCityId: number, id: number) => {
	const forecastCity = await prisma.forecastCity.findUnique({
		where: {
			id: forecastCityId,
			userId: id,
		},
	});

	return forecastCity;
};
const updateForecastCity = async (
	forecastCityId: number,
	data: ForecastCity,
	id: number,
) => {
	const forecastCity = await prisma.forecastCity.update({
		where: { id: forecastCityId, userId: id },
		data: data,
	});

	return forecastCity;
};

const deleteForecastCity = async (forecastCityId: number, id: number) => {
	await prisma.forecastCity.delete({
		where: {
			id: forecastCityId,
			userId: id,
		},
	});

	return { result: 'Deleted successfully' };
};

export default {
	createForecastCity,
	getAllForecastCities,
	getForecastCityById,
	updateForecastCity,
	deleteForecastCity,
};
