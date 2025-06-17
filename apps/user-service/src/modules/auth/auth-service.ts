/* eslint-disable @typescript-eslint/no-unused-vars */
import httpStatus from 'http-status';

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
import { User } from '../../../../../shared/types/global';

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
	const subject = 'Welcome to Acre Connect!';

	const message = `<p>Hi ${firstName} ${lastName},</p><br><br>
	<p>Welcome to Acre Connect! We’re excited to have you onboard.</p><br><br>
           <p>If you have any questions, feel free to reach out.</p><br><br>
           <p>Best Regards,<br>Acre Connect Team</p><br><br>
	  If you did not expect this, please ignore this email.
	`;

	const html = await mailHtmlTemplate(subject, message);

	await sendEmail({
		emailTo: email,
		subject,
		text: 'Welcome to Acre Connect!',
		html,
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
		if (role === 'WORKER') {
			await prisma.applicatorWorker.updateMany({
				where: {
					workerId: user.id,
				},
				data: {
					lastLogin: new Date(), // Set current timestamp if null/undefined
				},
			});
		}
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
const acceptInviteAndSignUp = async (
	data: signUpUserSchema,
	canManageFarms: boolean,
	farmPermissions: {
		farmId: number;
		canView: boolean;
		canEdit: boolean;
	}[],
) => {
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
	let email;

	// Determine the user based on role and update accordingly
	if (role === 'GROWER') {
		const invite = await prisma.applicatorGrower.update({
			where: {
				inviteToken: token,
				expiresAt: {
					gte: new Date(), // Ensures the invite is still valid
				},
				grower: {
					is: {
						profileStatus: 'INCOMPLETE',
					},
				},
			},
			data: {
				inviteStatus: 'ACCEPTED',
				canManageFarms:
					canManageFarms !== undefined ? canManageFarms : true,
				grower: {
					update: {
						...(() => {
							const { token, stateId, ...rest } = data;
							return rest;
						})(),
						password,
						fullName: `${firstName || ''} ${lastName || ''}`.trim(),
						profileStatus: 'COMPLETE',
						joiningDate: new Date(),
						stateId: data.stateId,
					},
				},
			},
			select: {
				id: true,
				grower: { include: { state: { select: { name: true } } } },
				applicator: {
					select: {
						id: true,
					},
				},
				pendingFarmPermission: true,
			},
		});
		// Ensure `pendingFarmPermission` is an array before mapping over it
		if (
			Array.isArray(invite.pendingFarmPermission) &&
			invite.pendingFarmPermission.length > 0
		) {
			await prisma.farmPermission.createMany({
				data: farmPermissions
					.filter((farm) => farm.canView) // filter where canView is true
					.map((perm) => ({
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
		email = invite.grower.email;
		await prisma.applicatorGrower.update({
			where: { id: invite.id },
			data: { inviteToken: null, expiresAt: null },
		});
	} else if (role === 'APPLICATOR') {
		await prisma.$transaction(async (prisma) => {
			const invite = await prisma.applicatorGrower.update({
				where: {
					inviteToken: token,
					expiresAt: {
						gte: new Date(), // Ensures the invite is still valid
					},
				},
				data: {
					inviteStatus: 'ACCEPTED',
					applicatorFirstName: firstName,
					applicatorLastName: lastName,
					applicator: {
						connectOrCreate: {
							where: { email: data.email }, // Assuming email is unique
							create: {
								role: 'APPLICATOR',
								...(() => {
									const { stateId, token, ...rest } = data;
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
				},
				select: {
					id: true,
					applicator: {
						select: {
							id: true,
							email: true,
							state: { select: { name: true } },
						},
					},
					pendingFarmPermission: true,
				},
			});

			// Ensure `applicator` exists before proceeding
			if (!invite.applicator?.id) {
				throw new Error('Applicator ID is missing');
			}

			// Ensure `pendingFarmPermission` is an array before mapping over it
			if (
				Array.isArray(invite.pendingFarmPermission) &&
				invite.pendingFarmPermission.length > 0
			) {
				await prisma.farmPermission.createMany({
					data: invite.pendingFarmPermission
						.filter(Boolean) // ✅ Remove null/undefined entries
						.map((perm) => ({
							farmId: perm.farmId,
							applicatorId: invite.applicator?.id ?? 0, // ✅ Avoid defaulting to `0`
							canView: perm.canView,
							canEdit: perm.canEdit,
						})),
				});
			}

			// Delete pending permissions only if `invite.id` is valid
			await prisma.pendingFarmPermission.deleteMany({
				where: { inviteId: invite.id },
			});
			email = invite.applicator.email;
			await prisma.applicatorGrower.update({
				where: { id: invite.id },
				data: { inviteToken: null, expiresAt: null },
			});
		});
	} else if (role === 'WORKER') {
		const invite = await prisma.applicatorWorker.update({
			where: {
				inviteToken: token,
				expiresAt: {
					gte: new Date(), // Ensures the invite is still valid
				},
				worker: {
					is: {
						profileStatus: 'INCOMPLETE',
					},
				},
			},
			data: {
				inviteStatus: 'ACCEPTED',
				pilotPestLicenseNumber: data.pilotPestLicenseNumber,
				businessLicenseNumber: data.businessLicenseNumber,
				pilotLicenseNumber: data.pilotLicenseNumber,
				planeOrUnitNumber: data.planeOrUnitNumber,
				worker: {
					update: {
						...(() => {
							const {
								pilotPestLicenseNumber,
								businessLicenseNumber,
								pilotLicenseNumber,
								planeOrUnitNumber,
								stateId,
								token,
								...rest
							} = data;
							return rest;
						})(),
						password,
						fullName: `${firstName || ''} ${lastName || ''}`.trim(),
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
				worker: { include: { state: { select: { name: true } } } },
			},
		});
		email = invite.worker.email;
		await prisma.applicatorWorker.update({
			where: { id: invite.id },
			data: { inviteToken: null, expiresAt: null },
		});
	} else if (role === 'APPLICATOR_USER') {
		const invite = await prisma.applicatorUser.update({
			where: {
				inviteToken: token,
				// expiresAt: {
				// 	gte: new Date(), // Ensures the invite is still valid
				// },
				user: {
					is: {
						profileStatus: 'INCOMPLETE',
					},
				},
			},
			data: {
				user: {
					update: {
						password,
						firstName,
						lastName,
						fullName: `${firstName || ''} ${lastName || ''}`.trim(),
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
				user: { include: { state: { select: { name: true } } } },
			},
		});
		email = invite.user.email;
		// await prisma.applicatorWorker.update({
		// 	where: { id: invite.id },
		// 	data: { inviteToken: null, expiresAt: null },
		// });
	} else {
		throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid role in token.');
	}

	const subject = 'Welcome to Acre Connect!';

	const message = `<p>Hi ${firstName} ${lastName},</p><br><br>
	<p>Welcome to Acre Connect! We’re excited to have you onboard.</p><br><br>
           <p>If you have any questions, feel free to reach out.</p><br><br>
           <p>Best Regards,<br>Acre Connect Team</p><br><br>
	  If you did not expect this, please ignore this email.
	`;

	const html = await mailHtmlTemplate(subject, message);

	await sendEmail({
		emailTo: email ?? '', // Defaults to an empty string if email is null/undefined
		subject,
		text: 'Welcome to Acre Connect!',
		html,
	});
	return {
		message: 'Invite accepted successfully.',
	};
};

const updatePassword = async (
	user: User,
	currentPassword: string,
	newPassword: string,
) => {
	// Validate user existence and current password
	const existingUser = await prisma.user.findUnique({
		where: { id: user.id },
	});
	if (!existingUser || !existingUser.password) {
		throw new Error('User not found');
	}

	const isMatch = await comparePassword(
		currentPassword,
		existingUser.password,
	);
	if (!isMatch) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'Current password is incorrect.',
		);
	}

	const hashedPassword = await hashPassword(newPassword);

	await prisma.user.update({
		where: { id: user.id },
		data: { password: hashedPassword },
	});

	return {
		message: 'Password updated successfully.',
	};
};
export default {
	registerUser,
	loginUser,
	verifyEmailAndSendOTP,
	verifyOTPAndRegisterEmail,
	resendOTP,
	acceptInviteAndSignUp,
	updatePassword,
};
