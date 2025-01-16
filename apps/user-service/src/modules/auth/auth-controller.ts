import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import authService from './auth-service';
// import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../helper/jwtToken';

// Controller for verifying phone and sending OTP
const registerUser = catchAsync(async (req: Request, res: Response) => {
	const {
		profileImage,
		thumbnailProfileImage,
		firstName,
		lastName,
		email,
		phoneNumber,
		password,
		role,
		businessName,
		experience,
		address1,
		address2,
		state,
		county,
		township,
		zipCode,
		bio,
		additionalInfo,
	} = req.body; // Destructure body
	const result = await authService.registerUser({
		profileImage,
		thumbnailProfileImage,
		firstName,
		lastName,
		email,
		phoneNumber,
		password,
		role,
		businessName,
		experience,
		address1,
		address2,
		state,
		county,
		township,
		zipCode,
		bio,
		additionalInfo,
	});
	res.status(httpStatus.OK).json(result);
});
const verifyEmail = catchAsync(async (req: Request, res: Response) => {
	const { email } = req.body; // Destructure body
	const result = await authService.verifyEmail(email);
	res.status(httpStatus.OK).json(result);
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
	verifyEmail,
	loginUser,
};
