import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../../../shared/utils/catch-async';
import authService from './auth-service';
// import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../helper/jwtToken';

// Controller for verifying phone and sending OTP
const verifyPhoneAndSendOTP = catchAsync(
	async (req: Request, res: Response) => {
		const { firstName, lastName, email, password } = req.body; // Destructure body
		const result = await authService.verifyPhoneAndSendOTP({
			firstName,
			lastName,
			email,
			password,
		});
		res.status(httpStatus.OK).json(result);
	},
);

export default {
	verifyPhoneAndSendOTP,
};
