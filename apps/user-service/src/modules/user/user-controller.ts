import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import userService from './user-service';
import pick from '../../../../../shared/utils/pick';

// Controller to get userList
const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const files = req.files;

	if (!files || !Array.isArray(files)) {
		throw new Error('No files uploaded');
	}

	const file = files[0];
	console.log('Uploaded file:', file);

	if (!file) {
		return res.status(400).json({ error: 'File is required.' });
	}
	const result = await userService.uploadProfileImage(userId, file);
	res.status(httpStatus.OK).json(result);
});

// Controller to update user profile
const updateProfile = catchAsync(async (req: Request, res: Response) => {
	const userId = req.payload.id;
	const data = req.body;
	const result = await userService.updateProfile(data, userId);
	res.status(httpStatus.OK).json(result);
});

// Controller to get user by ID

const getUserById = catchAsync(async (req: Request, res: Response) => {
	const userId = +req.params.id;
	const result = await userService.getUserByID(userId);
	res.status(httpStatus.OK).json(result);
});

// Controller to delete user by ID
const deleteUser = catchAsync(async (req: Request, res: Response) => {
	const userId = +req.params.id;
	const result = await userService.deleteUser(userId);
	res.status(httpStatus.OK).json(result);
});

// Controller to get userList
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page']);

	const userData = await userService.getAllUsers(options);
	res.status(httpStatus.OK).json(userData);
});

const getGrowerByEmail = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id;
	const email = req.params.email;
	const result = await userService.getGrowerByEmail(applicatorId, email);
	res.status(httpStatus.OK).json(result);
});
const createGrower = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const applicatorId = req.payload.id;
	const result = await userService.createGrower(data, applicatorId);
	res.status(httpStatus.CREATED).json(result);
});
const getAllGrowersByApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const options = pick(req.query, ['limit', 'page', 'label',
			'searchValue',]);
		const applicatorId = req.payload.id;
		const result = await userService.getAllGrowersByApplicator(
			applicatorId,
			options,
		);
		res.status(httpStatus.OK).json(result);
	},
);

const updateInviteStatus = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const data = req.body;
	const result = await userService.updateInviteStatus(user, data);
	res.status(httpStatus.OK).json(result);
});
const getPendingInvites = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const options = pick(req.query, ['limit', 'page', 'label',
		'searchValue',]);
	const result = await userService.getPendingInvites(user, options);
	res.status(httpStatus.OK).json(result);
});

const deleteGrower = catchAsync(async (req: Request, res: Response) => {
	const growerId = +req.params.growerId;
	const applicatorId = req.payload.id;
	const result = await userService.deleteGrower(growerId, applicatorId);
	res.status(httpStatus.OK).json(result);
});
const deleteApplicator = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = +req.params.applicatorId;
	const growerId = req.payload.id;
	const result = await userService.deleteApplicator(growerId, applicatorId);
	res.status(httpStatus.OK).json(result);
});
const getAllApplicatorsByGrower = catchAsync(
	async (req: Request, res: Response) => {
		const options = pick(req.query, ['limit', 'page','label','searchValue']);

		const growerId = req.payload.id;
		const result = await userService.getAllApplicatorsByGrower(
			growerId,
			options,
		);
		res.status(httpStatus.OK).json(result);
	},
);

const updateArchivedStatus = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const data = req.body;
	const result = await userService.updateArchivedStatus(user, data);
	res.status(httpStatus.OK).json(result);
});
const getApplicatorByEmail = catchAsync(async (req: Request, res: Response) => {
	const growerId = req.payload.id;
	const email = req.params.email;
	const result = await userService.getApplicatorByEmail(growerId, email);
	res.status(httpStatus.OK).json(result);
});
const sendInviteToApplicator = catchAsync(
	async (req: Request, res: Response) => {
		const grower = req.user;
		const email = req.params.email;
		const data = req.body;
		const result = await userService.sendInviteToApplicator(
			email,
			grower,
			data,
		);
		res.status(httpStatus.OK).json(result);
	},
);

const sendInviteToGrower = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const growerId = +req.params.growerId;
	const data = req.body;
	const result = await userService.sendInviteToGrower(user, growerId, data);
	res.status(httpStatus.OK).json(result);
});

// Controller to get user by ID

const getGrowerById = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = req.payload.id;
	const growerId = +req.params.growerId;
	const result = await userService.getGrowerById(applicatorId, growerId);
	res.status(httpStatus.OK).json(result);
});

const getPendingInvitesFromOthers = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user;
		const options = pick(req.query, ['limit', 'page', 'label',
		'searchValue']);
		const result = await userService.getPendingInvitesFromOthers(
			user,
			options,
		);
		res.status(httpStatus.OK).json(result);
	},
);
const verifyInviteToken = catchAsync(async (req: Request, res: Response) => {
	const { token } = req.body;
	const result = await userService.verifyInviteToken(token);
	res.status(httpStatus.OK).json(result);
});
const getWeather = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const options = pick(req.query, ['city']);
	const result = await userService.getWeather(user, options);
	res.status(httpStatus.OK).json(result);
});
const getWeatherV2 = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const options = pick(req.query, ['city']);
	const result = await userService.getWeatherV2(user, options);
	res.status(httpStatus.OK).json(result);
});
const acceptOrRejectInviteThroughEmail = catchAsync(
	async (req: Request, res: Response) => {
		const { token, status, canManageFarms, farmPermissions } = req.body;
		const result = await userService.acceptOrRejectInviteThroughEmail(
			token,
			status,
			canManageFarms,
			farmPermissions,
		);
		res.status(httpStatus.OK).json(result);
	},
);
const getApplicatorById = catchAsync(async (req: Request, res: Response) => {
	const applicatorId = +req.params.applicatorId;
	const user = req.user;
	const result = await userService.getApplicatorById(user, applicatorId);
	res.status(httpStatus.OK).json(result);
});
const getUsersByState = catchAsync(async (req: Request, res: Response) => {
	// const days = req?.query?.days as string;  // expecting last 30 or 7 days
	const user = req.user
	const userData = await userService.getUsersByState(user);
	res.status(httpStatus.OK).json(userData);
});

const updateGrowerName = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const data = req.body;
	const growerId = +req.params.growerId
	const result = await userService.updateGrowerName(user, data,growerId);
	res.status(httpStatus.OK).json(result);
});
export default {
	uploadProfileImage,
	getUserById,
	updateProfile,
	deleteUser,
	getAllUsers,
	getGrowerByEmail,
	createGrower,
	getAllGrowersByApplicator,
	updateInviteStatus,
	getPendingInvites,
	deleteGrower,
	updateArchivedStatus,
	getAllApplicatorsByGrower,
	sendInviteToApplicator,
	sendInviteToGrower,
	getGrowerById,
	getApplicatorByEmail,
	deleteApplicator,
	getPendingInvitesFromOthers,
	verifyInviteToken,
	getWeather,
	getWeatherV2,
	acceptOrRejectInviteThroughEmail,
	getApplicatorById,
	getUsersByState,
	updateGrowerName
};
