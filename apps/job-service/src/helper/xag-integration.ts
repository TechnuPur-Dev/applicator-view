/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import config from '../config/env-config';

// axios headers
const headers = {
	'Content-Type': 'application/json',
	Accept: 'application/json',
};

// Factory to create Axios clients
const createClient = (baseURL: string): AxiosInstance =>
	axios.create({
		baseURL,
		headers,
		maxContentLength: Infinity,
		maxBodyLength: Infinity,
		httpsAgent: new https.Agent({
			rejectUnauthorized: false,
		}),
	});

// Create clients
const client = createClient(config.xag_base_url);

// Define data type
type RequestData = Record<string, any>;

// Wallet-related API calls
const inviteUrl = (data: RequestData) =>
	client.post('/open-api/xag_open_uav/invite-url', data);
const bindDevices = (data: RequestData) =>
	client.post('/open-api/xag_open_uav/bind-devices', data);
const devicesPage = (data: RequestData) =>
	client.post('/open-api/xag_open_uav/devices-page', data);
const worksPage = (data: RequestData) =>
	client.post('/open-api/xag_open_uav/works-page', data);
const workReport = (data: RequestData) =>
	client.post('/open-api/xag_open_uav/work-report', data);

// Export grouped API
export const apis = {
	inviteUrl,
	bindDevices,
	devicesPage,
	worksPage,
	workReport,
};
