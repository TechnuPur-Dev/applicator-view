import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import forecastCityServices from './forecast-city-services';

const createForecastCity = catchAsync(async (req: Request, res: Response) => {
	const { name } = req.body;
	const userId = req.user.id;
	const result = await forecastCityServices.createForecastCity(
		name,
		userId,
	);
	res.status(httpStatus.CREATED).json(result);
});

const getAllForecastCities = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user.id;
	const workerData =
		await forecastCityServices.getAllForecastCities(userId);
	res.status(httpStatus.OK).json(workerData);
});

const getForecastCityById = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user.id;
	const forecastCityId = +req.params.id;
	const result = await forecastCityServices.getForecastCityById(
		forecastCityId,
		userId,
	);
	res.status(httpStatus.OK).json(result);
});
const updateForecastCity = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user.id;
	const forecastCityId = +req.params.id;
	const data = req.body;

	const result = await forecastCityServices.updateForecastCity(
		forecastCityId,
		data,
		userId,
	);
	res.status(httpStatus.OK).json(result);
});

const deleteForecastCity = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user.id;

	const forecastCityId = +req.params.id;
	const result = await forecastCityServices.deleteForecastCity(
		forecastCityId,
		userId,
	);
	res.status(httpStatus.OK).json(result);
});
export default {
	createForecastCity,
	getAllForecastCities,
	getForecastCityById,
	updateForecastCity,
	deleteForecastCity,
};
