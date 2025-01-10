import express, { Router } from 'express';
import auth from './auth/auth-routes';
import user from './user/user-routes';
import { BASE_URI } from '../global/baseUri'; // Assuming BASE_URI is exported as a named export

const router: Router = express.Router();

// Define an array of routes with the path and corresponding route handler
const defaultRoutes = [
	{
		path: '/auth', // Path for the auth routes
		route: auth,
	},
	{
		path: '/user', // Path for the user routes
		route: user,
	},
];

// Dynamically add routes to the main router
defaultRoutes.forEach((route) => {
	router.use(BASE_URI + route.path, route.route); // Combine BASE_URI with the path for each route
});

export default router;
