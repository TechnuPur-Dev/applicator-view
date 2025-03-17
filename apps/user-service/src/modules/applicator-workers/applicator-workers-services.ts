import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { ApplicatorWorker, UpdateStatus } from './applicator-workers-types';
import ApiError from '../../../../../shared/utils/api-error';

import { User, PaginateOptions } from '../../../../../shared/types/global';

import {
	mailHtmlTemplate,
	sendEmail,
} from '../../../../../shared/helpers/node-mailer';
import { generateInviteToken } from '../../helper/invite-token';
//

const createWorker = async (user: User, data: ApplicatorWorker) => {
	if (user.role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'You are not authorized to perform this action.',
		);
	}
	const token = generateInviteToken('WORKER');
	return prisma.$transaction(async (prisma) => {
		const worker = await prisma.user.create({
			data: {
				firstName: data.firstName,
				lastName: data.lastName,
				fullName: `${data.firstName} ${data.lastName}`,
				email: data.email.toLowerCase(),
				phoneNumber: data.phoneNumber,
				// businessName: data.businessName,
				address1: data.address1,
				address2: data.address2,
				stateId: data.stateId,
				county: data.county,
				township: data.township,
				zipCode: data.zipCode,
				role: 'WORKER',
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

		const applicatorWorker = await prisma.applicatorWorker.create({
			data: {
				applicatorId: user.id,
				workerId: worker.id,
				workerType: data.title,
				pilotPestLicenseNumber: data.pilotPestLicenseNumber,
				pilotLicenseNumber: data.pilotLicenseNumber,
				businessLicenseNumber: data.businessLicenseNumber,
				planeOrUnitNumber: data.planeOrUnitNumber,
				// perAcrePricing: data.perAcrePricing,
				percentageFee: data.percentageFee,
				dollarPerAcre: data.dollarPerAcre,
				autoAcceptJobs: data.autoAcceptJobs ?? false,
				canViewPricingDetails: data.canViewPricingDetails ?? false,
				code: data.code,
				inviteStatus: 'PENDING',
				inviteToken: token,
				expiresAt:new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
				// lastLogin: new Date(), // Set current timestamp if null/undefined
			},
			omit: {
				id: true,
				applicatorId: true,
				workerId: true,
				workerType: true,
				updatedAt: true,
			},
		});
		const inviteLink = `https://applicator-ac.netlify.app/#/workerInvitationView?token=${token}`;
		const subject = 'Invitation Email';
		const message = `
	  You are invited to join our platform!<br><br>
	  Click the link below to join.<br><br>
	  <a href="${inviteLink}">${inviteLink}</a><br><br>
	  If you did not expect this invitation, please ignore this email.
	`;
		// Construct invite link

		const html = await mailHtmlTemplate(subject, message);

		await sendEmail({
			emailTo: data.email,
			subject,
			text: 'Request Invitation',
			html,
		});

		return { ...worker, ...applicatorWorker };
	});
};

const getAllWorkers = async (
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
	const workers = await prisma.applicatorWorker.findMany({
		where: { applicatorId },
		select: {
			dollarPerAcre: true,
			percentageFee: true,
			code: true,
			worker: {
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
				},
			},
		},
		skip,
		take: limit,
		orderBy: { id: 'desc' },
	});

	// Flatten worker object and exclude unwanted fields
	const flattenedWorkers = workers.map(({ worker, ...rest }) => ({
		...worker, // Flatten worker fields
		...rest, // Spread other fields from applicatorWorker
	}));

	// Total workers count
	const totalResults = await prisma.applicatorWorker.count({
		where: { applicatorId },
	});
	const totalPages = Math.ceil(totalResults / limit);

	// Return paginated results
	return {
		result: flattenedWorkers,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

const getWorkerById = async (applicatorId: number, workerId: number) => {
	const workerRecord = await prisma.applicatorWorker.findUnique({
		where: {
			applicatorId_workerId: {
				applicatorId,
				workerId,
			},
		},
		include: {
			worker: {
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
			},
		},
		omit: {
			id: true,
			applicatorId: true,
			workerId: true,
			workerType: true,
			updatedAt: true,
		},
	});
	// Handle case when worker is not found
	if (!workerRecord) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Worker not found.');
	}
	let inviteUrl;
	if (workerRecord) {
		if (workerRecord.inviteStatus === 'PENDING') {
			 inviteUrl=`https://applicator-ac.netlify.app/#/workerInvitationView?token=${workerRecord.inviteToken}`;
			workerRecord.expiresAt = new Date(
				Date.now() + 3 * 24 * 60 * 60 * 1000,
			);
		}
	}
	
	const { worker, ...rest } = workerRecord;
	return {
		
		...worker, // Flatten worker fields
		...rest, // Spread other fields from applicatorWorker
		inviteUrl
	};
};
const updateWorker = async (
	applicatorId: number,
	workerId: number,
	data: ApplicatorWorker,
) => {
	const {
		pilotPestLicenseNumber,
		pilotLicenseNumber,
		businessLicenseNumber,
		planeOrUnitNumber,
		percentageFee,
		dollarPerAcre,
		autoAcceptJobs,
		canViewPricingDetails,
		code,
		// Exclude fields that belong to applicatorWorker
		...userData
	} = data;

	return await prisma.$transaction(async (prisma) => {
		// Update worker details in the user table
		const worker = await prisma.user.update({
			where: { id: workerId },
			data: userData, // Update user details
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

		// Update applicator-specific details in the applicatorWorker table
		const applicatorWorker = await prisma.applicatorWorker.update({
			where: {
				applicatorId_workerId: {
					applicatorId,
					workerId,
				},
			},
			data: {
				pilotPestLicenseNumber,
				pilotLicenseNumber,
				businessLicenseNumber,
				planeOrUnitNumber,
				percentageFee,
				dollarPerAcre,
				autoAcceptJobs,
				canViewPricingDetails,
				code,
			},
			omit: {
				id: true,
				applicatorId: true,
				workerId: true,
				workerType: true,
				updatedAt: true,
			},
		});

		return { ...worker, ...applicatorWorker };
	});
};

const deleteWorker = async (applicatorId: number, workerId: number) => {
	await prisma.applicatorWorker.delete({
		where: {
			applicatorId_workerId: {
				applicatorId,
				workerId,
			},
		},
	});

	return { result: 'Deleted successfully' };
};
const sendInviteToWorker = async (
	applicatorId: number,
	workerId: number,
	data: ApplicatorWorker,
) => {
	let invite;
	const token = generateInviteToken('WORKER');

	const existingInvite = await prisma.applicatorWorker.findUnique({
		where: {
			applicatorId_workerId: { applicatorId, workerId },
			inviteStatus: {
				in: ['PENDING', 'REJECTED'],
			},
		},
	});
	if (existingInvite) {
		if (
			existingInvite.inviteStatus === 'REJECTED' ||
			existingInvite.inviteStatus === 'PENDING'
		) {
			invite = await prisma.applicatorWorker.update({
				where: {
					applicatorId_workerId: { applicatorId, workerId },
				},
				include: {
					worker: {
						select: {
							email: true,
						},
					},
				},
				data: {
					...data,
					inviteStatus: 'PENDING', // Only updating the inviteStatus field
					inviteToken: token,
					expiresAt:new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
				},
			});
		} else {
			throw new ApiError(
				httpStatus.BAD_REQUEST,
				'An active invitation already exists.',
			);
		}
	} else {
		invite = await prisma.applicatorWorker.create({
			data: {
				applicatorId,
				workerId,
				inviteStatus: 'PENDING',
				inviteToken: token,
				expiresAt:new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
				workerType: 'PILOT',
				pilotPestLicenseNumber: data.pilotLicenseNumber,
				pilotLicenseNumber: data.pilotLicenseNumber,
				businessLicenseNumber: data.businessLicenseNumber,
				planeOrUnitNumber: data.planeOrUnitNumber,
				percentageFee: data.percentageFee,
				dollarPerAcre: data.dollarPerAcre,
				autoAcceptJobs: data.autoAcceptJobs ?? false,
				canViewPricingDetails: data.canViewPricingDetails ?? false,
				code: data.code,
			},
			select: {
				worker: {
					select: { email: true },
				},
			},
		});
	}

	const inviteLink = `https://applicator-ac.netlify.app/#/workerInvitationView?token=${token}`;
	const subject = 'Invitation Email';

	const message = `
	  You are invited to join our platform!<br><br>
	  Click the link below to join.<br><br>
	  <a href="${inviteLink}">${inviteLink}</a><br><br>
	  If you did not expect this invitation, please ignore this email.
	`;
	if (invite) {
		const email = invite?.worker?.email;

		if (!email) {
			throw new Error('Email address is not available for this worker.');
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
const updateInviteStatus = async (applicatorId: number, data: UpdateStatus) => {
	const { workerId, status } = data;

	if (status === 'ACCEPTED') {
		await prisma.applicatorWorker.update({
			where: {
				applicatorId_workerId: { applicatorId, workerId },
			},

			data: {
				inviteStatus: 'ACCEPTED',
			},
		});
		return {
			message: 'Invite accepted successfully.',
		};
	}
	if (status === 'REJECTED') {
		await prisma.applicatorWorker.update({
			where: {
				applicatorId_workerId: { applicatorId, workerId },
			},

			data: {
				inviteStatus: 'REJECTED',
			},
		});
		return {
			message: 'Invite rejected successfully.',
		};
	}
};
const searchWorkerByEmail = async (applicatorId: number, email: string) => {
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

	if (!user) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Worker with this email not found.',
		);
	}

	if (user.role !== 'WORKER') {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'User exists but is not an applicator.',
		);
	}

	const existingInvite = await prisma.applicatorWorker.findUnique({
		where: {
			applicatorId_workerId: {
				applicatorId,
				workerId: user?.id,
			},
		},
	});

	const { state } = user;

	return {
		inviteStatus: existingInvite ? existingInvite.inviteStatus : null,
		...user,
		...existingInvite,
		state: state?.name,
	};
};
const getAllApplicators = async (
	workerId: number,
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
	const applicators = await prisma.applicatorWorker.findMany({
		where: {
			workerId,
		},
		include: {
			// inviteStatus: true,
			applicator: {
				include: {
					state: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				omit: {
					role: true,
					password: true,
					stateId: true,
				},
			},
		},
		omit: {
			inviteToken: true,
		},
		skip,
		take: limit,
		orderBy: { id: 'desc' },
	});
	// Flatten worker object and exclude unwanted fields
	const flattenedApplicators = applicators.map(({ applicator, ...rest }) => ({
		...applicator,
		...rest,
	}));

	// Total workers count
	const totalResults = await prisma.applicatorWorker.count({
		where: { workerId },
	});
	const totalPages = Math.ceil(totalResults / limit);

	// Return paginated results
	return {
		result: flattenedApplicators,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getPendingInvites = async (user: User, options: PaginateOptions) => {
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

	// Determine the correct filter based on user role
	const isWorker = user.role === 'WORKER';
	console.log(isWorker);

	let pendingInvites;
	if (isWorker) {
		// Fetch pending invites
		pendingInvites = await prisma.applicatorWorker.findMany({
			where: {
				inviteStatus: 'PENDING',
				workerId: user.id,
			},
			include: {
				applicator: {
					include: {
						state: {
							select: {
								id: true,
								name: true,
							},
						},
					},
					omit: {
						role: true,
						password: true,
						stateId: true,
					},
				},
			},
			omit: {
				inviteToken: true,
			},
			skip,
			take: limit,
			orderBy: { id: 'desc' },
		});
		// Flatten worker object and exclude unwanted fields
		pendingInvites = pendingInvites.map(({ applicator, ...rest }) => ({
			...applicator,
			...rest,
		}));
	}
	if (!isWorker) {
		// Fetch pending invites
		pendingInvites = await prisma.applicatorWorker.findMany({
			where: {
				inviteStatus: 'PENDING',
				applicatorId: user.id,
			},
			select: {
				dollarPerAcre: true,
				percentageFee: true,
				code: true,
				worker: {
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
					},
				},
			},
			skip,
			take: limit,
			orderBy: { id: 'desc' },
		});
		// Flatten worker object and exclude unwanted fields
		pendingInvites = pendingInvites.map(({ worker, ...rest }) => ({
			...worker, // Flatten worker fields
			...rest, // Spread other fields from applicatorWorker
		}));
	}

	// Get total count
	const totalResults = await prisma.applicatorWorker.count({
		where: {
			inviteStatus: 'PENDING',
			[isWorker ? 'workerId' : 'applicatorId']: user.id,
		},
	});

	// Calculate total pages
	const totalPages = Math.ceil(totalResults / limit);

	// Return paginated results
	return {
		result: pendingInvites,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

export default {
	createWorker,
	getAllWorkers,
	getWorkerById,
	updateWorker,
	deleteWorker,
	updateInviteStatus,
	searchWorkerByEmail,
	sendInviteToWorker,
	getAllApplicators,
	getPendingInvites,
};
