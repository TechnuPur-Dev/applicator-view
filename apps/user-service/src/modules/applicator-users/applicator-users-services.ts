import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { ApplicatorUser } from './applicator-users-types';
import ApiError from '../../../../../shared/utils/api-error';
import { hashPassword } from '../../helper/bcrypt';

import { User, PaginateOptions } from '../../../../../shared/types/global';

import {
	mailHtmlTemplate,
	sendEmail,
} from '../../../../../shared/helpers/node-mailer';
import { generateInviteToken } from '../../helper/invite-token';
//
const searchApplicatorUserByEmail = async (
	applicatorId: number,
	email: string,
) => {
	// Find all users matching the email pattern (debounced search)
	const user = await prisma.user.findUnique({
		where: {
			email,
		},
		include: {
			state: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		omit: {
			password: true, // Exclude sensitive data
		},
	});

	// Find all users matching the email pattern (debounced search)
	const applicatorUser = await prisma.applicatorUser.findFirst({
		where: {
			userId: user?.id,
		},
		select: {
			id: true,
		},
	});

	if (!user) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'user with this email not found.',
		);
	}

	if (user.role !== 'APPLICATOR_USER') {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'User exists but is not an applicator user.',
		);
	}
	return {
		user,
		isAlreadyConnected: applicatorUser ? true : false,
	};
};
const createApplicatorUser = async (user: User, data: ApplicatorUser) => {
	if (user.role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'You are not authorized to perform this action.',
		);
	}
	let { password } = data;
	const { userPermission = [] } = data;
	const token = generateInviteToken('APPLICATOR_USER');
	// hash the password only if it is provided
	if (password) {
		const hashedPassword = await hashPassword(data.password);
		password = hashedPassword;
	}
	return prisma.$transaction(async (prisma) => {
		const userData = await prisma.user.create({
			data: {
				firstName: data.firstName,
				lastName: data.lastName,
				fullName: `${data.firstName} ${data.lastName}`,
				email: data.email.toLowerCase(),
				phoneNumber: data.phoneNumber,
				password,
				address1: data.address1,
				address2: data.address2,
				stateId: data.stateId,
				county: data.county,
				township: data.township,
				zipCode: data.zipCode,
				role: 'APPLICATOR_USER',
			},
			omit: {
				password: true, // Exclude sensitive data
				experience: true,
				bio: true,
				additionalInfo: true,
				profileStatus: true,
				updatedAt: true,
				role: true,
				businessName: true,
			},
		});

		const applicatorUser = await prisma.applicatorUser.create({
			data: {
				applicatorId: user.id,
				userId: userData.id,
				inviteToken: token,
				permissions: {
					create: userPermission.map(
						({ permissionId, canView, canEdit }) => ({
							permissionId,
							canView,
							canEdit,
						}),
					),
				},
			},
			include: {
				permissions: true,
			},
			omit: {
				id: true,
				userId: true,
				applicatorId: true,
			},
		});
		// const inviteLink = `https://applicator-ac.netlify.app/#/userInvitationView?token=${token}`;
		const inviteLink = `https://applicator-ac.netlify.app/#/login`;
		const subject = 'Welcome to Acre Connect!';
		const message = `<p>Hi ${data.firstName} ${data.lastName},</p><br><br>
	  <p>Welcome to Acre Connect! We’re excited to have you onboard.</p><br><br>
	  Click the link below to Login.<br><br>
	  <a href="${inviteLink}">${inviteLink}</a><br><br>
	  If you did not expect this email, please ignore this.
	`;

		const html = await mailHtmlTemplate(subject, message);

		await sendEmail({
			emailTo: data.email,
			subject,
			text: 'Welcome to Acre Connect!',
			html,
		});

		return { ...userData, ...applicatorUser };
	});
};

const getAllApplicatorUser = async (
	applicatorId: number,
	options: PaginateOptions,
) => {
	// Set pagination parameters
	const limit =
		options.limit && parseInt(options.limit.toString(), 10) > 0
			? parseInt(options.limit.toString(), 10)
			: 10;
	const page =
		options.page && parseInt(options.page.toString(), 10) > 0
			? parseInt(options.page.toString(), 10)
			: 1;
	const skip = (page - 1) * limit;

	// Fetch workers with included user details
	const applicatorUser = await prisma.applicatorUser.findMany({
		where: { applicatorId },
		include: {
			user: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					fullName: true,
					phoneNumber: true,
					email: true,
					address1: true,
					address2: true,
					stateId: true,
					county: true,
					township: true,
					zipCode: true,
					state: {
						select: {
							name: true,
						},
					},
				},
			},
		},
		skip,
		take: limit,
		orderBy: { id: 'desc' },
	});

	// Total workers count
	const totalResults = await prisma.applicatorUser.count({
		where: { applicatorId },
	});
	const totalPages = Math.ceil(totalResults / limit);

	// Return paginated results
	return {
		result: applicatorUser.map((appUser) => ({
			...appUser.user,
			stateName: appUser.user.state?.name ?? null,
			// remove nested state if not needed
			state: undefined,
		})),
		page,
		limit,
		totalPages,
		totalResults,
	};
};

const sendInviteToUser = async (
	applicatorId: number,
	data: {
		userId: number;
		userPermission: {
			permissionId: number;
			canView: boolean;
			canEdit: boolean;
		}[];
	},
) => {
	const { userId, userPermission = [] } = data;
	console.log(userId, applicatorId, 'idss');
	let invite;
	const token = generateInviteToken('APPLICATOR_USER');

	const existingInvite = await prisma.applicatorUser.findFirst({
		where: {
			userId: userId,
			applicatorId: applicatorId,
		},
	});
	const permissionIds = userPermission.map((p) => p.permissionId);
	// Fetch all matching permissions from the DB
	const existingPermissions = await prisma.permission.findMany({
		where: {
			id: {
				in: permissionIds,
			},
		},
	});
	if (existingPermissions.length !== permissionIds.length) {
		// check permission exsit in db or not
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'One or more permissions do not exist.',
		);
	}
	if (existingInvite) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'An active invitation already exists.',
		);
	} else {
		invite = await prisma.applicatorUser.create({
			data: {
				applicatorId,
				userId: userId,
				inviteToken: token,
				permissions: {
					create: userPermission.map(
						({ permissionId, canView, canEdit }) => ({
							permissionId,
							canView,
							canEdit,
						}),
					),
				},
			},
			select: {
				user: {
					select: { email: true },
				},
			},
		});
	}

	const inviteLink = `https://applicator-ac.netlify.app/#/userInvitationView?token=${token}`;
	const subject = 'Invitation Email';

	const message = `
	  You are invited to join our platform!<br><br>
	  Click the link below to join.<br><br>
	  <a href="${inviteLink}">${inviteLink}</a><br><br>
	  If you did not expect this invitation, please ignore this email.
	`;
	if (invite) {
		const email = invite?.user?.email;

		if (!email) {
			throw new Error('Email address is not available for this user.');
		}

		const html = await mailHtmlTemplate(subject, message);

		await sendEmail({
			emailTo: email,
			subject,
			text: 'Request Invitation',
			html,
		});
		return {
			message: 'Invite sent successfully.',
		};
	}
};

const deleteApplicatorUser = async (applicatorId: number, userId: number) => {
	// delete applicator user
	await prisma.applicatorUser.delete({
		where: {
			applicatorId_userId: {
				applicatorId,
				userId,
			},
		},
	});

	// Return  results
	return {
		result: 'User deleted successfully',
	};
};
export default {
	getAllApplicatorUser,
	createApplicatorUser,
	searchApplicatorUserByEmail,
	sendInviteToUser,
	deleteApplicatorUser,
};
