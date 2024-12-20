// Import necessary modules
import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';

import ApiError from '../../../../../shared/utils/api-error';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { VerifyPhoneRequestBody } from './auth-types';

// Service for verifying phone and sending OTP
const verifyPhoneAndSendOTP = async (data: VerifyPhoneRequestBody) => {
	try {
		const { firstName, lastName, email, password } = data;

		// Create user in the database
		const user = await prisma.user.create({
			data: {
				firstName,
				lastName,
				email,
				password,
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

export default {
	verifyPhoneAndSendOTP,
};
