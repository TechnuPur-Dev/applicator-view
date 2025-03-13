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
//

const createWorker = async (user: User, data: ApplicatorWorker) => {
	if (user.role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'You are not authorized to perform this action.',
		);
	}

	// const workerExist = await prisma.user.findFirst({
	// 	where: {
	// 		email: {
	// 			equals: data.email,
	// 			mode: 'insensitive',
	// 		},
	// 	},
	// });

	// if (workerExist) {
	// 	// updateInviteStatus(user.id, {
	// 	// 	workerId: workerExist.id,
	// 	// 	status: 'PENDING',
	// 	// });
	// 	// return {
	// 	// 	message: 'Worker already exists, invite sent successfully.',
	// 	// };
	// 	throw new ApiError(httpStatus.CONFLICT, 'Invalid data provded.');
	// }

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
				pilotPestLicenseNumber: data.pilotLicenseNumber,
				pilotLicenseNumber: data.pilotLicenseNumber,
				businessLicenseNumber: data.businessLicenseNumber,
				planeOrUnitNumber: data.planeOrUnitNumber,
				// perAcrePricing: data.perAcrePricing,
				percentageFee: data.percentageFee,
				dollarPerAcre: data.dollarPerAcre,
				autoAcceptJobs: data.autoAcceptJobs ?? false,
				canViewPricingDetails: data.canViewPricingDetails ?? false,
				code: data.code,
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
	const { worker, ...rest } = workerRecord;
	return {
		...worker, // Flatten worker fields
		...rest, // Spread other fields from applicatorWorker
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
const sendInviteToWorker = async (applicatorId: number, workerId: number) => {
	const workerRecord = await prisma.applicatorWorker.findUnique({
		where: {
			applicatorId_workerId: { applicatorId, workerId },
			inviteStatus: 'NOT_SENT',
		},
	});
	if (!workerRecord) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Worker not found or invite already sent.',
		);
	}
	const user = await prisma.applicatorWorker.update({
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
			inviteStatus: 'PENDING', // Only updating the inviteStatus field
		},
	});
	const subject = 'Email Invitation';
	const message = `
	You are invited to join our platform!<br><br>
	If you did not expect this invitation, please ignore this email.
	`;
	if (user) {
		const email = user?.worker?.email;

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
	const users = await prisma.user.findFirst({
		where: {
			email: {
				contains: email, // Case-insensitive partial match
				mode: 'insensitive',
			},
			role: 'WORKER',
		},
	});
	if (users) {
		return  users;
		
	} else {
		throw new ApiError(httpStatus.CONFLICT, 'User Not Found');
	}
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
};
