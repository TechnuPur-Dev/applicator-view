import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import authService from './auth-service';

// Controller for verifying phone and sending OTP
const registerUser = catchAsync(async (req: Request, res: Response) => {
	const result = await authService.registerUser(req.body);
	res.status(httpStatus.OK).json(result);
});
const verifyEmailAndSendOTP = catchAsync(
	async (req: Request, res: Response) => {
		const { email } = req.body; // Destructure body
		const result = await authService.verifyEmailAndSendOTP(email);
		res.status(httpStatus.OK).json(result);
	},
);

const verifyOTPAndRegisterEmail = catchAsync(async (req, res) => {
	const result = await authService.verifyOTPAndRegisterEmail(req.body);
	res.status(httpStatus.CREATED).json(result);
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
	const { email, password, deviceToken, role } = req.body; // Destructure body
	const result = await authService.loginUser({
		email,
		password,
		deviceToken,
		role,
	});
	res.status(httpStatus.OK).json(result);
});
const resendOTP = catchAsync(async (req: Request, res: Response) => {
	const { email } = req.body; // Destructure body
	const result = await authService.resendOTP(email);
	res.status(httpStatus.OK).json(result);
});
// Controller to update user profile
const acceptInviteAndSignUp = catchAsync(
	async (req: Request, res: Response) => {
		const data = req.body;
		const { canManageFarms, farmPermissions, ...userData } = data;
		const result = await authService.acceptInviteAndSignUp(
			userData,
			canManageFarms,
			farmPermissions,
		);
		res.status(httpStatus.OK).json(result);
	},
);
const updatePassword = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const { currentPassword, newPassword } = req.body;
	const result = await authService.updatePassword(
		user,
		currentPassword,
		newPassword,
	);
	res.status(httpStatus.OK).json(result);
});

const sendOTP = catchAsync(async (req: Request, res: Response) => {
	const { email } = req.body; // Destructure body
	const result = await authService.sendOTP(email);
	res.status(httpStatus.OK).json(result);
});

const verifyOTP = catchAsync(async (req, res) => {
	const result = await authService.verifyOTP(req.body);
	res.status(httpStatus.CREATED).json(result);
});

export default {
	registerUser,
	verifyEmailAndSendOTP,
	verifyOTPAndRegisterEmail,
	loginUser,
	resendOTP,
	acceptInviteAndSignUp,
	updatePassword,
	sendOTP,
	verifyOTP,
};
