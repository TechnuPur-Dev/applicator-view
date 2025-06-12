import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { ApplicatorWorker, UpdateStatus } from './applicator-workers-types';
import ApiError from '../../../../../shared/utils/api-error';
import { InviteStatus } from '@prisma/client';
import { User, PaginateOptions } from '../../../../../shared/types/global';

import {
	mailHtmlTemplate,
	sendEmail,
} from '../../../../../shared/helpers/node-mailer';
import { generateToken } from '../../helper/invite-token';
//

const createWorker = async (user: User, data: ApplicatorWorker) => {
	if (user.role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			'You are not authorized to perform this action.',
		);
	}
	const token = generateToken('WORKER');
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
				expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
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
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.ApplicatorWorkerWhereInput = {
		applicatorId,
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.ApplicatorWorkerWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			const upperValue = searchValue.toUpperCase();
			const isStatusMatch = Object.values(InviteStatus).includes(
				upperValue as InviteStatus,
			);

			if (isStatusMatch) {
				filters.inviteStatus = {
					equals: upperValue as InviteStatus,
				};
			} else {
				Object.assign(filters, {
					OR: [
						// code
						{
							code: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						// fullName, firstName, lastName, email, phoneNumber, address1
						{
							worker: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										firstName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										lastName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										email: {
											equals: searchValue,
											mode: 'insensitive',
										},
									},
									{
										phoneNumber: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										address1: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
								],
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'inviteStatus':
					searchFilter.inviteStatus = {
						equals: searchValue as InviteStatus,
					};
					break;

				case 'fullName':
					searchFilter.worker = {
						OR: [
							{
								fullName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
							{
								firstName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
							{
								lastName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
						],
					};
					break;
				case 'pilotId':
					searchFilter.workerId = parseInt(searchValue, 10);

					break;
				case 'email':
					searchFilter.worker = {
						email: { equals: searchValue, mode: 'insensitive' },
					};
					break;
				case 'phoneNumber':
					searchFilter.worker = {
						phoneNumber: {
							contains: searchValue,
							mode: 'insensitive',
						},
					};
					break;
				case 'address1':
					searchFilter.worker = {
						address1: {
							contains: searchValue,
							mode: 'insensitive',
						},
					};
					break;
				case 'code':
					searchFilter.code = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}
			Object.assign(filters, searchFilter); // Merge filters dynamically
		}
	}
	// Fetch workers with included user details
	const workers = await prisma.applicatorWorker.findMany({
		where: filters,
		select: {
			dollarPerAcre: true,
			percentageFee: true,
			code: true,
			inviteStatus: true,
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
		where: filters,
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
				include: {
					state: {
						select: {
							name: true,
						},
					},
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
	const inviteUrl = `https://applicator-ac.netlify.app/#/workerInvitationView?token=${workerRecord.inviteToken}`;

	const { worker, ...rest } = workerRecord;
	const { state } = worker;
	return {
		...worker, // Flatten worker fields
		stateName: state?.name,
		...rest, // Spread other fields from applicatorWorker
		inviteUrl:
			workerRecord.inviteStatus === 'PENDING' ? inviteUrl : undefined,
		isInviteExpired:
			workerRecord.inviteStatus === 'PENDING'
				? workerRecord?.expiresAt
					? new Date(workerRecord?.expiresAt) <= new Date()
					: true
				: undefined,
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
		isActive,
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
				isActive,
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
	const token = generateToken('WORKER');
	const worker = await prisma.user.findUnique({
		where: {
			id: workerId,
		},
	});

	const existingInvite = await prisma.applicatorWorker.findUnique({
		where: {
			applicatorId_workerId: { applicatorId, workerId },
			inviteStatus: {
				in: ['PENDING', 'REJECTED'],
			},
		},
	});
	const shouldAutoAccept =
		worker?.autoAcceptInvite &&
		((data.percentageFee &&
			worker.minPercentageFee &&
			data.percentageFee >= worker.minPercentageFee) ||
			(data.dollarPerAcre &&
				worker.minDollarPerAcre &&
				data.dollarPerAcre >= worker.minDollarPerAcre));
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
					inviteStatus: shouldAutoAccept ? 'ACCEPTED' : 'PENDING', // Only updating the inviteStatus field
					inviteToken: token,
					expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
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
				inviteStatus: shouldAutoAccept ? 'ACCEPTED' : 'PENDING',
				inviteToken: token,
				expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
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
				id: true,
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
		await prisma.notification.create({
			data: {
				userId: workerId, // Notify the appropriate user
				workerInviteId: invite.id,
				type: 'ACCOUNT_INVITATION',
			},
		});
		return {
			message: 'Invite sent successfully.',
		};
	}
};
const updateInviteStatus = async (workerId: number, data: UpdateStatus) => {
	const { applicatorId, status } = data;

	if (status === 'ACCEPTED') {
		await prisma.$transaction(async (prisma) => {
			const invite = await prisma.applicatorWorker.update({
				where: {
					applicatorId_workerId: { applicatorId, workerId },
					inviteStatus: 'PENDING',
				},

				data: {
					inviteStatus: 'ACCEPTED',
				},
			});
			await prisma.notification.create({
				data: {
					userId: applicatorId, // Notify the appropriate user
					type: 'PILOT_ACCEPT_INVITE',
					workerInviteId: invite.id,
				},
			});
		});
		return {
			message: 'Invite accepted successfully.',
		};
	}
	if (status === 'REJECTED') {
		await prisma.$transaction(async (prisma) => {
			const invite = await prisma.applicatorWorker.update({
				where: {
					applicatorId_workerId: { applicatorId, workerId },
					inviteStatus: 'PENDING',
				},

				data: {
					inviteStatus: 'REJECTED',
				},
			});
			await prisma.notification.create({
				data: {
					userId: applicatorId, // Notify the appropriate user
					type: 'PILOT_REJECT_INVITE',
					workerInviteId: invite.id,
				},
			});
		});
		return {
			message: 'Invite rejected successfully.',
		};
	}
};
const searchWorkerByEmail = async (applicatorId: number, email: string) => {
	// Find all users matching the email pattern (debounced search)
	const user = await prisma.user.findFirst({
		where: {
			email: {
				equals: email,
				mode: 'insensitive',
			},
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
		omit: {
			id: true,
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
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.ApplicatorWorkerWhereInput = {
		workerId,
		NOT: {
			inviteStatus: 'PENDING',
		},
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.ApplicatorWorkerWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			Object.assign(filters, {
				OR: [
					// code
					{ code: { contains: searchValue, mode: 'insensitive' } },
					// fullName, firstName, lastName, email, phoneNumber, address1
					{
						applicator: {
							OR: [
								{
									id: !isNaN(Number(searchValue))
										? parseInt(searchValue, 10)
										: undefined,
								},
								{
									fullName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									firstName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									lastName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									email: {
										equals: searchValue,
										mode: 'insensitive',
									},
								},
								{
									phoneNumber: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									address1: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									businessName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
							],
						},
					},
				],
			});
		} else {
			switch (options.label) {
				case 'applicatorName':
					searchFilter.applicator = {
						OR: [
							{
								fullName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
							{
								firstName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
							{
								lastName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
						],
					};
					break;
				case 'applicatorId':
					searchFilter.applicatorId = parseInt(searchValue, 10);

					break;
				case 'email':
					searchFilter.applicator = {
						email: { equals: searchValue, mode: 'insensitive' },
					};
					break;
				case 'phoneNumber':
					searchFilter.applicator = {
						phoneNumber: {
							contains: searchValue,
							mode: 'insensitive',
						},
					};
					break;
				case 'address1':
					searchFilter.applicator = {
						address1: {
							contains: searchValue,
							mode: 'insensitive',
						},
					};
					break;
				case 'businessName':
					searchFilter.applicator = {
						businessName: {
							contains: searchValue,
							mode: 'insensitive',
						},
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}
			Object.assign(filters, searchFilter); // Merge filters dynamically
		}
	}
	const applicators = await prisma.applicatorWorker.findMany({
		where: filters,
		// {
		// 	workerId,
		// 	NOT: {
		// 		inviteStatus: 'PENDING',
		// 	},
		// },
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
		where: filters,
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
const getPendingInvites = async (
	user: User,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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

	// Determine the correct filter based on user role
	const isWorker = user.role === 'WORKER';
	console.log(isWorker);

	let pendingInvites;
	const filters: Prisma.ApplicatorWorkerWhereInput = {
		inviteStatus: 'PENDING',
		[isWorker ? 'workerId' : 'applicatorId']: user.id,
	};
	if (isWorker) {
		// Fetch pending invites
		if (options.label && options.searchValue) {
			const searchFilter: Prisma.ApplicatorWorkerWhereInput = {};
			const searchValue = options.searchValue;
			if (options.label === 'all') {
				Object.assign(filters, {
					OR: [
						// code
						{
							code: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						// fullName, firstName, lastName, email, phoneNumber, address1
						{
							applicator: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										firstName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										lastName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										email: {
											equals: searchValue,
											mode: 'insensitive',
										},
									},
									{
										phoneNumber: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										address1: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										businessName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
								],
							},
						},
					],
				});
			} else {
				switch (options.label) {
					case 'fullName':
						searchFilter.applicator = {
							OR: [
								{
									fullName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									firstName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									lastName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
							],
						};
						break;
					case 'applicatorId':
						searchFilter.applicatorId = parseInt(searchValue, 10);

						break;
					case 'email':
						searchFilter.applicator = {
							email: { equals: searchValue, mode: 'insensitive' },
						};
						break;
					case 'phoneNumber':
						searchFilter.applicator = {
							phoneNumber: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					case 'address1':
						searchFilter.applicator = {
							address1: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					case 'code':
						searchFilter.code = {
							contains: searchValue,
							mode: 'insensitive',
						};
						break;
					default:
						throw new Error('Invalid label provided.');
				}
				Object.assign(filters, searchFilter); // Merge filters dynamically
			}
		}
		pendingInvites = await prisma.applicatorWorker.findMany({
			where: filters,
			// {
			// 	inviteStatus: 'PENDING',
			// 	workerId: user.id,
			// },
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
		if (options.label && options.searchValue) {
			const searchFilter: Prisma.ApplicatorWorkerWhereInput = {};
			const searchValue = options.searchValue;
			if (options.label === 'all') {
				Object.assign(filters, {
					OR: [
						// code
						{
							code: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						// fullName, firstName, lastName, email, phoneNumber, address1
						{
							worker: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										firstName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										lastName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										email: {
											equals: searchValue,
											mode: 'insensitive',
										},
									},
									{
										phoneNumber: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										address1: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										businessName: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
								],
							},
						},
					],
				});
			} else {
				switch (options.label) {
					case 'fullName':
						searchFilter.worker = {
							OR: [
								{
									fullName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									firstName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
								{
									lastName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
							],
						};
						break;
					case 'pilotId':
						searchFilter.workerId = parseInt(searchValue, 10);

						break;
					case 'email':
						searchFilter.worker = {
							email: { equals: searchValue, mode: 'insensitive' },
						};
						break;
					case 'phoneNumber':
						searchFilter.worker = {
							phoneNumber: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					case 'address1':
						searchFilter.worker = {
							address1: {
								contains: searchValue,
								mode: 'insensitive',
							},
						};
						break;
					case 'code':
						searchFilter.code = {
							contains: searchValue,
							mode: 'insensitive',
						};
						break;
					default:
						throw new Error('Invalid label provided.');
				}

				Object.assign(filters, searchFilter); // Merge filters dynamically
			}
		}
		pendingInvites = await prisma.applicatorWorker.findMany({
			where: filters,
			//  {
			// 	inviteStatus: 'PENDING',
			// 	applicatorId: user.id,
			// },
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
		where: filters,
		//  {
		// 	inviteStatus: 'PENDING',
		// 	[isWorker ? 'workerId' : 'applicatorId']: user.id,
		// },
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
const getAllApplicatorsByPilot = async (
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
			workerType: 'PILOT',
			isActive: true,
		},
		include: {
			applicator: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
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
	const formattedApplicators = applicators.map((entry) => ({
		...entry.applicator,
	}));

	// Total workers count
	const totalResults = await prisma.applicatorWorker.count({
		where: {
			workerId,
			workerType: 'PILOT',
			isActive: true,
		},
	});
	const totalPages = Math.ceil(totalResults / limit);

	// Return paginated results
	return {
		result: formattedApplicators,
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
	getAllApplicatorsByPilot,
};
