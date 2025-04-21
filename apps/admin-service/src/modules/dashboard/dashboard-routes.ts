import express, { Router } from 'express';

import dashboardController from './dashboard-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import dashboardValidation from './dashboard-validation';
// import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();


router.route('/all-data').get(verifyToken, dashboardController.getSummary);
router.route('/barchart-data').get(verifyToken,validateSchema(dashboardValidation.paramsSchema) ,dashboardController.getBarChartData);






export default router;
