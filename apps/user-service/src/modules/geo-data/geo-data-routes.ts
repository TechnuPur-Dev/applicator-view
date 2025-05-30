import express, { Router } from 'express';
import geoDataValidation from './geo-data-validation';
import geoDataController from './geo-data-controller';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
const router: Router = express.Router();

router
	.route('/county/create')
	.post(verifyToken, geoDataController.createCounties);
router
	.route('/township/create')
	.post(verifyToken, geoDataController.createTownships);
router.route('/all-states').get(geoDataController.getAllStates);
router
	.route('/all-counties')
	.get(verifyToken, geoDataController.getAllCounties);
router
	.route('/all-townships')
	.get(verifyToken, geoDataController.getAllTownships);

router
	.route('/delete-county/:countyId')
	.delete(
		verifyToken,
		validateSchema(geoDataValidation.paramsSchema),
		geoDataController.deleteCounty,
	);
router
	.route('/delete-township/:townshipId')
	.delete(
		verifyToken,
		validateSchema(geoDataValidation.paramsSchema),
		geoDataController.deleteTownship,
	);

router
	.route('/update-county/:countyId')
	.put(
		verifyToken,
		validateSchema(geoDataValidation.countyUpdateSchema),
		geoDataController.updateCounty,
	);
router
	.route('/update-township/:townshipId')
	.put(
		verifyToken,
		validateSchema(geoDataValidation.townshipUpdateSchema),
		geoDataController.updateTownship,
	);
router
	.route('/get-counties/:stateId')
	.get(
		verifyToken,
		validateSchema(geoDataValidation.paramsSchema),
		geoDataController.getCountiesByState,
	);
router
	.route('/get-townships/:countyId')
	.get(
		verifyToken,
		validateSchema(geoDataValidation.paramsSchema),
		geoDataController.getTownshipsByCounty,
	);
router.route('/address-validate').get(geoDataController.validateAddress);
router.route('/get-city/by-zip').get(geoDataController.getCityByZip);
router.route('/search-city').get(geoDataController.searchCity);
router.route('/us-address').get(geoDataController.getValidateUSAddress);
export default router;
