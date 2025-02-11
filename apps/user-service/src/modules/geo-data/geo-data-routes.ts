import express, { Router } from 'express';

import geoDataController from './geo-data-controller';
const router: Router = express.Router();

router.route('/state/create').post(geoDataController.createStates);
router.route('/county/create').post(geoDataController.createCounties);
router.route('/township/create').post(geoDataController.createTownships);
export default router;
