import express, { Router } from 'express';
import integrationController from './integration-controller';
// import validateSchema from '../../../../../shared/middlewares/validation-middleware';
// import viewValidation from './integration-validation';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
// import validateSchema from '../../../../../shared/middlewares/validation-middleware';
// import integrationValidation from './integration-validation';

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
router
	.route('/john-deere/organizations/:orgId')
	.get(verifyToken, integrationController.getOrganizationById);
router
	.route('/john-deere/farms/:orgId')
	.get(verifyToken, integrationController.getFarmsByOrgId);
router
	.route('/john-deere/farms/:orgId/:farmId')
	.get(verifyToken, integrationController.getOrgFarmById);
router
	.route('/john-deere/fields/:orgId/:farmId')
	.get(verifyToken, integrationController.getFieldsByFarmId);
router
	.route('/john-deere/fields/by-id/:orgId/:fieldId')
	.get(verifyToken, integrationController.getOrgFieldByFieldId);
router
	.route('/john-deere/boundaries/:orgId/:fieldId')
	.get(verifyToken, integrationController.getBoundariesByFieldId);
router
	.route('/john-deere/boundaries/:orgId/:fieldId/:boundId')
	.get(verifyToken, integrationController.getFieldBoundaryById);
export default router;
