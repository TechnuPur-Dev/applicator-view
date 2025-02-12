import express, { Router } from 'express';
import geoDataValidation from './geo-data-validation';
import geoDataController from './geo-data-controller';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import { } from '../../../../../shared/middlewares/auth-middleware';
const router: Router = express.Router();

router.route('/state/create').post(geoDataController.createStates);
router.route('/county/create').post(geoDataController.createCounties);
router.route('/township/create').post(geoDataController.createTownships);
router.route('/all-states').get( geoDataController.getAllStates);
router.route('/all-counties').get( geoDataController.getAllCounties);
router.route('/all-townships').get( geoDataController.getAllTownships);
router.route('/delete-state/:stateId').delete(validateSchema(geoDataValidation.paramsSchema),geoDataController.deleteState);
router.route('/delete-county/:countyId').delete( validateSchema(geoDataValidation.paramsSchema),geoDataController.deleteCounty);
router.route('/delete-township/:townshipId').delete(validateSchema(geoDataValidation.paramsSchema), geoDataController.deleteTownship);
router.route('/update-state/:stateId').put(validateSchema(geoDataValidation.stateUpdateSchema), geoDataController.updateState);
router.route('/update-county/:countyId').put(validateSchema(geoDataValidation.countyUpdateSchema), geoDataController.updateCounty);
router.route('/update-township/:townshipId').put(validateSchema(geoDataValidation.townshipUpdateSchema), geoDataController.updateTownship);



    
export default router;
