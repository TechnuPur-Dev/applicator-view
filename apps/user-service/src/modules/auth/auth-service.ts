// Import necessary modules
import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';

import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { hashPassword, comparePassword } from '../../helper/bcrypt';
import { signAccessToken } from '../../../../../shared/helpers/jwt-token';

import { RegisterUser, LoginUser } from './auth-types';

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
const verifyEmail = async (email: string) => {
	try {
		const isEmailExist = await prisma.user.findFirst({
			where: {
				email: {
					equals: email,
					mode: 'insensitive',
				},
			},
			select: {
				id: true, // Omit password from the response to prevent exposing it to clients
			},
		});

		if (isEmailExist) {
			throw new ApiError(
				httpStatus.NOT_FOUND,
				'Email already exists. Please use a different email.',
			);
		}
		return {
			message: 'Email is available.',
		};
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(error.statusCode, error.message);
		}
	}
};

export default {
	registerUser,
	loginUser,
	verifyEmail,
};
