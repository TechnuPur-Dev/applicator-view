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
	.get(verifyToken,  integrationController.getOrganizationsById);	
router
	.route('/john-deere/organizations/all-farms/:orgId')
	.get(verifyToken, integrationController.getOrgAllFarmsByOrgId);	
router
	.route('/john-deere/organizations/farms/:orgId/:farmId')
	.get(verifyToken, integrationController.getOrgFarmById);	
router
	.route('/john-deere/organizations/farms/all-fields/:orgId/:farmId')
	.get(verifyToken, integrationController.getOrgAllFieldsByFarmId);
router
	.route('/john-deere/organizations/fields/:orgId/:fieldId')
	.get(verifyToken, integrationController.getOrgFieldByFieldId);
router
	.route('/john-deere/organizations/fields/all-boundaries/:orgId/:fieldId')
	.get(verifyToken, integrationController.getAllBoundariesByFieldId);
	router
	.route('/john-deere/organizations/boundaries/:orgId/:fieldId/:boundId')
	.get(verifyToken, integrationController.getFieldBoundariesById);
export default router;
