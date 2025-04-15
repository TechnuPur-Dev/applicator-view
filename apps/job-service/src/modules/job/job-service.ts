import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import {
	BidStatus,
	JobSource,
	JobStatus,
	JobType,
	Prisma,
	UserRole,
} from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import { CreateJob } from './job-types';
import { v4 as uuidv4 } from 'uuid';
import config from '../../../../../shared/config/env-config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { User, PaginateOptions } from '../../../../../shared/types/global';
// import { object } from 'joi';
// import config from '../../../../../shared/config/env-config';
// import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // Adjust based on Azure SDK usage
import { sendPushNotifications } from '../../../../../shared/helpers/push-notification';
import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
import { sendEmail } from '../../../../../shared/helpers/node-mailer';

// create grower
const createJob = async (user: User, data: CreateJob) => {
	if (user.role === 'APPLICATOR') {
		const {
			title,
			type,
			userId: growerId,
			startDate,
			endDate,
			description,
			farmId,
			sensitiveAreas,
			adjacentCrops,
			specialInstructions,
			attachments = [],
			fields = [],
			products = [],
			applicationFees = [],
		} = data;
		if (typeof growerId !== 'number') {
			throw new Error('growerId is required and must be a number');
		}
		const hasFarmPermission = await prisma.applicatorGrower.count({
			where: {
				applicatorId: user.id,
				growerId,
				grower: {
					farms: {
						some: {
							id: farmId,
							permissions: {
								some: { applicatorId: user.id, canView: true },
							},
						},
					},
				},
			},
		});
		if (!hasFarmPermission) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'You do not have permission to access this farm.',
			);
		}

		const productIds = products.map(({ productId }) => productId);
		const productCount = await prisma.product.count({
			where: { id: { in: productIds }, createdById: user.id },
		});
		if (productCount !== productIds.length) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'You do not have permission to access these products.',
			);
		}

		const fieldIds = fields.map(({ fieldId }) => fieldId);
		const fieldCount = await prisma.field.count({
			where: { id: { in: fieldIds }, farmId },
		});
		if (fieldCount !== fieldIds.length) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'You do not have permission to access these fields.',
			);
		}
		const job = await prisma.job.create({
			data: {
				title,
				type,
				source: 'APPLICATOR',
				status: 'PENDING',
				growerId,
				applicatorId: user.id,
				startDate,
				endDate,
				description,
				farmId,
				sensitiveAreas,
				adjacentCrops,
				specialInstructions,
				attachments,
				fields: {
					create: fields.map(({ fieldId, actualAcres }) => ({
						fieldId,
						actualAcres,
					})),
				},
				products: {
					create: products.map(
						({ productId, totalAcres, price }) => ({
							productId,
							totalAcres,
							price,
						}),
					),
				},
				applicationFees: {
					create: applicationFees.map(
						({ description, rateUoM, perAcre }) => ({
							description,
							rateUoM,
							perAcre,
						}),
					),
				},
				// Notification: {
				// 	create: {
				// 		userId: growerId,
				// 		type: 'JOB_REQUEST',
				// 	},
				// },
			},
			include: {
				grower: {
					select: {
						firstName: true,
						lastName: true,
						fullName: true,
						email: true,
						phoneNumber: true,
					},
				},
				fieldWorker: { select: { fullName: true } },
				farm: {
					select: {
						name: true,
						state: { select: { id: true, name: true } },
						county: true,
						township: true,
						zipCode: true,
					},
				},
				fields: {
					select: {
						actualAcres: true,
						field: {
							select: { name: true, acres: true, crop: true },
						},
					},
				},
				products: {
					select: {
						product: {
							select: { productName: true, perAcreRate: true },
						},
						totalAcres: true,
						price: true,
					},
				},
				applicationFees: true,
			},
		});
		const inviteLink = `https://grower-ac.netlify.app/#/growerJob?token=${job.id}`;
		const subject = 'Job Confirmation';
		const message = `
	  ${user.firstName} ${user.lastName} added a job that needs your confirmation.!<br><br>
	  Click the link below to accept it.<br><br>
	  <a href="${inviteLink}">${inviteLink}</a><br><br>
	  If you did not expect this invitation, please ignore this email.
	`;

		const email = job?.grower?.email;
		if (!email) {
			throw new Error('Email address is not available for the grower.');
		}
		const html = await mailHtmlTemplate(subject, message);
		await sendEmail({
			emailTo: email,
			subject,
			text: 'Job Confirmation',
			html,
		});
		await prisma.notification.create({
			data: {
				userId: growerId, // Notify the appropriate user
				jobId: job.id,
				type: 'JOB_REQUEST'


			},
		});
		await sendPushNotifications({
			userIds: growerId,
			title: `Job Confirmation`,
			message: `${user.firstName} ${user.lastName} added a job that needs your confirmation.`,
			notificationType: 'JOB_CREATED',
		});
		return job;
	}
	if (user.role === 'GROWER') {
		const {
			title,
			type,
			userId: applicatorId,
			startDate,
			endDate,
			description,
			farmId,
			sensitiveAreas,
			adjacentCrops,
			specialInstructions,
			attachments = [],
			fields = [],
			products = [],
			applicationFees = [],
		} = data;
		if (typeof applicatorId !== 'number') {
			throw new Error('applicatorId is required and must be a number');
		}
		const hasFarmPermission = await prisma.applicatorGrower.count({
			where: {
				growerId: user.id,
				applicatorId,
			},
		});

		if (!hasFarmPermission) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'You do not have permission to access this farm.',
			);
		}

		// const productIds = products.map(({ productId }) => productId);
		// const productCount = await prisma.product.count({
		// 	where: { id: { in: productIds }, createdById: user.id },
		// });
		// if (productCount !== productIds.length) {
		// 	throw new ApiError(
		// 		httpStatus.FORBIDDEN,
		// 		'You do not have permission to access these products.',
		// 	);
		// }
		const farm = await prisma.farm.findUnique({
			where: { id: farmId, growerId: user.id },
			select: { id: true },
		});
		if (!farm) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'You do not have permission to access this farm.',
			);
		}

		const fieldIds = fields.map(({ fieldId }) => fieldId);
		const fieldCount = await prisma.field.count({
			where: { id: { in: fieldIds }, farmId },
		});
		if (fieldCount !== fieldIds.length) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'You do not have permission to access these fields.',
			);
		}
		await prisma.$transaction(async (prisma) => {
			const job = await prisma.job.create({
				data: {
					title,
					type,
					source: 'GROWER',
					status: 'PENDING',
					growerId: user.id,
					applicatorId,
					startDate,
					endDate,
					description,
					farmId,
					sensitiveAreas,
					adjacentCrops,
					specialInstructions,
					attachments,
					fields: {
						create: fields.map(({ fieldId, actualAcres }) => ({
							fieldId,
							actualAcres,
						})),
					},
					products: {
						create: products.map(
							({ productName, perAcreRate, totalAcres }) => ({
								name: productName,
								perAcreRate,
								totalAcres,
								price: (totalAcres ?? 0) * (perAcreRate ?? 0), // Handle possible undefined values
							}),
						),
					},
					applicationFees: {
						create: applicationFees.map(
							({ description, rateUoM, perAcre }) => ({
								description,
								rateUoM,
								perAcre,
							}),
						),
					},
					// Notification: {
					// 	create: {
					// 		userId: applicatorId,
					// 		type: 'JOB_REQUEST',
					// 	},
					// },
				},
				include: {
					grower: {
						select: {
							firstName: true,
							lastName: true,
							fullName: true,
							email: true,
							phoneNumber: true,
						},
					},
					fieldWorker: { select: { fullName: true } },
					farm: {
						select: {
							name: true,
							state: { select: { id: true, name: true } },
							county: true,
							township: true,
							zipCode: true,
						},
					},
					fields: {
						select: {
							actualAcres: true,
							field: {
								select: { name: true, acres: true, crop: true },
							},
						},
					},
					products: {
						select: {
							product: {
								select: { productName: true, perAcreRate: true },
							},
							totalAcres: true,
							price: true,
							name: true,
							perAcreRate: true,
						},
					},
					applicationFees: true,
				},
			});
			await prisma.notification.create({
				data: {
					userId: applicatorId, // Notify the appropriate user
					jobId: job.id,
					type: 'JOB_REQUEST'


				},
			});
			return job;
		});
		await sendPushNotifications({
			userIds: applicatorId,
			title: `Job Confirmation`,
			message: `${user.firstName} ${user.lastName} added a job that needs your confirmation.`,
			notificationType: 'JOB_CREATED',
		});

	}
};

// Get job list by applicator with filters
const getAllJobsByApplicator = async (
	applicatorId: number,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
) => {
	// Set pagination
	const limit =
		options.limit && parseInt(options.limit, 10) > 0
			? parseInt(options.limit, 10)
			: 10;
	const page =
		options.page && parseInt(options.page, 10) > 0
			? parseInt(options.page, 10)
			: 1;
	const skip = (page - 1) * limit;

	// Build filters dynamically
	const filters: Prisma.JobWhereInput = {
		applicatorId,
		status: {
			in: [
				'READY_TO_SPRAY',
				'ASSIGNED_TO_PILOT',
				'PILOT_REJECTED',
				'IN_PROGRESS',
				'SPRAYED',
				'INVOICED',
				'PAID',
			],
		},
	};

	// Apply dynamic label filtering
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;

		switch (options.label) {
			case 'title':
				searchFilter.title = {
					contains: searchValue,
					mode: 'insensitive',
				};
				break;
			case 'type':
				searchFilter.type = {
					equals: searchValue as JobType, // Ensure type matches your Prisma enum
				};
				break;
			case 'source':
				searchFilter.source = {
					equals: searchValue as JobSource, // Ensure type matches your Prisma enum
				};
				break;

			case 'growerName':
				searchFilter.grower = {
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
			case 'growerId':
				searchFilter.growerId = parseInt(searchValue, 10);

				break;
			case 'status':
				searchFilter.status = searchValue as Prisma.EnumJobStatusFilter;
				break;
			case 'township':
				searchFilter.farm = {
					township: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'county':
				searchFilter.farm = {
					county: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'state':
				searchFilter.farm = {
					state: {
						name: { contains: searchValue, mode: 'insensitive' },
					},
				};
				break;

			case 'pilot':
				searchFilter.fieldWorker = {
					fullName: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'startDate':
				searchFilter.startDate = {
					gte: new Date(searchValue),
				};
				break;
			case 'endDate':
				searchFilter.endDate = {
					lte: new Date(searchValue),
				};
				break;
			default:
				throw new Error('Invalid label provided.');
		}

		Object.assign(filters, searchFilter); // Merge filters dynamically
	}

	// Fetch jobs
	const jobs = await prisma.job.findMany({
		where: filters,
		include: {
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
				},
			},
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});

	// Calculate total acres for each job
	const formattedJobs = jobs.map((job) => ({
		...job,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		),
	}));

	// Count total results for pagination
	const totalResults = await prisma.job.count({
		where: filters,
	});

	const totalPages = Math.ceil(totalResults / limit);

	return {
		result: formattedJobs,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

// service for Job
const getJobById = async (user: User, jobId: number) => {
	const { id, role } = user;
	const whereCondition: {
		id: number;
		applicatorId?: number;
		growerId?: number;
	} = { id: jobId };

	if (role === 'APPLICATOR') {
		whereCondition.applicatorId = id;
	} else if (role === 'GROWER') {
		whereCondition.growerId = id;
	}
	const job = await prisma.job.findUnique({
		where: whereCondition,
		include: {
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
					businessName: true,
				},
			},
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
					businessName: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
				},
			},
			farm: {
				select: {
					id: true,
					farmImageUrl: true,
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							id: true,
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			products: {
				select: {
					id: true,
					totalAcres: true,
					price: true,
					name: true,
					perAcreRate: true,
					product: {
						select: {
							id: true,
							productName: true,
							perAcreRate: true,
						},
					},
				},
			},
			applicationFees: true,
			jobActivities: {
				select: {
					createdAt: true,
					oldStatus: true,
					newStatus: true,
					changedBy: {
						select: {
							fullName: true,
						},
					},
					reason: true,
				},
				orderBy: {
					id: 'desc',
				},
			},
		},
		omit: {
			applicatorId: true,
			fieldWorkerId: true,
			farmId: true,
		},
	});
	// Check if user is null
	if (!job) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'No job found for the given job Id.',
		);
	}
	if (role === 'GROWER') {
		if (
			job.status === 'ASSIGNED_TO_PILOT' ||
			job.status === 'PILOT_REJECTED'
		) {
			job.status = 'READY_TO_SPRAY';
		}
	}
	const fields = await prisma.field.findMany({
		where: {
			farmId: job.farm.id,
		},
		select: {
			acres: true,
		},
	});
	// Format the job object with conditional removal of applicator or grower
	const formattedJob = (({
		applicator,
		grower,
		products,
		jobActivities,
		...job
	}) => ({
		...job,
		...(role === 'APPLICATOR' ? { grower } : {}), // Include grower only if role is APPLICATOR
		...(role === 'GROWER'
			? { applicator, createdBy: grower?.fullName }
			: {}), // Include applicator and grower name for createdby prop only if role is GROWER
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		),
		farm: {
			...job.farm,
			totalAcres: fields.reduce(
				(sum, f) => sum + (f.acres ? f.acres.toNumber() : 0),
				0,
			),
		},
		products: products.map(({ product, name, perAcreRate, ...rest }) => ({
			...rest,
			name: product ? product?.productName : name, // Move productName to name
			perAcreRate: product ? product?.perAcreRate : perAcreRate, // Move perAcreRate from product
		})),
		jobActivities: jobActivities.map(({ changedBy, ...activity }) => ({
			...activity,
			updatedBy: changedBy?.fullName || null,
		})),
	}))(job);

	return formattedJob;
};

// to delete job
const deleteJob = async (jobId: number) => {
	await prisma.job.delete({
		where: {
			id: jobId,
		},
	});

	return {
		message: 'Job deleted successfully.',
	};
};
const updateJobByApplicator = async (
	user: User,
	jobId: number,
	data: { status: JobStatus; fieldWorkerId?: number }, // fieldWorkerId optional
) => {
	const whereCondition: {
		id: number;
		applicatorId?: number;
		fieldWorkerId?: number;
	} = { id: jobId };

	if (user.role === 'APPLICATOR') {
		whereCondition.applicatorId = user.id;

	}
	if (user.role === 'WORKER') {
		whereCondition.fieldWorkerId = user.id;
	}
	// Fetch current job status from database
	const job = await prisma.job.findUnique({
		where: whereCondition,
		select: {
			id: true,
			status: true,
		},
	});

	if (!job) {
		throw new ApiError(httpStatus.NOT_FOUND, 'Job not found.');
	}

	const { status: currentStatus } = job;
	const { status: requestedStatus, fieldWorkerId } = data;
	// Valid job status transitions
	const statusTransitions: Record<JobStatus, JobStatus[]> = {
		READY_TO_SPRAY: ['ASSIGNED_TO_PILOT'], // A job in READY_TO_SPRAY can only move to ASSIGNED_TO_PILOT
		SPRAYED: ['INVOICED'], // A job in SPRAYED can only move to INVOICED
		INVOICED: ['PAID'], // A job in INVOICED can only move to PAID
		PAID: ['PAID'], // PAID jobs remain PAID
		// Jobs in the following statuses cannot transition to other statuses:
		OPEN_FOR_BIDDING: [],
		PENDING: [],
		REJECTED: [],
		ASSIGNED_TO_PILOT: [],
		PILOT_REJECTED: ['ASSIGNED_TO_PILOT'], // A job rejected by the pilot can be reassigned
		IN_PROGRESS: ['SPRAYED'], // A job in progress can only move to SPRAYED
	};

	if (
		requestedStatus &&
		!statusTransitions[currentStatus]?.includes(requestedStatus)
	) {
		throw new ApiError(
			httpStatus.CONFLICT,
			`Invalid status transition from ${currentStatus} to ${requestedStatus}.`,
		);
	}
	// If assigning a field worker, validate status
	if (
		fieldWorkerId &&
		currentStatus !== 'READY_TO_SPRAY' &&
		currentStatus !== 'PILOT_REJECTED'
	) {
		throw new ApiError(
			httpStatus.CONFLICT,
			'Job status must be READY_TO_SPRAY or PILOT_REJECTED to assign a pilot.',
		);
	}

	if (fieldWorkerId && user.role === 'APPLICATOR') {
		await prisma.$transaction(async (tx) => {
			await tx.job.update({
				where: { id: jobId },
				data: {
					...data,
					status: 'ASSIGNED_TO_PILOT',
					fieldWorkerId: fieldWorkerId,
					// Notification: {
					// 	create: {
					// 		userId: fieldWorkerId,
					// 		type: 'JOB_ASSIGNED',
					// 	},
					// },
				},
			});
			await tx.jobActivity.create({
				// update because this job id already has a record in this module
				data: {
					jobId: job.id,
					changedById: user.id, //Connect to an existing user
					changedByRole: user.role as UserRole,
					oldStatus: currentStatus,
					newStatus: 'ASSIGNED_TO_PILOT',
					reason: null,
				},
			});
			await prisma.notification.create({
				data: {
					userId: fieldWorkerId, // Notify the appropriate user
					jobId: job.id,
					type: 'JOB_ASSIGNED'

				},
			});
			// await sendPushNotifications({
			// 	userIds: fieldWorkerId,
			// 	title: `Job Confirmation`,
			// 	message: `${user.firstName} ${user.lastName} assigned a job that needs your confirmation.`,
			// 	notificationType: 'JOB_ASSIGNED',
			// });
		});
	}
	if (requestedStatus) {
		// Update job status
		await prisma.$transaction(async (tx) => {
			const job = await tx.job.update({
				where: { id: jobId },
				data: {
					...data,
					status: requestedStatus,
				},
				include: {
					products: {
						select: {
							name: true,
							totalAcres: true,
							price: true,
							perAcreRate: true,
							product: {
								select: {
									id: true,
									productName: true,
									perAcreRate: true,
								},
							},
						},
					},
					applicationFees: {
						select: {
							description: true,
							rateUoM: true,
							perAcre: true,
						},
					},
				},
			});
			await tx.jobActivity.create({
				data: {
					jobId: job.id,
					changedById: user.id, //Connect to an existing user
					changedByRole: user.role as UserRole,
					oldStatus: currentStatus,
					newStatus: data.status,
					reason: null,
				},
			});

			if (requestedStatus === 'INVOICED') {
				// Calculate total amount (sum of all applicationFees.rateUoM + products.price)
				const afAmountTotal = job.applicationFees.reduce(
					(sum, fee) =>
						sum + (fee.rateUoM ? fee.rateUoM.toNumber() : 0),
					0,
				);
				const productAmountTotal = job.products.reduce(
					(sum, p) => sum + (p.price ? p.price.toNumber() : 0),
					0,
				);
				const totalAmount = afAmountTotal + productAmountTotal;
				await tx.invoice.create({
					data: {
						jobId: job.id,
						totalAmount: totalAmount,
					},
				});
			}
			if (requestedStatus === 'PAID') {
				await tx.invoice.update({
					where: {
						jobId: job.id,
					},
					data: {
						paidAt: new Date().toISOString(),
					},
				});
			}
			const notificationUserId =
			user.role === 'APPLICATOR'
				? job.growerId
				: user.role === 'WORKER'
					? job.applicatorId
					: job.growerId;

		if (!notificationUserId) {
			throw new ApiError(
				httpStatus.CONFLICT,
				'Invalid data provided',
			);
		}

			await tx.notification.create({
				data: {
					userId:notificationUserId,
					type:
					requestedStatus === 'SPRAYED'
					? 'JOB_COMPLETED'
					: requestedStatus === 'INVOICED'
						? 'INVOICE_GENERATED'
						: 'PAYMENT_RECEIVED',
			},
			});
	});
}

return {
	message: `Job updated successfully.`,
};
};

// const updateJobByApplicator = async (
// 	data: { status: JobStatus; fieldWorkerId: number },
// 	jobId: number,
// ) => {
// 	const job = await prisma.job.findUnique({
// 		where: { id: jobId },
// 		select: { status: true },
// 	  });
// 	  if (job?.status === "READY_TO_SPRAY" && data.status === "SPRAYED") {

// 		await prisma.job.update({
// 			where: { id: jobId },
// 			data: {
// 				status: data.status,
// 				fieldWorkerId: data.fieldWorkerId,
// 			},
// 		});
// 	  }

// 	return { message: 'Job updated successfully.' };
// };

// get pilots by applicator by Grower

const getAllPilotsByApplicator = async (applicatorId: number) => {
	const workers = await prisma.applicatorWorker.findMany({
		where: {
			applicatorId,
			workerType: 'PILOT',
			isActive: true,
		},
		select: {
			worker: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					fullName: true,
				},
			},
		},
		orderBy: {
			id: 'desc',
		},
	}); // Fetch all users

	return workers.map((worker) => worker.worker);
};

const getAllJobTypes = async () => {
	// Convert JobType enum into an array
	const jobStatusList = Object.values(JobType).map((type, index) => ({
		id: index + 1,
		name: type,
	}));
	return jobStatusList;
};

const getAllJobStatus = async () => {
	const jobStatusList = Object.values(JobStatus).map((status, index) => ({
		id: index + 1,
		name: status,
	}));
	// Filter the required statuses
	const filteredStatuses = jobStatusList.filter((status) =>
		['SPRAYED', 'INVOICED', 'PAID', 'IN_PROGRESS'].includes(status.name),
	);

	return filteredStatuses;
};

const getGrowerListForApplicator = async (applicatorId: number) => {
	const growers = await prisma.applicatorGrower.findMany({
		where: {
			applicatorId,
			inviteStatus: 'ACCEPTED',
		},
		select: {
			grower: {
				select: {
					id: true,
					fullName: true,
				},
			},
		},
	}); // Fetch all growers

	const formatGrowers = growers.map((item) => item.grower);
	return formatGrowers;
};
const getApplicatorListForGrower = async (growerId: number) => {
	const applicators = await prisma.applicatorGrower.findMany({
		where: {
			growerId,
			inviteStatus: 'ACCEPTED',
		},
		select: {
			applicator: {
				select: {
					id: true,
					fullName: true,
				},
			},
		},
	}); // Fetch all applicators
	const formatApplicators = applicators.map((item) => item.applicator);
	return formatApplicators;
};

const getFarmListByGrowerId = async (
	applicatorId: number,
	growerId: number,
) => {
	const farms = await prisma.farm.findMany({
		where: {
			growerId,
			permissions: {
				some: {
					applicatorId,
				},
			},
		},
		select: {
			id: true,
			name: true,
			farmImageUrl: true,
			// isActive: true,
			fields: {
				select: {
					id: true,
					name: true,
					acres: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	}); // Fetch all users
	// // Calculate total acres for each grower and each farm
	// const enrichedFarms = farms.map((farm) => {
	// 	const totalAcresByFarm = farm.fields.reduce(
	// 		(totalFarmAcres, field) => {
	// 			return (
	// 				totalFarmAcres +
	// 				parseFloat(field.acres?.toString() || '0')
	// 			);
	// 		},
	// 		0,
	// 	);

	// 	// Add total acres to the grower object
	// 	return {
	// 		...farm,
	// 		totalAcres: totalAcresByFarm,
	// 	};
	// });
	return farms;
};

const uploadJobAttachments = async (
	userId: number,
	files: Express.Multer.File[],
) => {
	// make connection with azure storage account for storage access
	const storageUrl = config.azureStorageUrl;
	const containerName = config.azureContainerName;
	console.log(storageUrl, containerName, 'blob');
	const blobServiceClient =
		BlobServiceClient.fromConnectionString(storageUrl);
	const containerClient: ContainerClient =
		blobServiceClient.getContainerClient(containerName);

	//  upload all file parralled at one by using promis.all
	const uploadedFiles = await Promise.all(
		files.map(async (file) => {
			// Generate unique blob names by using uniue id uuidv4
			const blobName = `jobs/${uuidv4()}_${file.originalname}`;

			const blockBlobClient =
				containerClient.getBlockBlobClient(blobName);
			await blockBlobClient.upload(file.buffer, file.buffer.length, {
				blobHTTPHeaders: {
					blobContentType: file.mimetype,
				},
			});
			return `/${containerName}/${blobName}`;
			// return {
			// 	jobAttachment: `/${containerName}/${blobName}`,
			// };
		}),
	);
	return uploadedFiles;
};
const getJobs = async (
	growerId: number,
	type: string,
	role: string,
	options: PaginateOptions,
) => {
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
	if (role !== 'GROWER') {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Access denied, only growers can view jobs',
		);
	}
	let jobs = await prisma.job.findMany({
		where: {
			growerId,
		},
		include: {
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					email: true,
					fullName: true,
					businessName: true,
					phoneNumber: true,
				},
			},

			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			// products: true,
			// applicationFees: true,
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	}); // Fetch all users
	// Calculate total acres for each job
	if (type === 'BIDDING') {
		jobs = jobs.filter((job) => job.source === 'BIDDING');
	} else if (type === 'GROWER') {
		jobs = jobs.filter((job) => job.source === 'GROWER');
	} else if (type === 'APPLICATOR') {
		jobs = jobs.filter((job) => job.source === 'APPLICATOR');
	}
	// const formattedJobs = jobs.map((job) => ({
	// 	...job,
	// 	...job,

	// 	...(job.applicator
	// 		? {
	// 				applicatorFullName: job.applicator.fullName,
	// 				applicatorBusinessName: job.applicator.businessName,
	// 			}
	// 		: {}), // Applicator values as key-value pair
	// 	...(job.farm ? { farmName: job.farm.name } : {}), // Farm values as key-value pair
	// 	// applicator: undefined, // Remove original object
	// 	// farm: undefined, // Remove original object
	// 	totalAcres: job.fields.reduce(
	// 		(sum, f) => sum + (f.actualAcres || 0),
	// 		0,
	// 	), // Sum actualAcres, default to 0 if null

	// }));
	const formattedJobs = jobs.map((job) => {
		if (
			job.status === 'ASSIGNED_TO_PILOT' ||
			job.status === 'PILOT_REJECTED'
		) {
			job.status = 'READY_TO_SPRAY';
		}

		return {
			...job,
			applicatorFullName: job.applicator?.fullName || null,
			applicatorBusinessName: job.applicator?.businessName || null,
			farmName: job.farm?.name || null,
			totalAcres: job.fields.reduce(
				(sum, f) => sum + (f.actualAcres || 0),
				0,
			),
		};
	});
	const totalResults = jobs.length;
	const totalPages = Math.ceil(totalResults / limit);
	return {
		result: formattedJobs,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
// get apis for Bidding screen
const getOpenJobs = async (
	user: User,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
) => {
	const { id: applicatorId } = user;
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
	const filters: Prisma.JobWhereInput = {
		source: 'BIDDING',
		status: 'OPEN_FOR_BIDDING',
	};
	// Exclude jobs already bid on by this applicator
	if (applicatorId) {
		filters.Bid = {
			none: {
				applicatorId,
			},
		};
	}
	// Apply dynamic label filtering
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;

		switch (options.label) {
			case 'title':
				searchFilter.title = {
					contains: searchValue,
					mode: 'insensitive',
				};
				break;
			case 'type':
				searchFilter.type = {
					equals: searchValue as JobType, // Ensure type matches your Prisma enum
				};
				break;
			case 'source':
				searchFilter.source = {
					equals: searchValue as JobSource, // Ensure type matches your Prisma enum
				};
				break;

			case 'growerName':
				searchFilter.grower = {
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
			case 'status':
				searchFilter.status = searchValue as Prisma.EnumJobStatusFilter;
				break;
			case 'township':
				searchFilter.farm = {
					township: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'county':
				searchFilter.farm = {
					county: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'state':
				searchFilter.farm = {
					state: {
						name: { contains: searchValue, mode: 'insensitive' },
					},
				};
				break;

			case 'pilot':
				searchFilter.fieldWorker = {
					fullName: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'startDate':
				searchFilter.startDate = {
					gte: new Date(searchValue),
				};
				break;
			case 'endDate':
				searchFilter.endDate = {
					lte: new Date(searchValue),
				};
				break;
			default:
				throw new Error('Invalid label provided.');
		}

		Object.assign(filters, searchFilter); // Merge filters dynamically
	}

	const jobs = await prisma.job.findMany({
		where: filters,
		select: {
			id: true,
			title: true,
			type: true,
			status: true,
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					// email: true,
					// phoneNumber: true,
				},
			},
			// fieldWorker: {
			// 	select: {
			// 		fullName: true,
			// 	},
			// },
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					// zipCode: true,
					// farmImageUrl: true,
				},
			},
			fields: {
				select: {
					// fieldId: true,
					actualAcres: true,
					// field: {
					// 	select: {
					// 		name: true,
					// 		acres: true,
					// 		crop: true,
					// 	},
					// },
				},
			},
			// products: true,
			// applicationFees: true,
		},
		// omit: {
		// 	source: true,
		// 	applicatorId: true,
		// 	fieldWorkerId: true,
		// },
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	const formattedJobs = jobs.map((job) => ({
		...job,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		), // Sum actualAcres, default to 0 if null
		// farm: {
		// 	...job.farm,
		// 	totalAcres: job.fields.reduce(
		// 		(sum, f) =>
		// 			sum + (f.field?.acres ? f.field.acres.toNumber() : 0),
		// 		0,
		// 	),
		// },
	}));
	// Calculate total acres for each job
	const totalResults = await prisma.job.count({
		where: filters,
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: formattedJobs,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getMyBidJobs = async (
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
	user: User,
) => {
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
	const filters: Prisma.BidWhereInput = {
		applicatorId: user.id,
		status: 'PENDING',
	};

	// Apply dynamic label filtering
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;

		switch (options.label) {
			case 'title':
				searchFilter.title = {
					contains: searchValue,
					mode: 'insensitive',
				};
				break;
			case 'type':
				searchFilter.type = {
					equals: searchValue as JobType, // Ensure type matches your Prisma enum
				};
				break;
			case 'source':
				searchFilter.source = {
					equals: searchValue as JobSource, // Ensure type matches your Prisma enum
				};
				break;

			case 'growerName':
				searchFilter.grower = {
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
			case 'status':
				searchFilter.status = searchValue as Prisma.EnumJobStatusFilter;
				break;
			case 'township':
				searchFilter.farm = {
					township: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'county':
				searchFilter.farm = {
					county: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'state':
				searchFilter.farm = {
					state: {
						name: { contains: searchValue, mode: 'insensitive' },
					},
				};
				break;

			case 'pilot':
				searchFilter.fieldWorker = {
					fullName: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'startDate':
				searchFilter.startDate = {
					gte: new Date(searchValue),
				};
				break;
			case 'endDate':
				searchFilter.endDate = {
					lte: new Date(searchValue),
				};
				break;
			default:
				throw new Error('Invalid label provided.');
		}

		Object.assign(filters, searchFilter); // Merge filters dynamically
	}

	const bidData = await prisma.bid.findMany({
		where: filters,
		select: {
			id: true,
			status: true,
			createdAt: true,
			updatedAt: true,
			job: {
				select: {
					id: true,
					title: true,
					type: true,
					grower: {
						select: {
							firstName: true,
							lastName: true,
							fullName: true,
						},
					},
					farm: {
						select: {
							name: true,
							state: true,
							county: true,
							township: true,
						},
					},
					fields: {
						select: {
							actualAcres: true,
						},
					},
				},
			},
		},

		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});

	const formattedBids = bidData.map((bid) => ({
		id: bid.job.id,
		bidId: bid.id,
		status: bid.status,
		title: bid.job.title,
		type: bid.job.type,
		grower: bid.job.grower,
		farm: {
			name: bid.job.farm.name,
			state: bid.job.farm.state, // Ensures it contains `{ id, name }`
			county: bid.job.farm.county,
			township: bid.job.farm.township,
		},
		fields: bid.job.fields, // Keeps fields as an array
		totalAcres: bid.job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		),
	}));

	const totalResults = await prisma.bid.count({
		where: filters,
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: formattedBids,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
// get job for applicator pending approval screen
const getJobsPendingFromMe = async (
	currentUser: User,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
) => {
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
	const { id, role } = currentUser;
	const whereCondition: {
		status: 'PENDING';
		applicatorId?: number;
		growerId?: number;
		source?: 'GROWER' | 'APPLICATOR';
	} = {
		status: 'PENDING',
	};

	if (role === 'APPLICATOR') {
		whereCondition.applicatorId = id;
		whereCondition.source = 'GROWER';
	} else if (role === 'GROWER') {
		whereCondition.growerId = id;
		whereCondition.source = 'APPLICATOR';
	}

	// Apply dynamic label filtering
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;

		switch (options.label) {
			case 'title':
				searchFilter.title = {
					contains: searchValue,
					mode: 'insensitive',
				};
				break;
			case 'type':
				searchFilter.type = {
					equals: searchValue as JobType, // Ensure type matches your Prisma enum
				};
				break;
			case 'source':
				searchFilter.source = {
					equals: searchValue as JobSource, // Ensure type matches your Prisma enum
				};
				break;

			case 'growerName':
				searchFilter.grower = {
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
			case 'status':
				searchFilter.status = searchValue as Prisma.EnumJobStatusFilter;
				break;
			case 'township':
				searchFilter.farm = {
					township: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'county':
				searchFilter.farm = {
					county: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'state':
				searchFilter.farm = {
					state: {
						name: { contains: searchValue, mode: 'insensitive' },
					},
				};
				break;

			case 'pilot':
				searchFilter.fieldWorker = {
					fullName: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'startDate':
				searchFilter.startDate = {
					gte: new Date(searchValue),
				};
				break;
			case 'endDate':
				searchFilter.endDate = {
					lte: new Date(searchValue),
				};
				break;
			default:
				throw new Error('Invalid label provided.');
		}

		Object.assign(whereCondition, searchFilter); // Merge filters dynamically
	}

	const jobs = await prisma.job.findMany({
		where: whereCondition,
		select: {
			id: true,
			title: true,
			type: true,
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					// email: true,
					// phoneNumber: true,
				},
			},
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					businessName: true,
					// email: true,
					// phoneNumber: true,
				},
			},
			// fieldWorker: {
			// 	select: {
			// 		fullName: true,
			// 	},
			// },
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					// zipCode: true,
					// farmImageUrl: true,
				},
			},
			fields: {
				select: {
					// fieldId: true,
					actualAcres: true,
					// field: {
					// 	select: {
					// 		name: true,
					// 		acres: true,
					// 		crop: true,
					// 	},
					// },
				},
			},
			// products: true,
			// applicationFees: true,
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	// Format the jobs and remove either the 'applicator' or 'grower' field based on the role
	const formattedJobs = jobs.map(({ applicator, grower, ...job }) => {
		return {
			...job,
			...(role === 'APPLICATOR' ? { grower } : {}), // Include grower only if role is APPLICATOR
			...(role === 'GROWER' ? { applicator } : {}), // Include applicator only if role is GROWER
			totalAcres: job.fields.reduce(
				(sum, f) => sum + (f.actualAcres || 0),
				0,
			),
		};
	});
	// Calculate the total number of pages based on the total results and limit
	const totalResults = await prisma.job.count({
		where: whereCondition,
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: formattedJobs,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getJobsPendingFromGrowers = async (
	currentUser: User,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
) => {
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
	const { id, role } = currentUser;
	const whereCondition: {
		status: 'PENDING';
		applicatorId?: number;
		growerId?: number;
		source?: 'GROWER' | 'APPLICATOR';
	} = {
		status: 'PENDING',
	};
	if (role === 'APPLICATOR') {
		whereCondition.applicatorId = id;
		whereCondition.source = 'APPLICATOR';
	} else if (role === 'GROWER') {
		whereCondition.growerId = id;
		whereCondition.source = 'GROWER';
	}

	// Apply dynamic label filtering
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;

		switch (options.label) {
			case 'title':
				searchFilter.title = {
					contains: searchValue,
					mode: 'insensitive',
				};
				break;
			case 'type':
				searchFilter.type = {
					equals: searchValue as JobType, // Ensure type matches your Prisma enum
				};
				break;
			case 'source':
				searchFilter.source = {
					equals: searchValue as JobSource, // Ensure type matches your Prisma enum
				};
				break;

			case 'growerName':
				searchFilter.grower = {
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
			case 'status':
				searchFilter.status = searchValue as Prisma.EnumJobStatusFilter;
				break;
			case 'township':
				searchFilter.farm = {
					township: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'county':
				searchFilter.farm = {
					county: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'state':
				searchFilter.farm = {
					state: {
						name: { contains: searchValue, mode: 'insensitive' },
					},
				};
				break;

			case 'pilot':
				searchFilter.fieldWorker = {
					fullName: { contains: searchValue, mode: 'insensitive' },
				};
				break;
			case 'startDate':
				searchFilter.startDate = {
					gte: new Date(searchValue),
				};
				break;
			case 'endDate':
				searchFilter.endDate = {
					lte: new Date(searchValue),
				};
				break;
			default:
				throw new Error('Invalid label provided.');
		}

		Object.assign(whereCondition, searchFilter); // Merge filters dynamically
	}

	const jobs = await prisma.job.findMany({
		where: whereCondition,
		select: {
			id: true,
			title: true,
			type: true,
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					// email: true,
					// phoneNumber: true,
				},
			},
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					businessName: true,
					// email: true,
					// phoneNumber: true,
				},
			},
			// fieldWorker: {
			// 	select: {
			// 		fullName: true,
			// 	},
			// },
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					// zipCode: true,
					// farmImageUrl: true,
				},
			},
			fields: {
				select: {
					// fieldId: true,
					actualAcres: true,
					// field: {
					// 	select: {
					// 		name: true,
					// 		acres: true,
					// 		crop: true,
					// 	},
					// },
				},
			},
			// products: true,
			// applicationFees: true,
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	// Format the jobs and remove either the 'applicator' or 'grower' field based on the role
	const formattedJobs = jobs.map(({ applicator, grower, ...job }) => {
		return {
			...job,
			...(role === 'APPLICATOR' ? { grower } : {}), // Include grower only if role is  APPLICATOR
			...(role === 'GROWER' ? { applicator } : {}), // Include applicator only if role GROWER
			totalAcres: job.fields.reduce(
				(sum, f) => sum + (f.actualAcres || 0),
				0,
			),
		};
	});

	// Calculate the total number of pages based on the total results and limit
	const totalResults = await prisma.job.count({
		where: whereCondition,
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: formattedJobs,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
// const getJobsPendingFromApplicators = async (Id: number) => {
// 	const jobs = await prisma.job.findMany({
// 		where: {
// 			growerId: Id,
// 			source: 'GROWER',
// 			status: 'PENDING',
// 		},
// 		include: {
// 			grower: {
// 				select: {
// 					firstName: true,
// 					lastName: true,
// 					fullName: true,
// 					email: true,
// 					phoneNumber: true,
// 				},
// 			},
// 			fieldWorker: {
// 				select: {
// 					fullName: true,
// 				},
// 			},
// 			farm: {
// 				select: {
// 					name: true,
// 					state: true,
// 					county: true,
// 					township: true,
// 					zipCode: true,
// 				},
// 			},
// 			fields: {
// 				select: {
// 					actualAcres: true,
// 					field: {
// 						select: {
// 							name: true,
// 							acres: true,
// 							crop: true,
// 						},
// 					},
// 				},
// 			},
// 			// products: true,
// 			// applicationFees: true,
// 		},
// 	});

// 	// Calculate total acres for each job
// 	return jobs.map((job) => ({
// 		...job,
// 		totalAcres: job.fields.reduce(
// 			(sum, f) => sum + (f.actualAcres || 0),
// 			0,
// 		), // Sum actualAcres, default to 0 if null
// 	}));
// };

const updatePendingJobStatus = async (
	data: { status: JobStatus; rejectionReason: string }, // fieldWorkerId optional
	jobId: number,
	user: User,
) => {
	// Fetch current job  from database
	const { id, role } = user;
	const whereCondition: {
		id: number;
		applicatorId?: number;
		growerId?: number;
		fieldWorkerId?: number;
		status: 'PENDING' | 'ASSIGNED_TO_PILOT'; // Worker condition added
	} = { id: jobId, status: 'PENDING' };

	if (role === 'APPLICATOR') {
		whereCondition.applicatorId = id;
	} else if (role === 'GROWER') {
		whereCondition.growerId = id;
	} else if (role === 'WORKER') {
		whereCondition.fieldWorkerId = id; // check for pilotid
		whereCondition.status = 'ASSIGNED_TO_PILOT';
		// Worker can only change status from ASSIGNED_TO_PILOT to PILOT_REJECT or IN_PROGRESS
		if (data.status !== 'PILOT_REJECTED' && data.status !== 'IN_PROGRESS') {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'pilot can only update jobs to PILOT_REJECT or IN_PROGRESS',
			);
		}
	}

	// const job = await prisma.job.findUnique({
	// 	where: whereCondition,
	// 	select: {
	// 		id: true,
	// 	},
	// });
	// if (!job) {
	// 	throw new Error('Job not found.');
	// }

	// Check if requested  is valid
	if (data.status) {
		await prisma.$transaction(async (tx) => {
			// Update the job status first
			const updatedJob = await tx.job.update({
				where: whereCondition,
				data: {
					status: data.status,
					// rejectionReason: data.rejectionReason,
				},
				select: {
					id: true,
					status: true,
					applicatorId: true,
					growerId: true,
					fieldWorkerId: true,
				},
			});
			console.log(updatedJob, 'updatedJob');
			// Determine userId for the notification
			const notificationUserId =
				role === 'GROWER'
					? updatedJob.applicatorId
					: role === 'WORKER'
						? updatedJob.applicatorId
						: updatedJob.growerId;

			if (!notificationUserId) {
				throw new ApiError(
					httpStatus.CONFLICT,
					'Invalid data provided',
				);
			}

			// Create the notification separately
			await tx.notification.create({
				data: {
					userId: notificationUserId, // Notify the appropriate user
					type:
						data.status === 'READY_TO_SPRAY'
							? 'JOB_ACCEPTED'
							: data.status === 'IN_PROGRESS'
								? 'JOB_ACCEPTED'
								: 'JOB_REJECTED',
				},
			});

			await tx.jobActivity.create({
				data: {
					jobId: updatedJob.id,
					changedById: id, //Connect to an existing user
					changedByRole: role as UserRole,
					oldStatus: whereCondition.status,
					newStatus: data.status,
					reason: data.rejectionReason,
				},
			});
		});
	}
	// await sendPushNotifications({
	// 	userIds: data?.userId,
	// 	title: `Job ${data.status} === "READY_TO_SPRAY" ? Accepted : ${data.status}  `,
	// 	message: `${user.firstName} ${user.lastName} ${data.status} === "READY_TO_SPRAY" ? ACCEPTED : ${data.status} the job `,
	// 	notificationType: `${data.status} === "READY_TO_SPRAY" ? 'JOB_ASSIGNED : JOB_REJECTED '`,
	// });

	return {
		message: `Job updated successfully.`,
	};
};

const getJobByPilot = async (
	applicatorId: number,
	pilotId: number,
	options: PaginateOptions,
) => {
	// Set the limit of users to be returned per page, default to 10 if not specified or invalid
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

	const jobs = await prisma.job.findMany({
		where: { applicatorId, fieldWorkerId: pilotId },
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	const totalResults = await prisma.job.count({
		where: { applicatorId, fieldWorkerId: pilotId },
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	const formattedJobs = jobs.map((job) => {
		if (job.status === 'INVOICED' || job.status === 'PAID') {
			job.status = 'SPRAYED';
		}

		return {
			...job,
		};
	});
	return {
		result: formattedJobs,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getAssignedJobs = async (applicatorId: number) => {
	return await prisma.job.findMany({
		where: { applicatorId, status: 'READY_TO_SPRAY', fieldWorkerId: null },
	});
};

const addOpenForBiddingJob = async (user: User, data: CreateJob) => {
	if (user.role === 'GROWER') {
		const { id: growerId } = user;
		const {
			title,
			type,
			// userId: growerId,
			startDate,
			endDate,
			description,
			farmId,
			sensitiveAreas,
			adjacentCrops,
			specialInstructions,
			attachments = [],
			fields = [],
			products = [],
			applicationFees = [],
		} = data;

		const fieldIds = fields.map(({ fieldId }) => fieldId);
		const fieldCount = await prisma.field.count({
			where: { id: { in: fieldIds }, farmId },
		});
		if (fieldCount !== fieldIds.length) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				'You do not have permission to access these fields.',
			);
		}

		const job = await prisma.job.create({
			data: {
				title,
				type,
				source: 'BIDDING',
				status: 'OPEN_FOR_BIDDING',
				growerId,
				startDate,
				endDate,
				description,
				farmId,
				sensitiveAreas,
				adjacentCrops,
				specialInstructions,
				attachments,
				fields: {
					create: fields.map(({ fieldId, actualAcres }) => ({
						fieldId,
						actualAcres,
					})),
				},
				products: {
					create: products.map(
						({ productName, perAcreRate, totalAcres }) => ({
							name: productName,
							perAcreRate,
							totalAcres,
							price: (totalAcres ?? 0) * (perAcreRate ?? 0), // Handle possible undefined values
						}),
					),
				},
				applicationFees: {
					create: applicationFees.map(
						({ description, rateUoM, perAcre }) => ({
							description,
							rateUoM,
							perAcre,
						}),
					),
				},
			},
			include: {
				grower: {
					select: {
						firstName: true,
						lastName: true,
						fullName: true,
						email: true,
						phoneNumber: true,
					},
				},
				fieldWorker: { select: { fullName: true } },
				farm: {
					select: {
						name: true,
						state: { select: { id: true, name: true } },
						county: true,
						township: true,
						zipCode: true,
					},
				},
				fields: {
					select: {
						actualAcres: true,
						field: {
							select: { name: true, acres: true, crop: true },
						},
					},
				},
				products: {
					select: {
						product: {
							select: { productName: true, perAcreRate: true },
						},
						totalAcres: true,
						price: true,
					},
				},
				applicationFees: true,
			},
		});
		return job;
	}
};

const upcomingApplications = async (
	userId: number,
	options: PaginateOptions & {
		month?: string;
	},
) => {
	const currentDate = new Date();
	// Month names array for converting string month to number
	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];

	let monthFilter = {}; // Default empty filter

	if (options.month) {
		const selectedMonth = monthNames.indexOf(options.month) + 1; // Get month number (1-12)

		if (selectedMonth >= 1 && selectedMonth <= 12) {
			const year = currentDate.getFullYear(); // Get current year
			const startOfMonth = new Date(year, selectedMonth - 1, 1);
			console.log(startOfMonth, 'startOfMonth');
			const endOfMonth = new Date(year, selectedMonth, 0, 23, 59, 59);
			monthFilter = {
				startDate: {
					gte: startOfMonth,
					lte: endOfMonth,
				},
			};
		}
	}
	const allJobsApplications = await prisma.job.findMany({
		where: {
			applicatorId: userId,
			...monthFilter, // if user wants to get selected month upcoming jobs
		},
		select: {
			id: true,
			startDate: true,
			farm: {
				select: {
					name: true,
				},
			},
			fields: {
				select: {
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
		},
	});
	// Final response format
	const formattedJobs = allJobsApplications.map((job) => ({
		jobId: job.id,
		farmName: job.farm.name,
		startDate: job.startDate || new Date(),
		fields: job.fields.map((fieldJob) => ({
			acres: fieldJob.field.acres,
			name: fieldJob.field.name, // Crop ki jagah Job Title return karna
			crop: fieldJob.field.crop, // Crop ki jagah Job Title return karna
		})),
	}));
	const upcomingJobApplication = formattedJobs.filter(
		(job) =>
			new Date(job.startDate).toISOString().split('T')[0] >=
			currentDate.toISOString().split('T')[0],
	);
	return upcomingJobApplication;
};

const getHeadersData = async (
	currentUser: User,
	options: { type: string; startDate: Date; endDate: Date },
) => {
	const { id, role } = currentUser;
	// if (role !== 'APPLICATOR' && role !== 'GROWER')
	// 	throw new Error('Unauthorized')

	let result;

	const endDateObj = options.endDate
		? options.endDate
		: new Date().toISOString();

	const startDate = options.startDate;
	const endDate = endDateObj;

	if (options.type) {
		switch (options.type) {
			case 'dashboard': {
				const dashboardfilters: Prisma.JobWhereInput = {
					...(role === 'APPLICATOR'
						? { applicatorId: id }
						: { growerId: id }),
					status: {
						in: ['READY_TO_SPRAY', 'SPRAYED', 'INVOICED', 'PAID'],
					},
					...(options.startDate
						? { createdAt: { gte: startDate, lte: endDate } }
						: {}),
				};
				const jobsCompleted = await prisma.job.count({
					where: dashboardfilters,
				});
				const dashboardtotalGrowersorApplicators =
					await prisma.applicatorGrower.count({
						where: {
							...(role === 'APPLICATOR'
								? { applicatorId: id }
								: { growerId: id }),
						},
					});
				const totalFarms = await prisma.farm.count({
					where: {
						createdById: id,
					},
				});
				const dashboardtotalAcres = await prisma.fieldJob.aggregate({
					where: { job: dashboardfilters },
					_sum: { actualAcres: true },
				});
				const dashboardtotalApplicationFees =
					await prisma.jobApplicationFee.aggregate({
						where: { job: dashboardfilters },
						_sum: { rateUoM: true },
					});
				const dashboardtotalProPrice =
					await prisma.jobProduct.aggregate({
						where: { job: dashboardfilters },
						_sum: { price: true },
					});
				result = {
					...(role === 'GROWER'
						? {
							totalExpenditures:
								(dashboardtotalApplicationFees._sum.rateUoM?.toNumber() ||
									0) +
								(dashboardtotalProPrice._sum.price?.toNumber() ||
									0),
						}
						: {
							totalRevenue:
								(dashboardtotalApplicationFees._sum.rateUoM?.toNumber() ||
									0) +
								(dashboardtotalProPrice._sum.price?.toNumber() ||
									0),
						}),
					jobsCompleted,
					...(role === 'APPLICATOR'
						? { totalGrowers: dashboardtotalGrowersorApplicators }
						: {
							totalApplicators:
								dashboardtotalGrowersorApplicators,
						}),
					totalAcres: dashboardtotalAcres._sum.actualAcres || 0,
					...(role === 'GROWER' && { totalFarms }),
				};

				break;
			}
			case 'myJobs': {
				const myJobsfilters: Prisma.JobWhereInput = {
					...(role === 'APPLICATOR'
						? { applicatorId: id }
						: { growerId: id }),

					status: {
						in: ['READY_TO_SPRAY', 'SPRAYED', 'INVOICED', 'PAID'],
					},
					...(options.startDate
						? { createdAt: { gte: startDate, lte: endDate } }
						: {}),
				};

				const totalJobs = await prisma.job.count({
					where: myJobsfilters,
				});
				const openJobsfilters: Prisma.JobWhereInput = {
					growerId: id,
					source: 'BIDDING',
					status: 'OPEN_FOR_BIDDING',

					...(options.startDate
						? { createdAt: { gte: startDate, lte: endDate } }
						: {}),
				};
				const openJobs = await prisma.job.count({
					where: openJobsfilters,
				});
				const myJobsTotalGrowersorApplicators =
					await prisma.job.groupBy({
						by: [
							role === 'APPLICATOR' ? 'growerId' : 'applicatorId',
						],
						where: myJobsfilters,
						_count: true,
					});
				const myJobsTotalAcres = await prisma.fieldJob.aggregate({
					where: { job: myJobsfilters },
					_sum: { actualAcres: true },
				});
				const totalGrowerFilter: Prisma.JobWhereInput = {
					...(role === 'APPLICATOR'
						? { applicatorId: id }
						: { growerId: id }),

					status: {
						in: ['READY_TO_SPRAY', 'SPRAYED', 'INVOICED', 'PAID'],
					},
					source: 'GROWER',
					...(options.startDate
						? { createdAt: { gte: startDate, lte: endDate } }
						: {}),
				};

				const totalGrowerJobs = await prisma.job.count({
					where: totalGrowerFilter,
				});
				const totalApplicatorFilter: Prisma.JobWhereInput = {
					...(role === 'APPLICATOR'
						? { applicatorId: id }
						: { growerId: id }),

					status: {
						in: ['READY_TO_SPRAY', 'SPRAYED', 'INVOICED', 'PAID'],
					},
					source: 'APPLICATOR',
					...(options.startDate
						? { createdAt: { gte: startDate, lte: endDate } }
						: {}),
				};

				const totalApplicatorJobs = await prisma.job.count({
					where: totalApplicatorFilter,
				});
				result = {
					totalJobs,
					...(role === 'GROWER' && { openJobs }),
					...(role === 'GROWER'
						? { totalGrowerJobs }
						: {
							totalAcres:
								myJobsTotalAcres._sum.actualAcres || 0,
						}),
					...(role === 'APPLICATOR'
						? {
							totalGrowers:
								myJobsTotalGrowersorApplicators.length,
						}
						: {
							totalApplicatorJobs,
						}),
				};
				break;
			}
			case 'openJobs': {
				const openJobfilters: Prisma.JobWhereInput = {
					...(role === 'APPLICATOR'
						? { applicatorId: id }
						: { growerId: id }),
					source: 'BIDDING',
					status: 'OPEN_FOR_BIDDING',
					...(options.startDate
						? { createdAt: { gte: startDate, lte: endDate } }
						: {}),
				};
				const openJobs = await prisma.job.count({
					where: openJobfilters,
				});
				const openJobTotalGrowersorApplicators =
					await prisma.job.groupBy({
						by: [
							role === 'APPLICATOR' ? 'growerId' : 'applicatorId',
						],
						where: openJobfilters,
						_count: true,
					});
				const openJobTotalAcres = await prisma.fieldJob.aggregate({
					where: { job: openJobfilters },
					_sum: { actualAcres: true },
				});
				result = {
					openJobs,
					totalAcres: openJobTotalAcres._sum.actualAcres || 0,
					...(role === 'APPLICATOR'
						? {
							totalGrowers:
								openJobTotalGrowersorApplicators.length,
						}
						: {
							totalApplicators:
								openJobTotalGrowersorApplicators.length,
						}),
				};
				break;
			}
			case 'pendingJobApprovals': {
				const whereConditionForMe: {
					status: 'PENDING';
					applicatorId?: number;
					growerId?: number;
					source?: 'GROWER' | 'APPLICATOR';
				} = { status: 'PENDING' };
				if (role === 'APPLICATOR') {
					whereConditionForMe.applicatorId = id;
					whereConditionForMe.source = 'GROWER';
				} else if (role === 'GROWER') {
					whereConditionForMe.growerId = id;
					whereConditionForMe.source = 'APPLICATOR';
				}
				const pendingJobsForMe = await prisma.job.count({
					where: {
						...whereConditionForMe,
						...(options.startDate
							? { createdAt: { gte: startDate, lte: endDate } }
							: {}),
					},
				});
				const pendingJobForMetotalGrowersorApplicator =
					await prisma.job.groupBy({
						by: [
							role === 'APPLICATOR' ? 'growerId' : 'applicatorId',
						],
						where: {
							...whereConditionForMe,
							...(options.startDate
								? {
									createdAt: {
										gte: startDate,
										lte: endDate,
									},
								}
								: {}),
						},
						_count: true,
					});
				const pendingJobForMetotalAcres =
					await prisma.fieldJob.aggregate({
						where: {
							job: {
								...whereConditionForMe,
								...(options.startDate
									? {
										createdAt: {
											gte: startDate,
											lte: endDate,
										},
									}
									: {}),
							},
						},
						_sum: { actualAcres: true },
					});
				const whereConditionForGrower: {
					status: 'PENDING';
					applicatorId?: number;
					growerId?: number;
					source?: 'GROWER' | 'APPLICATOR';
				} = { status: 'PENDING' };
				if (role === 'APPLICATOR') {
					whereConditionForGrower.applicatorId = id;
					whereConditionForGrower.source = 'APPLICATOR';
				} else if (role === 'GROWER') {
					whereConditionForGrower.growerId = id;
					whereConditionForGrower.source = 'GROWER';
				}
				const pendingJobsForGrower = await prisma.job.count({
					where: {
						...whereConditionForGrower,
						...(options.startDate
							? { createdAt: { gte: startDate, lte: endDate } }
							: {}),
					},
				});
				const pendingJobForGrowertotalGrowersorApplicator =
					await prisma.job.groupBy({
						by: [
							role === 'APPLICATOR' ? 'growerId' : 'applicatorId',
						],
						where: {
							...whereConditionForGrower,
							...(options.startDate
								? {
									createdAt: {
										gte: startDate,
										lte: endDate,
									},
								}
								: {}),
						},
						_count: true,
					});
				const pendingJobForGrowertotalAcres =
					await prisma.fieldJob.aggregate({
						where: {
							job: {
								...whereConditionForGrower,
								...(options.startDate
									? {
										createdAt: {
											gte: startDate,
											lte: endDate,
										},
									}
									: {}),
							},
						},
						_sum: { actualAcres: true },
					});
				result = {
					pendingFromMe: {
						pendingJobsForMe,
						totalAcres:
							pendingJobForMetotalAcres._sum.actualAcres || 0,
						...(role === 'APPLICATOR'
							? {
								totalGrowers:
									pendingJobForMetotalGrowersorApplicator.length,
							}
							: {
								totalApplicators:
									pendingJobForMetotalGrowersorApplicator.length,
							}),
					},
					pendingFromGrower: {
						pendingJobsForGrower,
						totalAcres:
							pendingJobForGrowertotalAcres._sum.actualAcres || 0,
						...(role === 'APPLICATOR'
							? {
								totalGrowers:
									pendingJobForGrowertotalGrowersorApplicator.length,
							}
							: {
								totalApplicators:
									pendingJobForGrowertotalGrowersorApplicator.length,
							}),
					},
				};
				break;
			}
			default:
				throw new Error('Invalid type provided.');
		}
	}

	return result;
};
const getRejectedJobs = async (user: User, options: PaginateOptions) => {
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
	const { role } = user;

	if (user.role === 'APPLICATOR') {
		const jobs = await prisma.job.findMany({
			where: {
				applicatorId: user.id,
				status: 'REJECTED',
				// source: 'APPLICATOR',
			},
			select: {
				id: true,
				title: true,
				type: true,
				// rejectionReason: true,
				grower: {
					select: {
						firstName: true,
						lastName: true,
						fullName: true,
						// email: true,
						// phoneNumber: true,
					},
				},
				applicator: {
					select: {
						firstName: true,
						lastName: true,
						fullName: true,
						businessName: true,
						// email: true,
						// phoneNumber: true,
					},
				},
				// fieldWorker: {
				// 	select: {
				// 		fullName: true,
				// 	},
				// },
				farm: {
					select: {
						name: true,
						state: true,
						county: true,
						township: true,
						// zipCode: true,
						// farmImageUrl: true,
					},
				},
				fields: {
					select: {
						// fieldId: true,
						actualAcres: true,
						// field: {
						// 	select: {
						// 		name: true,
						// 		acres: true,
						// 		crop: true,
						// 	},
						// },
					},
				},
				// products: true,
				// applicationFees: true,
			},
			skip,
			take: limit,
			orderBy: {
				id: 'desc',
			},
		});
		// Format the jobs and remove either the 'applicator' or 'grower' field based on the role
		const formattedJobs = jobs.map(({ applicator, grower, ...job }) => {
			return {
				...job,
				...(role === 'APPLICATOR' ? { grower } : {}), // Include grower only if role is APPLICATOR
				...(role === 'GROWER' ? { applicator } : {}), // Include applicator only if role is GROWER
				totalAcres: job.fields.reduce(
					(sum, f) => sum + (f.actualAcres || 0),
					0,
				),
			};
		});
		// Calculate the total number of pages based on the total results and limit
		const totalResults = await prisma.job.count({
			where: {
				applicatorId: user.id,
				status: 'REJECTED',
				// source: 'APPLICATOR',
			},
		});

		const totalPages = Math.ceil(totalResults / limit);
		// Return the paginated result including users, current page, limit, total pages, and total results
		return {
			result: formattedJobs,
			page,
			limit,
			totalPages,
			totalResults,
		};
	}
	if (user.role === 'GROWER') {
		const jobs = await prisma.job.findMany({
			where: {
				growerId: user.id,
				status: 'REJECTED',
				//   source: 'GROWER'
			},
			select: {
				id: true,
				title: true,
				type: true,
				// rejectionReason: true,
				grower: {
					select: {
						firstName: true,
						lastName: true,
						fullName: true,
						// email: true,
						// phoneNumber: true,
					},
				},
				applicator: {
					select: {
						firstName: true,
						lastName: true,
						fullName: true,
						businessName: true,
						// email: true,
						// phoneNumber: true,
					},
				},
				// fieldWorker: {
				// 	select: {
				// 		fullName: true,
				// 	},
				// },
				farm: {
					select: {
						name: true,
						state: true,
						county: true,
						township: true,
						// zipCode: true,
						// farmImageUrl: true,
					},
				},
				fields: {
					select: {
						// fieldId: true,
						actualAcres: true,
						// field: {
						// 	select: {
						// 		name: true,
						// 		acres: true,
						// 		crop: true,
						// 	},
						// },
					},
				},
				// products: true,
				// applicationFees: true,
			},
			skip,
			take: limit,
			orderBy: {
				id: 'desc',
			},
		});
		// Format the jobs and remove either the 'applicator' or 'grower' field based on the role
		const formattedJobs = jobs.map(({ applicator, grower, ...job }) => {
			return {
				...job,
				...(role === 'APPLICATOR' ? { grower } : {}), // Include grower only if role is APPLICATOR
				...(role === 'GROWER' ? { applicator } : {}), // Include applicator only if role is GROWER
				totalAcres: job.fields.reduce(
					(sum, f) => sum + (f.actualAcres || 0),
					0,
				),
			};
		});
		// Calculate the total number of pages based on the total results and limit
		const totalResults = await prisma.job.count({
			where: {
				growerId: user.id,
				status: 'REJECTED',
				//   source: 'GROWER'
			},
		});

		const totalPages = Math.ceil(totalResults / limit);
		// Return the paginated result including users, current page, limit, total pages, and total results
		return {
			result: formattedJobs,
			page,
			limit,
			totalPages,
			totalResults,
		};
	}
};

const getBiddingJobById = async (user: User, jobId: number) => {
	const { id, role } = user;
	const whereCondition: {
		id: number;
		applicatorId?: number;
		growerId?: number;
		source: JobSource;
	} = { id: jobId, source: 'BIDDING' };
	// check if applicator already placed bid then get detail of bidProduct and bidApplicatonFee
	//  related to applicatorbid Id for MyBid section
	const applicatorBid = await prisma.bid.findFirst({
		where: {
			applicatorId: id,
			jobId: jobId,
		},
		select: {
			id: true,
		},
	});

	if (role === 'GROWER') {
		whereCondition.growerId = id;
	}
	const job = await prisma.job.findUnique({
		where: whereCondition,
		include: {
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
					businessName: true,
				},
			},
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
					businessName: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
				},
			},
			farm: {
				select: {
					id: true,
					farmImageUrl: true,
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							id: true,
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			products: {
				select: {
					id: true,
					totalAcres: true,
					price: true,
					name: true,
					perAcreRate: true,
					product: {
						select: {
							id: true,
							productName: true,
							perAcreRate: true,
						},
					},
					BidProduct: applicatorBid
						? {
							where: {
								bidId: applicatorBid.id,
							},
							select: {
								bidRateAcre: true,
								bidPrice: true,
							},
						}
						: false,
				},
			},
			applicationFees: {
				include: {
					BidApplicationFee: applicatorBid
						? {
							where: {
								bidId: applicatorBid.id,
							},
							select: {
								bidAmount: true,
							},
						}
						: false,
				},
			},
			Bid: {
				where: {
					applicatorId: id,
				},
			},
		},
		omit: {
			applicatorId: true,
			fieldWorkerId: true,
			farmId: true,
		},
	});
	// Check if user is null
	if (!job) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'No job found for the given job Id.',
		);
	}
	const fields = await prisma.field.findMany({
		where: {
			farmId: job.farm.id,
		},
		select: {
			acres: true,
		},
	});
	const formattedJob = (({
		applicator,
		grower,
		products,
		applicationFees,
		Bid,
		...job
	}) => {
		// Format products
		const formattedProducts = products.map(
			({ product, BidProduct, name, ...rest }) => ({
				...rest,
				name: product ? product?.productName : name,
				bidRateAcre: BidProduct?.[0]?.bidRateAcre ?? null,
				bidPrice: BidProduct?.[0]?.bidPrice ?? null,
			}),
		);

		// Format applicationFees
		const formattedApplicationFees = applicationFees.map(
			({ BidApplicationFee, ...rest }) => ({
				...rest,
				bidAmount: BidApplicationFee?.[0]?.bidAmount ?? null,
			}),
		);

		// Calculate totalBidAmount with Prisma.Decimal safety
		const totalBidAmount =
			formattedProducts.reduce(
				(sum, p) =>
					sum +
					(p.bidPrice
						? (p.bidPrice as Prisma.Decimal).toNumber()
						: 0),
				0,
			) +
			formattedApplicationFees.reduce(
				(sum, f) =>
					sum +
					(f.bidAmount
						? (f.bidAmount as Prisma.Decimal).toNumber()
						: 0),
				0,
			);
		// Check if the current applicator has placed a bid
		const bidPlaced = Bid && Bid.length > 0;
		return {
			...job,
			...(role === 'APPLICATOR' ? { grower } : {}),
			...(role === 'GROWER' ? { applicator } : {}),
			totalAcres: job.fields.reduce(
				(sum, f) => sum + (f.actualAcres || 0),
				0,
			),
			farm: {
				...job.farm,
				totalAcres: fields.reduce(
					(sum, f) => sum + (f.acres ? f.acres.toNumber() : 0),
					0,
				),
			},
			products: formattedProducts,
			applicationFees: formattedApplicationFees,
			totalBidAmount,
			bidPlaced,
		};
	})(job);

	return formattedJob;
};

const getJobInvoice = async (user: User, jobId: number) => {
	const { id, role } = user;
	const whereCondition: Prisma.JobWhereInput = {
		id: jobId,
		status: { in: ['INVOICED', 'PAID'] as JobStatus[] },
	};

	if (role === 'APPLICATOR') {
		whereCondition.applicatorId = id;
	} else if (role === 'GROWER') {
		whereCondition.growerId = id;
	}
	const job = await prisma.job.findFirst({
		where: whereCondition,
		include: {
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
					businessName: true,
					address1: true,
					state: {
						select: {
							name: true,
						},
					},
					county: true,
					township: true,
				},
			},
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
					address1: true,
					state: {
						select: {
							name: true,
						},
					},
					county: true,
					township: true,
				},
			},
			farm: {
				select: {
					id: true,
					name: true,
					state: {
						select: {
							name: true,
						},
					},
					county: true,
					township: true,
					zipCode: true,
				},
			},
			products: {
				select: {
					name: true,
					totalAcres: true,
					price: true,
					perAcreRate: true,
					product: {
						select: {
							id: true,
							productName: true,
							perAcreRate: true,
						},
					},
				},
			},
			applicationFees: {
				select: {
					description: true,
					rateUoM: true,
					perAcre: true,
				},
			},
			Invoice: {
				select: {
					id: true,
					totalAmount: true,
					issuedAt: true,
					paidAt: true,
				},
			},
		},
		omit: {
			applicatorId: true,
			fieldWorkerId: true,
			growerId: true,
			description: true,
			sensitiveAreas: true,
			specialInstructions: true,
			adjacentCrops: true,
			attachments: true,
			// rejectionReason: true,
			createdAt: true,
			farmId: true,
		},
	});
	// Check if user is null
	if (!job) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'No job found for the given job Id.',
		);
	}
	const fields = await prisma.field.findMany({
		where: {
			farmId: job.farm.id,
		},
		select: {
			acres: true,
		},
	});
	// Calculate total amount (sum of all applicationFees.rateUoM + products.price)
	const afAmountTotal = job.applicationFees.reduce(
		(sum, fee) => sum + (fee.rateUoM ? fee.rateUoM.toNumber() : 0),
		0,
	);
	const productAmountTotal = job.products.reduce(
		(sum, p) => sum + (p.price ? p.price.toNumber() : 0),
		0,
	);
	const totalAmount = afAmountTotal + productAmountTotal;
	const { applicator, grower, Invoice } = job;

	// Format the job objects
	const formattedJob = (({ products, ...job }) => ({
		invoiceId: Invoice ? Invoice.id : null,
		invoiceDate: Invoice ? Invoice.issuedAt : null,
		...job,
		applicator: { ...applicator, state: applicator?.state?.name },
		grower: { ...grower, state: grower?.state?.name },
		// ...(role === 'APPLICATOR' ? { grower } : {}), // Include grower only if role is APPLICATOR
		// ...(role === 'GROWER' ? { applicator } : {}), // Include applicator only if role is GROWER
		Invoice: undefined,
		// totalAmount: job.Invoice?.totalAmount,
		totalAmount: totalAmount,
		farm: {
			...job.farm,
			totalAcres: fields.reduce(
				(sum, f) => sum + (f.acres ? f.acres.toNumber() : 0),
				0,
			),
		},
		products: products.map(({ product, name, perAcreRate, ...rest }) => ({
			...rest,
			name: product ? product?.productName : name, // Move productName to name
			perAcreRate: product ? product?.perAcreRate : perAcreRate, // Move perAcreRate from product
		})),
	}))(job);

	return formattedJob;
};
const getAllJobInvoices = async (user: User, options: PaginateOptions) => {
	const { id, role } = user;
	// Set pagination
	const limit =
		options.limit && parseInt(options.limit, 10) > 0
			? parseInt(options.limit, 10)
			: 10;
	const page =
		options.page && parseInt(options.page, 10) > 0
			? parseInt(options.page, 10)
			: 1;
	const skip = (page - 1) * limit;

	const whereCondition: Prisma.JobWhereInput = {
		status: { in: ['INVOICED', 'PAID'] as JobStatus[] },
	};

	if (role === 'APPLICATOR') {
		whereCondition.applicatorId = id;
	} else if (role === 'GROWER') {
		whereCondition.growerId = id;
	}
	const jobInvoices = await prisma.job.findMany({
		where: whereCondition,
		select: {
			id: true,
			source: true,
			status: true,
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
				},
			},
			Invoice: {
				select: {
					id: true,
					totalAmount: true,
					issuedAt: true,
					paidAt: true,
				},
			},
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});

	const flattened = jobInvoices.map((job) => {
		const { Invoice, ...jobData } = job;
		return {
			invoiceId: Invoice ? Invoice.id : null,
			invoiceDate: Invoice ? Invoice.issuedAt : null,
			amount: Invoice ? Invoice.totalAmount : null,
			...jobData,
		};
	});

	// Calculate total acres for each job
	const totalResults = await prisma.job.count({
		where: whereCondition,
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: flattened,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const acceptJobThroughEmail = async (
	jobId: number,
	status: 'ACCEPT' | 'REJECT',
) => {
	const whereCondition: {
		id: number;
		status: JobStatus;
	} = { id: jobId, status: 'PENDING' };
	if (status === 'ACCEPT') {
		const job = await prisma.job.update({
			where: whereCondition,
			data: {
				status: 'READY_TO_SPRAY',
			},
			select: { id: true },
		});
		if (!job) {
			throw new ApiError(
				httpStatus.BAD_REQUEST,
				'Invalid data or request has already been accepted or rejected.',
			);
		}

		return {
			message: 'Job accepted successfully.',
		};
	}
	if (status === 'REJECT') {
		const job = await prisma.job.update({
			where: whereCondition,
			data: {
				status: 'REJECTED',
			},
			select: { id: true },
		});
		if (!job) {
			throw new ApiError(
				httpStatus.BAD_REQUEST,
				'Invalid data or request has already been accepted or rejected.',
			);
		}

		return {
			message: 'Job rejected successfully.',
		};
	}
};
const getMyJobsByPilot = async (
	// applicatorId: number,
	pilotId: number,
	options: PaginateOptions,
) => {
	// Set the limit of users to be returned per page, default to 10 if not specified or invalid
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

	const jobs = await prisma.job.findMany({
		where: { fieldWorkerId: pilotId },
		include: {
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
					businessName: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
				},
			},
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});

	const totalResults = await prisma.job.count({
		where: { fieldWorkerId: pilotId },
	});
	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	// Modify status if it is "INVOICED" or "PAID"
	const modifiedJobs = jobs.map((job) => ({
		...job,
		status:
			job.status === 'INVOICED' || job.status === 'PAID'
				? 'SPRAYED'
				: job.status,
	}));

	return {
		result: modifiedJobs,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getPilotPendingJobs = async (
	// applicatorId: number,
	pilotId: number,
	options: PaginateOptions,
) => {
	// Set the limit of users to be returned per page, default to 10 if not specified or invalid
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

	const jobs = await prisma.job.findMany({
		where: {
			fieldWorkerId: pilotId,
			status: 'ASSIGNED_TO_PILOT',
		},
		select: {
			id: true,
			title: true,
			type: true,
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					businessName: true,
				},
			},
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});

	const formattedJobs = jobs.map((job) => ({
		...job,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		), // Sum actualAcres, default to 0 if null
	}));
	const totalResults = await prisma.job.count({
		where: { fieldWorkerId: pilotId, status: 'ASSIGNED_TO_PILOT' },
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: formattedJobs,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getPilotRejectedJobs = async (
	// applicatorId: number,
	pilotId: number,
	options: PaginateOptions,
) => {
	// Set the limit of users to be returned per page, default to 10 if not specified or invalid
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

	const jobs = await prisma.job.findMany({
		where: {
			jobActivities: {
				some: {
					changedById: pilotId,
					newStatus: 'PILOT_REJECTED',
				},
				none: {
					changedById: pilotId,
					newStatus: {
						in: ['IN_PROGRESS', 'SPRAYED'],
					}, // Exclude accepted reassigned jobs
				},
			},
		},
		select: {
			id: true,
			title: true,
			type: true,
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					businessName: true,
				},
			},
			farm: {
				select: {
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});

	const formattedJobs = jobs.map((job) => ({
		...job,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		), // Sum actualAcres, default to 0 if null
	}));

	const totalResults = await prisma.job.count({
		where: {
			jobActivities: {
				some: {
					changedById: pilotId,
					newStatus: 'PILOT_REJECTED',
				},
				none: {
					changedById: pilotId,
					newStatus: {
						in: ['IN_PROGRESS', 'SPRAYED'],
					}, // Exclude accepted reassigned jobs
				},
			},
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: formattedJobs,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
const getJobByIdForPilot = async (
	jobId: number,
	pilotId: number,
	// options: PaginateOptions,
) => {
	console.log(jobId, pilotId, 'jobId');
	const job = await prisma.job.findUnique({
		where: {
			id: jobId,
			fieldWorkerId: pilotId,
		},
		include: {
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
				},
			},
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
					businessName: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
				},
			},
			farm: {
				select: {
					id: true,
					farmImageUrl: true,
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							id: true,
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			products: {
				select: {
					id: true,
					totalAcres: true,
					price: true,
					name: true,
					perAcreRate: true,
					product: {
						select: {
							id: true,
							productName: true,
							perAcreRate: true,
						},
					},
				},
			},
			applicationFees: true,
			jobActivities: {
				select: {
					createdAt: true,
					oldStatus: true,
					newStatus: true,
					changedBy: {
						select: {
							fullName: true,
						},
					},
					reason: true,
				},
				orderBy: {
					id: 'desc',
				},
			},
		},
		omit: {
			applicatorId: true,
			growerId: true,
			fieldWorkerId: true,
		},
	});
	if (!job) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'No job found for the given job Id.',
		);
	}
	// Modify status if it is "INVOICED" or "PAID"
	if (job.status === 'INVOICED' || job.status === 'PAID') {
		job.status = 'SPRAYED';
	}
	const fields = await prisma.field.findMany({
		where: {
			farmId: job.farm.id,
		},
		select: {
			acres: true,
		},
	});
	// Format the job object with conditional removal of applicator or grower
	const formattedJob = (({ products, jobActivities, ...job }) => ({
		...job,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		),
		farm: {
			...job.farm,
			totalAcres: fields.reduce(
				(sum, f) => sum + (f.acres ? f.acres.toNumber() : 0),
				0,
			),
		},
		products: products.map(({ product, name, perAcreRate, ...rest }) => ({
			...rest,
			name: product ? product?.productName : name, // Move productName to name
			perAcreRate: product ? product?.perAcreRate : perAcreRate, // Move perAcreRate from product
		})),
		jobActivities: jobActivities.map(({ changedBy, ...activity }) => ({
			...activity,
			updatedBy: changedBy?.fullName || null,
		})),
	}))(job);

	return formattedJob;
};

const getJobActivitiesByJobId = async (
	jobId: number,
	// options: PaginateOptions,
) => {
	const jobActivities = await prisma.jobActivity.findMany({
		where: {
			jobId: jobId,
		},
	});

	return jobActivities;
};
const placeBidForJob = async (
	user: User,
	data: {
		jobId: number;
		products: any[];
		applicationFees: any[];
		description: string;
	},
) => {
	if (user.role !== 'APPLICATOR') {
		throw new Error('Only an applicator can place a bid');
	}

	const { jobId, products, applicationFees, description } = data;
	// Check if job exists
	const jobExists = await prisma.job.findUnique({
		where: { id: jobId },
		select: { growerId: true, products: true, applicationFees: true },
	});
	if (!jobExists) {
		throw new Error('Job not found');
	}
	// Validate that all products on which user place bid belong to the job
	const jobProductIds = jobExists.products.map((p) => p.id);
	const invalidProducts = products.filter(
		(p) => !jobProductIds.includes(p.productId),
	);
	if (invalidProducts.length > 0) {
		throw new Error('Some products do not belong to the selected job');
	}

	// Validate that all application fees on which user place bid belong to the job
	const jobFeeIds = jobExists.applicationFees.map((f) => f.id);
	const invalidFees = applicationFees.filter(
		(f) => !jobFeeIds.includes(f.feeId),
	);
	if (invalidFees.length > 0) {
		throw new Error(
			'Some application fees do not belong to the selected job',
		);
	}
	const existingBid = await prisma.bid.findUnique({
		where: {
			jobId_applicatorId: {
				jobId,
				applicatorId: user.id,
			},
		},
	});
	if (existingBid) {
		throw new ApiError(
			httpStatus.CONFLICT,
			'You have already placed a bid for this job.',
		);
	}

	// Create a new bid
	const result = await prisma.$transaction(async (prisma) => {
		const newBid = await prisma.bid.create({
			data: {
				jobId,
				applicatorId: user.id,
				status: 'PENDING',
				description,
			},
		});

		// Insert bid products
		if (products.length > 0) {
			await prisma.bidProduct.createMany({
				data: products.map(({ productId, bidRateAcre, bidPrice }) => ({
					bidId: newBid.id,
					productId,
					bidRateAcre,
					bidPrice,
				})),
			});
		}

		// Insert bid fees
		if (applicationFees.length > 0) {
			await prisma.bidApplicationFee.createMany({
				data: applicationFees.map(({ feeId, bidAmount }) => ({
					bidId: newBid.id,
					feeId,
					bidAmount,
				})),
			});
		}
		if (!jobExists?.growerId) {
			throw new Error('growerId is missing');
		}
		await prisma.notification.create({
			data: {
				userId: jobExists?.growerId, // Notify the appropriate user
				jobId: jobId,
				type:'BID_PLACED'
				
					
			},
		});
		return { newBid };
	});
   
	
	// // Send push notification outside transaction
	// await sendPushNotifications({
	// 	userIds: jobExists.growerId ?? [],
	// 	title: `Place a bid for job`,
	// 	message: `${user.firstName} ${user.lastName} placed a bid for a job that needs your confirmation.`,
	// 	notificationType: 'BID_PLACED',
	// });

	return result.newBid;
};

const getAllBidsByJobId = async (user: User, jobId: number) => {
	if (user.role !== 'GROWER') {
		throw new Error('grower can only access these bids');
	}
	const result = await prisma.bid.findMany({
		where: {
			jobId,
			// status: 'PENDING',
			job: {
				growerId: user.id, // Ensure the job belongs to the logged-in grower
				// status: 'OPEN_FOR_BIDDING',
				source: 'BIDDING',
			},
		},
		include: {
			applicator: {
				select: {
					profileImage: true,
					thumbnailProfileImage: true,
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					businessName: true,
				},
			},
			bidProducts: {
				select: {
					bidRateAcre: true,
					bidPrice: true,
					product: {
						select: {
							name: true,
							perAcreRate: true,
							totalAcres: true,
							price: true,
						},
					},
				},
			},
			bidFees: {
				select: {
					bidAmount: true,
					applicationFee: {
						select: {
							description: true,
							rateUoM: true,
							perAcre: true,
						},
					},
				},
			},
		},
	});
	// Flatten product/applicationFee and calculate totalBidAmount
	const flattened = result.map((bid) => {
		const bidProducts = bid.bidProducts.map((bp) => ({
			bidRateAcre: bp.bidRateAcre,
			bidPrice: bp.bidPrice,
			...bp.product,
		}));

		const bidFees = bid.bidFees.map((bf) => ({
			bidAmount: bf.bidAmount,
			...bf.applicationFee,
		}));

		const productTotal = bidProducts.reduce(
			(sum, p) => sum + (p.bidPrice ? p.bidPrice.toNumber() : 0),
			0,
		);
		const feeTotal = bidFees.reduce(
			(sum, f) => sum + (f.bidAmount ? f.bidAmount.toNumber() : 0),
			0,
		);

		return {
			...bid,
			bidProducts,
			bidFees,
			totalBidAmount: productTotal + feeTotal,
		};
	});

	return flattened;
};

const updateBidJobStatus = async (
	data: { status: BidStatus },
	bidId: number,
	user: User,
) => {
	const whereCondition: {
		id: number;
		status: 'PENDING'; // Worker condition added
	} = { id: bidId, status: 'PENDING' };
	// Fetch current job  from database
	const { id, role } = user;
	if (role !== 'GROWER') {
		throw new Error('only can grower update the job status');
	}
	const bidExist = await prisma.bid.findUnique({
		where: {
			id: bidId,
		},
	});
	if (!bidExist) {
		throw new Error('bid id is not found');
	}
	// Check if requested  is valid
	if (data.status === 'ACCEPTED') {
		await prisma.$transaction(async (tx) => {
			// update bid status first
			const updatedBid = await tx.bid.update({
				where: whereCondition,
				data: {
					status: data.status,
				},
				select: {
					id: true,
					jobId: true,
					status: true,
					applicatorId: true,
				},
			});
			// Update the job status
			const updatedJob = await tx.job.update({
				where: {
					id: updatedBid.jobId,
					status: 'OPEN_FOR_BIDDING',
				},
				data: {
					applicatorId: updatedBid.applicatorId, //update applicatorId
					status: 'READY_TO_SPRAY',
				},
				select: {
					id: true,
					status: true,
					applicatorId: true,
					growerId: true,
					fieldWorkerId: true,
				},
			});
			// Determine userId for the notification
			const notificationUserId = updatedBid?.applicatorId;
			// Create the notification separately
			await tx.notification.create({
				data: {
					userId: notificationUserId, // Notify the appropriate user
					jobId: data.status === 'ACCEPTED' ? updatedBid.jobId : null,
					type: 'BID_ACCEPTED',
				},
			});
			await tx.jobActivity.create({
				data: {
					jobId: updatedJob.id,
					changedById: id, //Connect to an existing user
					changedByRole: role as UserRole,
					oldStatus: 'OPEN_FOR_BIDDING',
					newStatus: 'READY_TO_SPRAY',
				},
			});
			//  Reject all other bids on the same job
			await tx.bid.updateMany({
				where: {
					jobId: updatedBid.jobId,
					id: { not: updatedBid.id },
					status: 'PENDING',
				},
				data: {
					status: 'REJECTED',
				},
			});
		});
	}

	return {
		message: `Bid accepted successfully.`,
	};
};

// service for Job
const getJobByIdThroughEmail = async (jobId: number) => {
	const job = await prisma.job.findUnique({
		where: {
			id: jobId,
			// source: 'APPLICATOR',
			// status: 'PENDING',
		},
		include: {
			applicator: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
					businessName: true,
				},
			},
			farm: {
				select: {
					id: true,
					farmImageUrl: true,
					name: true,
					state: true,
					county: true,
					township: true,
					zipCode: true,
				},
			},
			fields: {
				select: {
					actualAcres: true,
					field: {
						select: {
							id: true,
							name: true,
							acres: true,
							crop: true,
						},
					},
				},
			},
			products: {
				select: {
					id: true,
					totalAcres: true,
					price: true,
					name: true,
					perAcreRate: true,
					product: {
						select: {
							id: true,
							productName: true,
							perAcreRate: true,
						},
					},
				},
			},
			applicationFees: true,
		},
		omit: {
			applicatorId: true,
			fieldWorkerId: true,
			farmId: true,
		},
	});
	// Check if user is null
	if (!job) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'No job found for the given job Id.',
		);
	}

	const fields = await prisma.field.findMany({
		where: {
			farmId: job.farm.id,
		},
		select: {
			acres: true,
		},
	});
	// Format the job object with conditional removal of applicator or grower
	const formattedJob = (({ applicator, products, ...job }) => ({
		...job,
		applicator,
		totalAcres: job.fields.reduce(
			(sum, f) => sum + (f.actualAcres || 0),
			0,
		),
		farm: {
			...job.farm,
			totalAcres: fields.reduce(
				(sum, f) => sum + (f.acres ? f.acres.toNumber() : 0),
				0,
			),
		},
		products: products.map(({ product, name, perAcreRate, ...rest }) => ({
			...rest,
			name: product ? product?.productName : name, // Move productName to name
			perAcreRate: product ? product?.perAcreRate : perAcreRate, // Move perAcreRate from product
		})),
	}))(job);

	return formattedJob;
};

export default {
	createJob,
	getAllJobsByApplicator,
	getJobById,
	deleteJob,
	updateJobByApplicator,
	getAllPilotsByApplicator,
	getAllJobTypes,
	getAllJobStatus,
	getGrowerListForApplicator,
	getApplicatorListForGrower,
	getFarmListByGrowerId,
	uploadJobAttachments,
	getJobs,
	getOpenJobs,
	getMyBidJobs,
	getJobsPendingFromMe,
	getJobsPendingFromGrowers,
	// getJobsPendingFromApplicators,
	updatePendingJobStatus,
	getJobByPilot,
	getAssignedJobs,
	addOpenForBiddingJob,
	upcomingApplications,
	getHeadersData,
	getRejectedJobs,
	getBiddingJobById,
	getJobInvoice,
	getAllJobInvoices,
	acceptJobThroughEmail,
	getMyJobsByPilot,
	getPilotPendingJobs,
	getPilotRejectedJobs,
	getJobByIdForPilot,
	getJobActivitiesByJobId,
	placeBidForJob,
	getAllBidsByJobId,
	updateBidJobStatus,
	getJobByIdThroughEmail,
};
