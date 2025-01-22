// Import necessary modules
import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';

import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { hashPassword, comparePassword } from '../../helper/bcrypt';
import { signAccessToken } from '../../../../../shared/helpers/jwt-token';
import { sendEmail } from '../../../../../shared/helpers/node-mailer';
import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
import {
	RegisterUser,
	LoginUser,
	verifyOTPAndRegisterEmail,
} from './auth-types';
import { generateOTP } from '../../utils/generate-otp';

// Service for verifying phone and sending OTP
const registerUser = async (data: RegisterUser) => {
	try {
		const {
			profileImage,
			thumbnailProfileImage,
			firstName,
			lastName,
			email,
			phoneNumber,
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
		} = data;
		let { password } = data;

		// check if email already exists
		if (data?.email) {
			const found = await prisma.user.findFirst({
				where: {
					email: {
						equals: data.email,
						mode: 'insensitive',
					},
				},
				select: { email: true },
			});

			if (found) {
				throw new ApiError(httpStatus.CONFLICT, 'Email already exist.');
			}
		}

		// hash the password only if it is provided
		if (password) {
			const hashedPassword = await hashPassword(data.password);
			password = hashedPassword;
		}

		const user = await prisma.user.create({
			data: {
				profileImage,
				thumbnailProfileImage,
				firstName,
				lastName,
				fullName: `${firstName} ${lastName}`,
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
			},
			omit: {
				password: true, // Omit password from the response to prevent exposing it to clients
			},
		});

		return user;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// Handle Prisma-specific error codes
			if (error.code === 'P2002') {
				throw new ApiError(
					httpStatus.CONFLICT,
					'A user with this email already exists.',
				);
			}
		}

		if (error instanceof Error) {
			// Handle generic errors
			throw new ApiError(httpStatus.CONFLICT, error.message);
		}
	}
};
const loginUser = async (data: LoginUser) => {
	try {
		const { email, password } = data;

		const user = await prisma.user.findFirst({
			where: {
				email: {
					equals: email,
					mode: 'insensitive',
				},
			},
		});

		if (!user) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'User not found with this email.',
			);
		}

		if (!user.password) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				"User's password is missing from database.",
			);
		}

		// Bypass password check with a static password "clync@123"
		const isPasswordValid = await comparePassword(password, user.password);

		if (!isPasswordValid) {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				'Password is incorrect.',
			);
		} else {
			const accessToken = await signAccessToken(user.id);

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { password, ...userWithoutPassword } = user; // Exclude password
			return {
				user: { ...userWithoutPassword },
				accessToken,
			};
		}
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
	}
};
const verifyEmailAndSendOTP = async (email: string) => {
	try {
		const isEmailExist = await prisma.user.findFirst({
			where: {
				email: {
					equals: email,
					mode: 'insensitive',
				},
				profileStatus: 'COMPLETE',
			},
			select: {
				id: true, // Omit password from the response to prevent exposing it to clients
			},
		});

		if (isEmailExist) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'An account with this email already exists. Please use a different email.',
			);
		}
		const { otp, expiryTime } = generateOTP();
		await prisma.otp.upsert({
			where: { email },
			create: {
				email,
				otp,
				expiredAt: expiryTime,
			},
			update: {
				otp,
				expiredAt: expiryTime,
				createdAt: new Date(),
			},
		});

		const subject = 'OTP Verification';
		const message = `
		Please use the following OTP to verify your account:<br><br>
		<strong style="color: black; font-size: 1.5em;">${otp}</strong><br><br>
		This OTP is valid till ${expiryTime}.<br>
		If you did not request this, please ignore this email.
	  `;
		const html = await mailHtmlTemplate(subject, message);
		await sendEmail({
			emailTo: email,
			subject,
			text: 'Request Verification',
			html,
		});

		return {
			otp,
		};
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
	}
};
const verifyOTPAndRegisterEmail = async (body: verifyOTPAndRegisterEmail) => {
	const { email, otp, role } = body;

	// Fetch OTP record and validate existence
	const otpRecord = await prisma.otp.findFirst({
		where: { email },
	});

	if (!otpRecord) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'There is no otp exist against this email.',
		);
	}

	const currentTime = new Date();

	// Validate OTP expiration
	if (otpRecord.expiredAt < currentTime) {
		throw new ApiError(
			httpStatus.GONE,
			'The OTP has expired. Please request a new one.',
		);
	}

	// Validate OTP value (allowing a master override code for debugging/testing)
	const MASTER_OTP = 201299;
	if (otpRecord.otp !== otp && otp !== MASTER_OTP) {
		throw new ApiError(httpStatus.UNAUTHORIZED, 'The OTP is incorrect.');
	}

	// Register the user
	const user = await prisma.user.upsert({
		where: {
			email,
		},
		create: {
			email,
			role,
		},
		update: {},
		select: { id: true },
	});

	// Clear the OTP to prevent re-use
	await prisma.otp.delete({
		where: { id: otpRecord.id },
	});

	// Generate and return access token
	const accessToken = await signAccessToken(user.id);

	return {
		accessToken,
	};
};

export default {
	registerUser,
	loginUser,
	verifyEmailAndSendOTP,
	verifyOTPAndRegisterEmail,
};
