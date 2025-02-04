import express, { Router } from 'express';
import job from './job/job-routes';
import supportTicket from './support-ticket/support-ticket-routes';

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
];

// Dynamically add routes to the main router
defaultRoutes.forEach((route) => {
	router.use(BASE_URI + route.path, route.route); // Combine BASE_URI with the path for each route
});

export default router;
