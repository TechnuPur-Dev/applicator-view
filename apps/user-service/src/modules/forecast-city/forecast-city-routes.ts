import express, { Router } from 'express';

import forecastCity from './forecast-city-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import forecastCityValidation from './forecast-city-validation';
const router: Router = express.Router();

router
	.route('/create')
	.post(
		verifyToken,
		validateSchema(forecastCityValidation.createSchema),
		forecastCity.createForecastCity,
	);
router.route('/get/all').get(verifyToken, forecastCity.getAllForecastCities);
router
	.route('/get/by-id/:id')
	.get(
		verifyToken,
		validateSchema(forecastCityValidation.paramsSchema),
		forecastCity.getForecastCityById,
	);
router
	.route('/update/:id')
	.put(
		verifyToken,
		validateSchema(forecastCityValidation.updateSchema),
		forecastCity.updateForecastCity,
	);
router
	.route('/delete/:id')
	.delete(
		verifyToken,
		validateSchema(forecastCityValidation.paramsSchema),
		forecastCity.deleteForecastCity,
	);
	export default router;
