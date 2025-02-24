import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { ApplicatorWorker, UpdateStatus } from './applicator-workers-types';
import ApiError from '../../../../../shared/utils/api-error';
import { PaginateOptions, User } from '../../../../../shared/types/global';
import {
	mailHtmlTemplate,
	sendEmail,
} from '../../../../../shared/helpers/node-mailer';
//

const createWorker = async (user: User, data: ApplicatorWorker) => {
	if (user.role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized to perform this action.',
		);
	}

	const workerExist = await prisma.user.findFirst({
		where: {
			email: {
				equals: data.email,
				mode: 'insensitive',
			},
		},
	});

	if (workerExist) {
		updateInviteStatus(user.id, {
			workerId: workerExist.id,
			status: 'PENDING',
		});
		return {
			message: 'Worker already exists, invite sent successfully.',
		};
	}

	return prisma.$transaction(async (prisma) => {
		const worker = await prisma.user.create({
			data: {
				firstName: data.firstName,
				lastName: data.lastName,
				fullName: `${data.firstName} ${data.lastName}`,
				email: data.email.toLowerCase(),
				phoneNumber: data.phoneNumber,
				businessName: data.businessName,
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
			},
		});

		const applicatorWorker = await prisma.applicatorWorker.create({
			data: {
				applicatorId: user.id,
				workerId: worker.id,
				workerType: data.title,
				pilotLicenseNumber: data.pilotLicenseNumber,
				businessLicenseNumber: data.businessLicenseNumber,
				planeOrUnitNumber: data.planeOrUnitNumber,
				perAcrePricing: data.perAcrePricing,
				percentageFee: data.percentageFee,
				dollarPerAcre: data.dollarPerAcre,
				autoAcceptJobs: data.autoAcceptJobs ?? false,
				canViewPricingDetails: data.canViewPricingDetails ?? false,
				code: data.code,
				lastLogin: new Date(), // Set current timestamp if null/undefined
			},
		});

		return { ...worker, ...applicatorWorker };
	});
};

const getAllWorker = async (applicatorId: number,options: PaginateOptions) => {
	const limit =
			options.limit && parseInt(options.limit, 10) > 0
				? parseInt(options.limit, 10)
				: 10;
		// Set the page number, default to 1 if not specified or invalid
		const page =
			options.page && parseInt(options.page, 10) > 0
				? parseInt(options.page, 10)
				: 1;
		// Calculate the number of users to skip based on the current page and limit
		const skip = (page - 1) * limit;
	
	const workers = await prisma.applicatorWorker.findMany({
		where: {
			applicatorId: applicatorId,
		},
		include: {
			worker: {
				omit: {
					profileImage: true,
					thumbnailProfileImage: true,
					password: true, // Exclude sensitive data
					experience: true,
					bio: true,
					additionalInfo: true,
					profileStatus: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
		skip,
			take: limit,
			orderBy: {
				id: 'desc',
			},
	});
	const totalResults = await prisma.applicatorWorker.count({
		where: {
			applicatorId: applicatorId,
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: workers,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getWorkerById = async (Id: number) => {
	const workers = await prisma.applicatorWorker.findFirst({
		where: {
			workerId: Id,
		},
		include: {
			worker: {
				omit: {
					profileImage: true,
					thumbnailProfileImage: true,
					password: true, // Exclude sensitive data
					experience: true,
					bio: true,
					additionalInfo: true,
					profileStatus: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
	});
	return workers;
};
const updateWorker = async (workerId: number, data: ApplicatorWorker) => {
	const {
		title,
		pilotLicenseNumber,
		businessLicenseNumber,
		planeOrUnitNumber,
		perAcrePricing,
		percentageFee,
		dollarPerAcre,
		autoAcceptJobs,
		canViewPricingDetails,
		code,
		lastLogin,
		...userData
		// Remaining fields for applicatorWorker
	} = data;
	await prisma.$transaction(async (prisma) => {
		const worker = await prisma.user.update({
			where: {
				id: workerId, // update worker in user model with their Id
			},
			data: {
				...userData,
			},
		});

		const applicatorWorker = await prisma.applicatorWorker.updateMany({
			where: {
				workerId,
			},
			data: {
				workerType: title,
				pilotLicenseNumber,
				businessLicenseNumber,
				planeOrUnitNumber,
				perAcrePricing,
				percentageFee,
				dollarPerAcre,
				autoAcceptJobs,
				canViewPricingDetails,
				code,
				lastLogin,
			},
		});

		return [worker, applicatorWorker];
	});

	return { message: 'updated successfully' };
};
const deleteWorker = async (Id: number) => {
	await prisma.user.delete({
		where: {
			id: Id,
		},
	});
	return { result: 'Deleted successfully' };
};
const updateInviteStatus = async (applicatorId: number, data: UpdateStatus) => {
	const { workerId, status } = data;
	if (status === 'PENDING') {
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
				throw new Error(
					'Email address is not available for this worker.',
				);
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
	}
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
export default {
	createWorker,
	getAllWorker,
	getWorkerById,
	updateWorker,
	deleteWorker,
	updateInviteStatus,
};
