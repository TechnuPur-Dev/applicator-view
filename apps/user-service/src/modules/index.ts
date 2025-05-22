import express, { Router } from 'express';
import auth from './auth/auth-routes';
import user from './user/user-routes';
import field from './field/field-routes';
import farm from './farm/farm-routes';
import table from './table-view/table-view-routes';
import applicatorWorker from './applicator-workers/applicator-workers-routes';
import forecastCity from './forecast-city/forecast-city-routes';
import permission from './permission/permission-routes';

import geoData from './geo-data/geo-data-routes';
import userNotification from './notification/notification-routes';
import applicatorUser from './applicator-users/applicator-users-routes';
import certification from './certification/certification-routes';
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
	{
		path: '/field', // Path for the field routes
		route: field,
	},
	{
		path: '/farm', // Path for the farm routes
		route: farm,
	},
	{
		path: '/table', // Path for the table-view routes
		route: table,
	},
	{
		path: '/applicator-workers',
		route: applicatorWorker,
	},
	{
		path: '/geo-data', // Path for the geo-data routes
		route: geoData,
	},
	{
		path: '/notification', // Path for the geo-data routes
		route: userNotification,
	},
	{
		path: '/forecast-city',
		route: forecastCity,
	},
	{
		path: '/applicator-users',
		route: applicatorUser,
	},
	{
		path: '/permission',
		route: permission,
	},
	{
		path: '/certification',
		route: certification,
	},
];

// Dynamically add routes to the main router
defaultRoutes.forEach((route) => {
	router.use(BASE_URI + route.path, route.route); // Combine BASE_URI with the path for each route
});

export default router;
