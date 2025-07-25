import express, { Router } from 'express';
import job from './job/job-routes';
import supportTicket from './support-ticket/support-ticket-routes';
import warrantyRegistration from './warranty-registeration/warranty-registration-routes';
import product from './product/product-routes';
import integration from './integration/integration-routes';
import equipment from './equipment/equipment-routes'
import { BASE_URI } from '../global/baseUri'; // Assuming BASE_URI is exported as a named export

const router: Router = express.Router();

// Define an array of routes with the path and corresponding route handler
const defaultRoutes = [
	{
		path: '/job', // Path for the job routes
		route: job,
	},
	{
		path: '/support-ticket', // Path for the farms routes
		route: supportTicket,
	},
	{
		path: '/warranty-registration',
		route: warrantyRegistration,
	},
	{
		path: '/product', // Path for the farms routes
		route: product,
	},
	{
		path: '/integration', // Path for the integration routes
		route: integration,
	},
	{
		path: '/equipment', // Path for the integration routes
		route: equipment,
	},
];

// Dynamically add routes to the main router
defaultRoutes.forEach((route) => {
	router.use(BASE_URI + route.path, route.route); // Combine BASE_URI with the path for each route
});

export default router;
