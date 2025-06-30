import express, { Router } from 'express';
import integrationController from './integration-controller';
// import validateSchema from '../../../../../shared/middlewares/validation-middleware';
// import viewValidation from './integration-validation';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';

const router: Router = express.Router();

// Define routes
router
	.route('/john-deere/auth-url')
	.get(verifyToken, integrationController.getAuthUrl);
router
	.route('/john-deere/token')
	.post(verifyToken, integrationController.getAuthTokens);
router
	.route('/john-deere/organizations')
	.get(verifyToken, integrationController.getOrganizations);

export default router;
