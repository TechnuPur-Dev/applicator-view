import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import applicatorUserServices from './applicator-users-services';
import pick from '../../../../../shared/utils/pick';

//search applicator user by email
const searchApplicatorUserByEmail = catchAsync(
	async (req: Request, res: Response) => {
		const applicatorId = req.payload.id;
		const email = req.params.email;
		const result = await applicatorUserServices.searchApplicatorUserByEmail(
			applicatorId,
			email,
		);
		res.status(httpStatus.OK).json(result);
	},
);

const createApplicatorUser = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const data = req.body;
	const result = await applicatorUserServices.createApplicatorUser(
		currentUser,
		data,
	);
	res.status(httpStatus.CREATED).json(result);
});

const sendInviteToUser = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id;
	const data = req.body;
	const result = await applicatorUserServices.sendInviteToUser(
		applicatorId,
		data,
	);
	res.status(httpStatus.OK).json(result);
});
const getAllApplicatorUser = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);
	const applicatorId = req.payload.id;
	const UserData = await applicatorUserServices.getAllApplicatorUser(
		applicatorId,
		options,
	);
	res.status(httpStatus.OK).json(UserData);
});
const deleteApplicatorUser  = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id;
	const applicatorUserId = +req.params.id
	const UserData = await applicatorUserServices.deleteApplicatorUser(
		applicatorId,
		applicatorUserId
	);
	res.status(httpStatus.OK).json(UserData);
});
export default {
	getAllApplicatorUser,
	searchApplicatorUserByEmail,
	createApplicatorUser,
	sendInviteToUser,
	deleteApplicatorUser
};
