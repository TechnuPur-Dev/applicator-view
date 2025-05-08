import express, { Router } from 'express';

import accounts from './accounts/accounts-routes';
import dasboard from './dashboard/dashboard-routes'
import adminUser from './adminControls/admin-user-routes'
import { BASE_URI } from '../global/baseUri'; // Assuming BASE_URI is exported as a named export

const router: Router = express.Router();

// Define an array of routes with the path and corresponding route handler
const defaultRoutes = [
	
	{
		path: '/accounts', // Path for the user routes
		route: accounts,
	},
	{
		path: '/admin/dashboard', // Path for the user routes
		route: dasboard,
	},
	{
		path: '/admin', // Path for the user routes
		route: adminUser,
	},


];

// Dynamically add routes to the main router
defaultRoutes.forEach((route) => {
	router.use(BASE_URI + route.path, route.route); // Combine BASE_URI with the path for each route
});

export default router;
