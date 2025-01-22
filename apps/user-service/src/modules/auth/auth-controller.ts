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
	const { email, password } = req.body; // Destructure body
	const result = await authService.loginUser({
		email,
		password,
	});
	res.status(httpStatus.OK).json(result);
});
export default {
	registerUser,
	verifyEmailAndSendOTP,
	verifyOTPAndRegisterEmail,
	loginUser,
};
