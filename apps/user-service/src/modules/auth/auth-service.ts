// Import necessary modules
import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';

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
	signUpUserSchema,
} from './auth-types';
import { generateOTP } from '../../utils/generate-otp';
import { verifyInvite } from '../../helper/invite-token';

// Service for verifying phone and sending OTP
const registerUser = async (data: RegisterUser) => {
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
		stateId,
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
			stateId,
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
};
const loginUser = async (data: LoginUser) => {
	const { email, password, deviceToken, role } = data;

	const user = await prisma.user.findFirst({
		where: {
			email: {
				equals: email,
				mode: 'insensitive',
			},
			role,
		},
		include: {
			state: {
				select: {
					name: true,
				},
			},
		},
		omit: {
			updatedAt: true,
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
		throw new ApiError(httpStatus.UNAUTHORIZED, 'Password is incorrect.');
	} else {
		if (deviceToken) {
			const existingDeviceToken = await prisma.deviceToken.findFirst({
				where: { userId: user.id },
			});

			if (existingDeviceToken) {
				await prisma.deviceToken.update({
					where: { id: existingDeviceToken.id },
					data: { token: deviceToken },
				});
			} else {
				await prisma.deviceToken.create({
					data: { userId: user.id, token: deviceToken },
				});
			}
		}
		const accessToken = await signAccessToken(user.id);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password, state, ...userWithoutPassword } = user; // Exclude password
		return {
			user: { ...userWithoutPassword, state: state?.name },
			accessToken,
		};
	}
};
const verifyEmailAndSendOTP = async (email: string) => {
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
const resendOTP = async (email: string) => {
	const user = await prisma.user.findFirst({
		where: {
			email: {
				equals: email,
				mode: 'insensitive',
			},
			profileStatus: 'COMPLETE',
		},
		select: { id: true },
	});

	if (!user) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'No account found with this email.',
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

	const subject = 'Resend OTP Verification';
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

	return { otp };
};

// to update user profile
const acceptInviteAndSignUp = async (data: signUpUserSchema) => {
	let { password } = data;
	const { token, firstName, lastName } = data;

	// Verify token and extract role
	const role = verifyInvite(token);
	if (!role) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'Invalid or expired token.',
		);
	}

	// Hash password if provided
	if (password) {
		password = await hashPassword(password);
	}

	// Determine the user based on role and update accordingly
	if (role === 'GROWER') {
		await prisma.applicatorGrower.update({
			where: {
				inviteToken: token,
				grower: { profileStatus: 'INCOMPLETE' },
			},
			data: {
				inviteStatus: 'ACCEPTED',
				grower: {
					update: {
						...data,
						password,
						fullName: `${firstName || ''} ${lastName || ''}`.trim(),
						profileStatus: 'COMPLETE',
						joiningDate: new Date(),
					},
				},
			},
			select: {
				grower: { include: { state: { select: { name: true } } } },
			},
		});
	} else if (role === 'APPLICATOR') {
		await prisma.$transaction(async (prisma) => {
			const invite = await prisma.applicatorGrower.update({
				where: {
					inviteToken: token,
					// applicator: { profileStatus: 'INCOMPLETE' },
				},
				data: {
					inviteStatus: 'ACCEPTED',
					applicatorFirstName: firstName,
					applicatorLastName: lastName,
					applicator: {
						create: {
							role: 'APPLICATOR',
							...(() => {
								// eslint-disable-next-line @typescript-eslint/no-unused-vars
								const { stateId, token, ...rest } = data; // Exclude stateId
								return rest;
							})(),
							password,
							fullName:
								`${firstName || ''} ${lastName || ''}`.trim(),
							profileStatus: 'COMPLETE',
							joiningDate: new Date(),
							state: data.stateId
								? { connect: { id: data.stateId } }
								: undefined,
						},
					},
				},
				select: {
					id: true,
					applicator: {
						select: { id: true, state: { select: { name: true } } },
					},
					pendingFarmPermission: true,
				},
			});

			// Ensure `applicator` exists before proceeding
			if (!invite.applicator || invite.applicator.id === undefined) {
				throw new Error('Applicator ID is missing');
			}

			// Ensure `pendingFarmPermission` is an array before mapping over it
			if (
				Array.isArray(invite.pendingFarmPermission) &&
				invite.pendingFarmPermission.length > 0
			) {
				await prisma.farmPermission.createMany({
					data: invite.pendingFarmPermission.map((perm) => ({
						farmId: perm.farmId,
						applicatorId: invite.applicator?.id ?? 0, // ✅ Use safe optional chaining with a default value
						canView: perm.canView,
						canEdit: perm.canEdit,
					})),
				});
			}

			// Delete pending permissions only if `invite.id` is valid
			await prisma.pendingFarmPermission.deleteMany({
				where: { inviteId: invite.id },
			});
		});
	} else if (role === 'WORKER') {
		await prisma.applicatorWorker.update({
			where: {
				inviteToken: token,
				worker: { profileStatus: 'INCOMPLETE' },
			},
			data: {
				inviteStatus: 'ACCEPTED',
				worker: {
					update: {
						...data,
						password,
						fullName: `${firstName || ''} ${lastName || ''}`.trim(),
						profileStatus: 'COMPLETE',
						joiningDate: new Date(),
					},
				},
			},
			select: {
				worker: { include: { state: { select: { name: true } } } },
			},
		});
	} else {
		throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid role in token.');
	}
	return {
		message: 'Invite accepted successfully.',
	};
};

export default {
	registerUser,
	loginUser,
	verifyEmailAndSendOTP,
	verifyOTPAndRegisterEmail,
	resendOTP,
	acceptInviteAndSignUp,
};
