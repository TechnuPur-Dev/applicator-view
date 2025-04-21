import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import dashboardService from './dashboard-service';
import {  UserRole } from '@prisma/client';
// import pick from '../../../../../shared/utils/pick';



// Controller to get userList
const getSummary  = catchAsync(async (req: Request, res: Response) => {

	const userData = await dashboardService.getSummary();
	res.status(httpStatus.OK).json(userData);
});
const getBarChartData  = catchAsync(async (req: Request, res: Response) => {
    const role = req?.query?.searchValue as UserRole
	const userData = await dashboardService.getBarChartData(role);
	res.status(httpStatus.OK).json(userData);
});


export default {
	getSummary ,
	getBarChartData
};
