/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import {
	BidStatus,
	DroneFlightLog,
	JobSource,
	JobStatus,
	JobType,
	Prisma,
	UserRole,
} from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import ApiError from '../../../../../shared/utils/api-error';
import {
	calculateMaxY,
	calculateInterval,
} from '../../../../../shared/utils/line-chart';
import { CreateJob, MyJobsFilters } from './job-types';
import { v4 as uuidv4 } from 'uuid';
import { User, PaginateOptions } from '../../../../../shared/types/global';
import { sendPushNotifications } from '../../../../../shared/helpers/push-notification';
import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
import { sendEmail } from '../../../../../shared/helpers/node-mailer';
import { generateToken } from '../../../../user-service/src/helper/invite-token';
import { convertKmlToGeoJson } from '../../util/kml-to-geoJson';
// import { generateMapImage } from '../../util/map-image-generator';
import { uploadToAzureBlob } from '../../util/azure-uploader';
import { getUploader } from '../../../../../shared/helpers/uploaderFactory';
import { groupBy } from 'lodash';
import moment from 'moment';

// create grower
const createJob = async (user: User, data: CreateJob) => {
	if (user.role === 'APPLICATOR') {
		const token = generateToken('GROWER'); // job created for grower by applicator
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

		console.log('Fields:', fields);

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
		const grower = await prisma.applicatorGrower.findFirst({
			where: {
				applicatorId: user.id,
				growerId,
			},
		});
		const shouldAutoAcceptJobs = grower?.autoAcceptJobsByGrower;
		const job = await prisma.job.create({
			data: {
				token: token,
				tokenExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
				title,
				type,
				source: 'APPLICATOR',
				status: shouldAutoAcceptJobs ? 'READY_TO_SPRAY' : 'PENDING',
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
						profileStatus: true,
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
		const inviteLink =
			job.grower?.profileStatus === 'INCOMPLETE'
				? `https://grower-ac.netlify.app/#/growerJob?token=${job.token}`
				: `https://grower-ac.netlify.app/#/pendingApprovals`;
		const subject = 'Job Confirmation';
		const message = `
	  ${user.firstName} ${user.lastName} added a job that needs your confirmation.!<br><br>
	  Click the link below to accept or reject it.<br><br>
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
				type: 'JOB_REQUEST',
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
		const token = generateToken('APPLICATOR');
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
		const applciator = await prisma.applicatorGrower.findFirst({
			where: {
				growerId: user.id,
				applicatorId,
			},
		});
		const shouldAutoacceptJob = applciator?.autoAcceptJobsByApplicator;
		const result = await prisma.$transaction(async (prisma) => {
			const job = await prisma.job.create({
				data: {
					token: token,
					tokenExpiresAt: new Date(
						Date.now() + 3 * 24 * 60 * 60 * 1000,
					),
					title,
					type,
					source: 'GROWER',
					status: shouldAutoacceptJob ? 'READY_TO_SPRAY' : 'PENDING',
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
					applicator: {
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
								select: {
									productName: true,
									perAcreRate: true,
								},
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
					type: 'JOB_REQUEST',
				},
			});
			return { job };
		});

		const inviteLink = `https://applicator-ac.netlify.app/pendingApprovals`;
		const subject = 'Job Confirmation';
		const message = `
  ${user.firstName} ${user.lastName} added a job that needs your confirmation.!<br><br>
  Click the link below to accept or reject it.<br><br>
  <a href="${inviteLink}">${inviteLink}</a><br><br>
  If you did not expect this invitation, please ignore this email.
`;

		const email = result.job?.applicator?.email;
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
		await sendPushNotifications({
			userIds: applicatorId,
			title: `Job Confirmation`,
			message: `${user.firstName} ${user.lastName} added a job that needs your confirmation.`,
			notificationType: 'JOB_CREATED',
		});

		return result.job;
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
		if (options.label === 'all') {
			const searchValue = options.searchValue?.toUpperCase();

			// Try to match enums first
			const isJobTypeMatch = Object.values(JobType).includes(
				searchValue as JobType,
			);
			const isJobSourceMatch = Object.values(JobSource).includes(
				searchValue as JobSource,
			);
			const isJobStatusMatch = Object.values(JobStatus).includes(
				searchValue as JobStatus,
			);

			if (isJobTypeMatch || isJobSourceMatch || isJobStatusMatch) {
				// Only filter on the first matched enum
				if (isJobTypeMatch) {
					filters.type = searchValue as JobType;
				} else if (isJobSourceMatch) {
					filters.source = searchValue as JobSource;
				} else if (isJobStatusMatch) {
					filters.status = searchValue as JobStatus;
				}
			} else {
				Object.assign(filters, {
					OR: [
						{
							title: {
								contains: options.searchValue,
								mode: 'insensitive',
							},
						},
						{
							farm: {
								name: {
									contains: options.searchValue,
									mode: 'insensitive',
								},
							},
						},
						{
							grower: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: options.searchValue,
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
				case 'title':
					searchFilter.title = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as JobType, // Ensure type matches your Prisma enum
					};
					break;
				case 'source':
					searchFilter.source = {
						equals: searchValue.toUpperCase() as JobSource, // Ensure type matches your Prisma enum
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
					searchFilter.status =
						searchValue.toUpperCase() as Prisma.EnumJobStatusFilter;
					break;
				case 'township':
					searchFilter.farm = {
						township: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
							name: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					};
					break;

				case 'pilot':
					searchFilter.fieldWorker = {
						fullName: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
					growers: {
						where: {
							applicatorId,
						},
						select: {
							growerFirstName: true,
							growerLastName: true,
						},
					},
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
							config: true,
							latitude: true,
							longitude: true,
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

	const formattedJobs = jobs.map((job) => {
		const applicatorGrower = job.grower?.growers?.[0];
		const growerFirstName = applicatorGrower?.growerFirstName || '';
		const growerLastName = applicatorGrower?.growerLastName || '';
		return {
			...job,
			grower: {
				...job.grower,
				growers: undefined,
				firstName: growerFirstName,
				lastName: growerLastName,
				fullName: `${growerFirstName} ${growerLastName}`,
			},
			totalAcres: parseFloat(
				job.fields
					.reduce(
						(sum, f) => sum + (f.actualAcres?.toNumber?.() || 0),
						0,
					)
					.toFixed(2),
			),
			latitude: job.fields[0]?.field?.latitude,
			longitude: job.fields[0]?.field?.longitude,
		};
	});

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

const getAllJobsByApplicatorDashboard = async (
	applicatorId: number,
	options: PaginateOptions,
	filtersOption: MyJobsFilters,
) => {
	// Setup pagination
	const limit = options.limit && +options.limit > 0 ? +options.limit : 10;
	const page = options.page && +options.page > 0 ? +options.page : 1;
	const skip = (page - 1) * limit;

	const dateRanges: Record<string, Date> = {
		day: moment.utc().startOf('day').toDate(),
		week: moment.utc().startOf('isoWeek').toDate(),
		month: moment.utc().startOf('month').toDate(),
		year: moment.utc().startOf('year').toDate(),
	};

	const dateFilter: Prisma.JobWhereInput = {};
	const { startDate } = filtersOption;

	if (startDate && startDate !== 'default') {
		if (dateRanges[startDate]) {
			dateFilter.createdAt = { gte: dateRanges[startDate] };
		} else if (moment(startDate, 'YYYY-MM-DD', true).isValid()) {
			dateFilter.createdAt = {
				gte: moment.utc(startDate).startOf('day').toDate(),
				lte: moment.utc(startDate).endOf('day').toDate(),
			};
		} else {
			console.warn('Invalid startDate:', startDate);
		}
	}

	const filters = filtersOption.filter || [];
	const hasUnassigned = filters.includes('UNASSIGNED');
	const jobStatuses = filters.filter((status) => status !== 'UNASSIGNED');

	const statusFilter = jobStatuses.length
		? { OR: jobStatuses.map((status) => ({ status })) }
		: {};

	const unassignedFilter = hasUnassigned ? { fieldWorkerId: null } : {};

	const combinedFilter: Prisma.JobWhereInput = filters.length
		? hasUnassigned && jobStatuses.length
			? { AND: [unassignedFilter, statusFilter] }
			: hasUnassigned
				? unassignedFilter
				: statusFilter
		: {};

	const jobFilters: Prisma.JobWhereInput = {
		applicatorId,
		...dateFilter,
		...combinedFilter,
	};

	const allJobs = await prisma.job.findMany({
		where: jobFilters,
		include: {
			grower: {
				select: {
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
					phoneNumber: true,
					growers: {
						where: { applicatorId },
						select: {
							growerFirstName: true,
							growerLastName: true,
						},
					},
				},
			},
			fieldWorker: { select: { fullName: true } },
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
							latitude: true,
							longitude: true,
						},
					},
				},
			},
		},
		orderBy: { startDate: 'desc' },
		// skip,
		// take: limit,
	});

	const jobs = allJobs.map((job) => {
		const growerInfo = job.grower?.growers?.[0];
		const firstName = growerInfo?.growerFirstName || '';
		const lastName = growerInfo?.growerLastName || '';
		return {
			...job,
			grower: {
				...job.grower,
				growers: undefined,
				firstName,
				lastName,
				fullName: `${firstName} ${lastName}`.trim(),
			},
			totalAcres: parseFloat(
				job.fields
					.reduce(
						(sum, f) => sum + (f.actualAcres?.toNumber?.() || 0),
						0,
					)
					.toFixed(2),
			),
			latitude: job.fields[0]?.field?.latitude || null,
			longitude: job.fields[0]?.field?.longitude || null,
		};
	});

	let formattedResponse;
	if (filtersOption.groupBy?.length) {
		const groupBy = filtersOption.groupBy[0];
		const groupedJobs: Record<string, any[]> = {};

		for (const job of jobs) {
			let key = 'Ungrouped';
			switch (groupBy) {
				case 'Growers':
					key = job.grower?.fullName || 'Unknown Grower';
					break;
				case 'Pilots':
					key = job.fieldWorker?.fullName || 'Unassigned';
					break;
				case 'Type':
					key = job.type || 'Unknown Type';
					break;
				case 'Zip':
					key = job.farm?.zipCode || 'Unknown ZipCode';
					break;
				case 'County':
					key = job.farm?.county || 'Unknown County';
					break;
				case 'City':
					key = job.farm?.township || 'Unknown Township';
					break;
				case 'State':
					key = job.farm?.state?.name || 'Unknown State';
					break;
				default:
					key = job.status || 'Unknown Status';
					break;
			}

			if (!groupedJobs[key]) groupedJobs[key] = [];
			groupedJobs[key].push(job);
		}

		formattedResponse = Object.entries(groupedJobs).map(([key, jobs]) => ({
			groupBy,
			title: key,
			jobs,
		}));
	} else {
		const groupedByDate = jobs.reduce(
			(acc, job) => {
				const dateKey = moment(job.startDate).format('YYYY-MM-DD');
				if (!acc[dateKey]) acc[dateKey] = [];
				acc[dateKey].push(job);
				return acc;
			},
			{} as Record<string, typeof jobs>,
		);

		formattedResponse = Object.entries(groupedByDate).map(
			([date, jobs]) => ({
				title: date,
				jobs,
			}),
		);
	}

	return {
		result: formattedResponse || [],
		// page,
		// limit,
		// totalPages,
		// totalResults,
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
					growers:
						role === 'APPLICATOR'
							? {
								where: {
									applicatorId: id,
								},
								select: {
									growerFirstName: true,
									growerLastName: true,
								},
							}
							: undefined,
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
							config: true,
							fieldImageUrl: true,
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
			DroneFlightLog: {
				select: {
					id: true,
					droneId: true,
					startTime: true,
					endTime: true,
					mapImageUrl: true,
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
	let firstName = '';
	let lastName = '';

	if (role === 'APPLICATOR') {
		const applicatorGrower = job.grower?.growers?.[0];
		firstName = applicatorGrower?.growerFirstName || '';
		lastName = applicatorGrower?.growerLastName || '';
	}
	// Format the job object with conditional removal of applicator or grower
	const formattedJob = (({
		applicator,
		grower,
		products,
		jobActivities,
		...job
	}) => ({
		...job,

		...(role === 'APPLICATOR'
			? {
				grower: {
					...grower,
					growers: undefined,
					firstName,
					lastName,
					fullName: `${firstName} ${lastName}`.trim(),
				},
			}
			: {}), // Include grower only if role is APPLICATOR
		...(role === 'GROWER'
			? { applicator, createdBy: grower?.fullName }
			: {}), // Include applicator and grower name for createdby prop only if role is GROWER
		totalAcres: parseFloat(
			job.fields
				.reduce((sum, f) => sum + (f.actualAcres?.toNumber?.() || 0), 0)
				.toFixed(2),
		),
		farm: {
			...job.farm,
			totalAcres: parseFloat(
				fields
					.reduce(
						(sum, f) => sum + (f.acres ? f.acres.toNumber() : 0),
						0,
					)
					.toFixed(2),
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
		READY_TO_SPRAY: ['ASSIGNED_TO_PILOT', 'SPRAYED'], // A job in READY_TO_SPRAY can only move to ASSIGNED_TO_PILOT
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
		const applicatorWorker = await prisma.applicatorWorker.findUnique({
			where: {
				applicatorId_workerId: {
					applicatorId: user.id,
					workerId: fieldWorkerId,
				},
			},
			select: {
				autoAcceptJobs: true,
			},
		});
		await prisma.$transaction(async (tx) => {
			await tx.job.update({
				where: { id: jobId },
				data: {
					...data,
					status: applicatorWorker?.autoAcceptJobs
						? 'READY_TO_SPRAY'
						: 'ASSIGNED_TO_PILOT',
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
					newStatus: applicatorWorker?.autoAcceptJobs
						? 'READY_TO_SPRAY'
						: 'ASSIGNED_TO_PILOT',
					reason: null,
				},
			});
			await prisma.notification.create({
				data: {
					userId: fieldWorkerId, // Notify the appropriate user
					jobId: job.id,
					type: 'JOB_ASSIGNED',
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
					paidAt: requestedStatus === 'PAID' ? new Date() : undefined, // ✅ conditional update
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
					userId: notificationUserId,
					jobId: job.id,
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
			growerFirstName: true,
			growerLastName: true,
			grower: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
				},
			},
			autoAcceptJobsByApplicator: true,
		},
	}); // Fetch all growers

	const formatGrowers = growers.map((item) => ({
		...item.grower,
		growers: undefined,
		firstName: item.growerFirstName,
		lastName: item.growerLastName,
		fullName: `${item.growerFirstName} ${item.growerLastName}`,
		autoAcceptJobsByApplicator: item.autoAcceptJobsByApplicator,
	}));
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
					firstName: true,
					lastName: true,
					fullName: true,
					email: true,
				},
			},
			autoAcceptJobsByGrower: true,
		},
	}); // Fetch all applicators
	const formatApplicators = applicators.map((item) => ({
		...item.applicator,
		autoAcceptJobsByGrower: item.autoAcceptJobsByGrower,
	}));
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
					fieldImageUrl: true,
					config: true,
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
const getFarmListByApplicatorId = async (
	applicatorId: number,
	growerId: number,
) => {
	console.log(applicatorId, growerId, 'grower');
	const farms = await prisma.farm.findMany({
		where: {
			growerId,
			permissions: {
				some: {
					applicatorId: applicatorId,
					canView: true,
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
					fieldImageUrl: true,
					config: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	});
	return farms;
};

const uploadJobAttachments = async (
	userId: number,
	files: Express.Multer.File[],
): Promise<string[]> => {
	const uploader = getUploader();
	// Build upload objects
	const uploadObjects = files.map((file) => ({
		Key: `jobs/${userId}/${uuidv4()}_${file.originalname}`,
		Body: file.buffer,
		ContentType: file.mimetype,
	}));

	// Use the helper to upload all files
	const uploadedFiles = await uploader(uploadObjects);

	return uploadedFiles; // array of blob paths like `/containerName/jobs/...`
};
const getJobs = async (
	growerId: number,
	type: string,
	role: string,
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
	if (role !== 'GROWER') {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			'Access denied, only growers can view jobs',
		);
	}
	const filters: Prisma.JobWhereInput = {
		growerId,
		source: type === 'ALL' ? undefined : (type as JobSource),
	};
	// Apply dynamic label filtering
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;
		// Global search if label is "All"
		if (options.label === 'all') {
			const searchValue = options.searchValue?.toUpperCase();

			// Try to match enums first
			const isJobTypeMatch = Object.values(JobType).includes(
				searchValue as JobType,
			);
			const isJobSourceMatch = Object.values(JobSource).includes(
				searchValue as JobSource,
			);
			const isJobStatusMatch = Object.values(JobStatus).includes(
				searchValue as JobStatus,
			);

			if (isJobTypeMatch || isJobSourceMatch || isJobStatusMatch) {
				// Only filter on the first matched enum
				if (isJobTypeMatch) {
					filters.type = searchValue as JobType;
				} else if (isJobSourceMatch) {
					filters.source = searchValue as JobSource;
				} else if (isJobStatusMatch) {
					filters.status = searchValue as JobStatus;
				}
			} else {
				Object.assign(filters, {
					OR: [
						{
							title: {
								contains: options.searchValue,
								mode: 'insensitive',
							},
						},
						{
							farm: {
								name: {
									contains: options.searchValue,
									mode: 'insensitive',
								},
							},
						},
						{
							applicator: {
								fullName: {
									contains: options.searchValue,
									mode: 'insensitive',
								},
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'title':
					searchFilter.title = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as JobType, // Ensure type matches your Prisma enum
					};
					break;
				case 'source':
					searchFilter.source = {
						equals: searchValue.toUpperCase() as JobSource, // Ensure type matches your Prisma enum
					};
					break;
				case 'status':
					searchFilter.status =
						searchValue.toUpperCase() as Prisma.EnumJobStatusFilter;
					break;

				case 'farm':
					searchFilter.farm = {
						name: { contains: searchValue, mode: 'insensitive' },
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}

			Object.assign(filters, searchFilter); // Merge filters dynamically
		}
	}
	const jobs = await prisma.job.findMany({
		where: filters,
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
							config: true,
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
	// if (type === 'BIDDING') {
	// 	jobs = jobs.filter((job) => job.source === 'BIDDING');
	// } else if (type === 'GROWER') {
	// 	jobs = jobs.filter((job) => job.source === 'GROWER');
	// } else if (type === 'APPLICATOR') {
	// 	jobs = jobs.filter((job) => job.source === 'APPLICATOR');
	// }
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
			totalAcres: parseFloat(
				job.fields
					.reduce(
						(sum, f) => sum + (f.actualAcres?.toNumber?.() || 0),
						0,
					)
					.toFixed(2),
			),
		};
	});
	console.log(jobs.length, 'length');
	const totalResults = await prisma.job.count({
		where: filters,
	});

	// const totalResults = jobs.length;
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
		if (options.label === 'all') {
			const searchValue = options.searchValue?.toUpperCase();

			// Try to match enums first
			const isJobTypeMatch = Object.values(JobType).includes(
				searchValue as JobType,
			);
			const isJobSourceMatch = Object.values(JobSource).includes(
				searchValue as JobSource,
			);

			if (isJobTypeMatch || isJobSourceMatch) {
				// Only filter on the first matched enum
				if (isJobTypeMatch) {
					filters.type = searchValue as JobType;
				} else if (isJobSourceMatch) {
					filters.source = searchValue as JobSource;
				}
			} else {
				console.log('search');
				Object.assign(filters, {
					OR: [
						{
							title: {
								contains: options.searchValue,
								mode: 'insensitive',
							},
						},
						{
							farm: {
								OR: [
									{
										name: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										township: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										county: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										state: {
											name: {
												contains: options.searchValue,
												mode: 'insensitive',
											},
										},
									},
								],
							},
						},
						{
							grower: {
								fullName: {
									contains: options.searchValue,
									mode: 'insensitive',
								},
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'title':
					searchFilter.title = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as JobType, // Ensure type matches your Prisma enum
					};
					break;
				case 'source':
					searchFilter.source = {
						equals: searchValue.toUpperCase() as JobSource, // Ensure type matches your Prisma enum
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
				case 'township':
					searchFilter.farm = {
						township: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
							name: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					};
					break;

				case 'pilot':
					searchFilter.fieldWorker = {
						fullName: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
		totalAcres: parseFloat(
			job.fields
				.reduce((sum, f) => sum + (f.actualAcres?.toNumber?.() || 0), 0)
				.toFixed(2),
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
		const searchValue = options.searchValue;
		const searchFilter: Prisma.BidWhereInput = {};

		if (options.label === 'all') {
			const upperValue = searchValue.toUpperCase();

			const isJobTypeMatch = Object.values(JobType).includes(
				upperValue as JobType,
			);
			const isJobSourceMatch = Object.values(JobSource).includes(
				upperValue as JobSource,
			);

			if (isJobTypeMatch) {
				filters.job = {
					type: { equals: upperValue as JobType },
				};
			} else if (isJobSourceMatch) {
				filters.job = {
					source: { equals: upperValue as JobSource },
				};
			} else {
				Object.assign(filters, {
					OR: [
						{
							job: {
								title: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
						},
						{
							job: {
								farm: {
									OR: [
										{
											name: {
												contains: searchValue,
												mode: 'insensitive',
											},
										},
										{
											township: {
												contains: searchValue,
												mode: 'insensitive',
											},
										},
										{
											county: {
												contains: searchValue,
												mode: 'insensitive',
											},
										},
										{
											state: {
												name: {
													contains: searchValue,
													mode: 'insensitive',
												},
											},
										},
									],
								},
							},
						},
						{
							job: {
								grower: {
									fullName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
							},
						},
					],
				});
			}
		} else {
			// Label-specific filters
			switch (options.label) {
				case 'title':
					searchFilter.job = {
						title: { contains: searchValue, mode: 'insensitive' },
					};
					break;

				case 'type':
					searchFilter.job = {
						type: { equals: searchValue.toUpperCase() as JobType },
					};
					break;

				case 'source':
					searchFilter.job = {
						source: {
							equals: searchValue.toUpperCase() as JobSource,
						},
					};
					break;

				case 'growerName':
					searchFilter.job = {
						grower: {
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
						},
					};
					break;

				case 'township':
					searchFilter.job = {
						farm: {
							township: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					};
					break;

				case 'county':
					searchFilter.job = {
						farm: {
							county: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					};
					break;

				case 'state':
					searchFilter.job = {
						farm: {
							state: {
								name: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
						},
					};
					break;

				case 'pilot':
					searchFilter.job = {
						fieldWorker: {
							fullName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					};
					break;

				case 'startDate':
					searchFilter.job = {
						startDate: {
							gte: new Date(searchValue),
						},
					};
					break;

				case 'endDate':
					searchFilter.job = {
						endDate: {
							lte: new Date(searchValue),
						},
					};
					break;

				default:
					throw new Error('Invalid label provided.');
			}

			// Merge the dynamic searchFilter into the main filters object
			Object.assign(filters, searchFilter);
		}
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
		totalAcres: parseFloat(
			bid.job.fields
				.reduce((sum, f) => sum + (f.actualAcres?.toNumber?.() || 0), 0)
				.toFixed(2),
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
	const whereCondition: Prisma.JobWhereInput = {
		status: 'PENDING',
		// applicatorId?: number,
		// growerId?: number;
		// source?: 'GROWER' | 'APPLICATOR';
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
		if (options.label === 'all') {
			const searchValue = options.searchValue?.toUpperCase();

			// Try to match enums first
			const isJobTypeMatch = Object.values(JobType).includes(
				searchValue as JobType,
			);
			const isJobSourceMatch = Object.values(JobSource).includes(
				searchValue as JobSource,
			);

			if (isJobTypeMatch || isJobSourceMatch) {
				// Only filter on the first matched enum
				if (isJobTypeMatch) {
					whereCondition.type = searchValue as JobType;
				} else if (isJobSourceMatch) {
					whereCondition.source = searchValue as JobSource;
				}
			} else {
				console.log('search');
				Object.assign(whereCondition, {
					OR: [
						{
							title: {
								contains: options.searchValue,
								mode: 'insensitive',
							},
						},
						{
							farm: {
								OR: [
									{
										name: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										township: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										county: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										state: {
											name: {
												contains: options.searchValue,
												mode: 'insensitive',
											},
										},
									},
								],
							},
						},
						{
							grower: {
								fullName: {
									contains: options.searchValue,
									mode: 'insensitive',
								},
							},
						},
						{
							applicator: {
								fullName: {
									contains: options.searchValue,
									mode: 'insensitive',
								},
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'title':
					searchFilter.title = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as JobType, // Ensure type matches your Prisma enum
					};
					break;
				case 'source':
					searchFilter.source = {
						equals: searchValue.toUpperCase() as JobSource, // Ensure type matches your Prisma enum
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
				case 'applicatorName': //this is for grower portal
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

				case 'township':
					searchFilter.farm = {
						township: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
							name: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					};
					break;

				case 'pilot':
					searchFilter.fieldWorker = {
						fullName: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
			totalAcres: parseFloat(
				job.fields
					.reduce(
						(sum, f) => sum + (f.actualAcres?.toNumber?.() || 0),
						0,
					)
					.toFixed(2),
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
	const whereCondition: Prisma.JobWhereInput = {
		status: 'PENDING',
		// applicatorId?: number;
		// growerId?: number;
		// source?: 'GROWER' | 'APPLICATOR';
	};
	// = {
	// 	status: 'PENDING',
	// };
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
		if (options.label === 'all') {
			const searchValue = options.searchValue?.toUpperCase();

			// Try to match enums first
			const isJobTypeMatch = Object.values(JobType).includes(
				searchValue as JobType,
			);
			const isJobSourceMatch = Object.values(JobSource).includes(
				searchValue as JobSource,
			);

			if (isJobTypeMatch || isJobSourceMatch) {
				// Only filter on the first matched enum
				if (isJobTypeMatch) {
					whereCondition.type = searchValue as JobType;
				} else if (isJobSourceMatch) {
					whereCondition.source = searchValue as JobSource;
				}
			} else {
				console.log('search');
				Object.assign(whereCondition, {
					OR: [
						{
							title: {
								contains: options.searchValue,
								mode: 'insensitive',
							},
						},
						{
							farm: {
								OR: [
									{
										name: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										township: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										county: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										state: {
											name: {
												contains: options.searchValue,
												mode: 'insensitive',
											},
										},
									},
								],
							},
						},
						{
							grower: {
								fullName: {
									contains: options.searchValue,
									mode: 'insensitive',
								},
							},
						},
						{
							applicator: {
								fullName: {
									contains: options.searchValue,
									mode: 'insensitive',
								},
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'title':
					searchFilter.title = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as JobType, // Ensure type matches your Prisma enum
					};
					break;
				case 'source':
					searchFilter.source = {
						equals: searchValue.toUpperCase() as JobSource, // Ensure type matches your Prisma enum
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
				case 'applicatorName': //this is for grower portal
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

				case 'township':
					searchFilter.farm = {
						township: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
							name: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					};
					break;

				case 'pilot':
					searchFilter.fieldWorker = {
						fullName: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
			totalAcres: parseFloat(
				job.fields
					.reduce(
						(sum, f) => sum + (f.actualAcres?.toNumber?.() || 0),
						0,
					)
					.toFixed(2),
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
//                          config:true
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
					jobId: updatedJob.id,
					type:
						data.status === 'READY_TO_SPRAY'
							? 'JOB_ACCEPTED'
							: data.status === 'IN_PROGRESS'
								? 'PILOT_JOB_ACCEPTED'
								: role === 'WORKER'
									? 'PILOT_JOB_REJECTED'
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
				AND: {
					startDate: {
						gte: currentDate,
					},
				},
			};
		}
	}
	const allJobsApplications = await prisma.job.findMany({
		where: {
			applicatorId: userId,
			status: 'READY_TO_SPRAY',
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
							// config:true
						},
					},
				},
			},
		},
		orderBy: {
			startDate: 'asc',
		},
	});
	// Final response format
	const formattedJobs = allJobsApplications.map((job) => ({
		jobId: job.id,
		farmName: job.farm.name,
		startDate: job.startDate || new Date(),
		fields: job.fields.map((fieldJob) => ({
			acres: fieldJob.field.acres,
			name: fieldJob.field.name,
			crop: fieldJob.field.crop,
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

				if (role === 'APPLICATOR') {
					result = {
						pendingFromMe: {
							pendingJobsForMe,
							totalAcres:
								pendingJobForMetotalAcres._sum.actualAcres || 0,
							totalGrowers:
								pendingJobForMetotalGrowersorApplicator.length,
						},
						pendingFromGrower: {
							pendingJobsForGrower,
							totalAcres:
								pendingJobForGrowertotalAcres._sum
									.actualAcres || 0,
							totalGrowers:
								pendingJobForGrowertotalGrowersorApplicator.length,
						},
					};
				} else if (role === 'GROWER') {
					result = {
						pendingFromMe: {
							pendingJobsForMe,
							totalAcres:
								pendingJobForMetotalAcres._sum.actualAcres || 0,
							totalApplicators:
								pendingJobForMetotalGrowersorApplicator.length,
						},
						pendingFromApplicator: {
							pendingJobsForApplicator: pendingJobsForGrower,
							totalAcres:
								pendingJobForGrowertotalAcres._sum
									.actualAcres || 0,
							totalApplicators:
								pendingJobForGrowertotalGrowersorApplicator.length,
						},
					};
				}

				// result = {
				// 	pendingFromMe: {
				// 		pendingJobsForMe,
				// 		totalAcres:
				// 			pendingJobForMetotalAcres._sum.actualAcres || 0,
				// 		...(role === 'APPLICATOR'
				// 			? {
				// 				totalGrowers:
				// 					pendingJobForMetotalGrowersorApplicator.length,
				// 			}
				// 			: {
				// 				totalApplicators:
				// 					pendingJobForMetotalGrowersorApplicator.length,
				// 			}),
				// 	},
				// 	pendingFromGrower: {
				// 		pendingJobsForGrower,
				// 		totalAcres:
				// 			pendingJobForGrowertotalAcres._sum.actualAcres || 0,
				// 		...(role === 'APPLICATOR'
				// 			? {
				// 				totalGrowers:
				// 					pendingJobForGrowertotalGrowersorApplicator.length,
				// 			}
				// 			: {
				// 				totalApplicators:
				// 					pendingJobForGrowertotalGrowersorApplicator.length,
				// 			}),
				// 	},
				// };

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
const getHeadersDataForPilot = async (
	currentUser: User,
	options: { type: string; startDate: Date; endDate: Date },
) => {
	const { id, role } = currentUser;
	// if (role !== 'APPLICATOR' && role !== 'GROWER')
	// 	throw new Error('Unauthorized')

	let result;

	const endDateObj = options.endDate ? options.endDate : new Date();

	const startDate = options.startDate;
	const endDate = endDateObj;

	if (options.type) {
		switch (options.type) {
			case 'dashboard': {
				const dashboardfilters: Prisma.JobWhereInput = {
					fieldWorkerId: id,
					status: {
						in: ['SPRAYED', 'INVOICED', 'PAID'],
					},
					...(options.startDate
						? { startDate: { gte: startDate, lte: endDate } }
						: {}),
				};
				const jobsCompleted = await prisma.job.count({
					where: dashboardfilters,
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
					totalRevenue:
						(dashboardtotalApplicationFees._sum.rateUoM?.toNumber() ||
							0) +
						(dashboardtotalProPrice._sum.price?.toNumber() || 0),

					jobsCompleted,
					totalAcres: dashboardtotalAcres._sum.actualAcres || 0,
				};

				break;
			}
			case 'myJobs': {
				const myJobsfilters: Prisma.JobWhereInput = {
					fieldWorkerId: id,
					status: {
						in: ['IN_PROGRESS', 'SPRAYED', 'INVOICED', 'PAID'],
					},
					...(options.startDate
						? { startDate: { gte: startDate, lte: endDate } }
						: {}),
				};
				const totalJobs = await prisma.job.count({
					where: myJobsfilters,
				});
				const myJobsTotalAcres = await prisma.fieldJob.aggregate({
					where: { job: myJobsfilters },
					_sum: { actualAcres: true },
				});
				result = {
					totalJobs,
					totalAcres: myJobsTotalAcres._sum.actualAcres || 0,
				};

				break;
			}
			case 'pendingJobApprovals': {
				const whereConditionForMe: {
					status: 'ASSIGNED_TO_PILOT';
					fieldWorkerId?: number;
					source?: 'GROWER' | 'APPLICATOR';
				} = { status: 'ASSIGNED_TO_PILOT' };
				if (role === 'WORKER') {
					whereConditionForMe.fieldWorkerId = id;
				}
				const pendingJobsForMe = await prisma.job.count({
					where: {
						...whereConditionForMe,
						...(options.startDate
							? { updatedAt: { gte: startDate, lte: endDate } }
							: {}),
					},
				});
				const pendingJobForMetotalAcres =
					await prisma.fieldJob.aggregate({
						where: {
							job: {
								...whereConditionForMe,
								...(options.startDate
									? {
										updatedAt: {
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
const getRejectedJobs = async (
	user: User,
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
	const { role } = user;
	const filters: Prisma.JobWhereInput = {
		applicatorId: user.id,
		status: 'REJECTED',
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			const searchValue = options.searchValue?.toUpperCase();
			// Try to match enums first
			const isJobTypeMatch = Object.values(JobType).includes(
				searchValue as JobType,
			);
			const isJobSourceMatch = Object.values(JobSource).includes(
				searchValue as JobSource,
			);

			if (isJobTypeMatch || isJobSourceMatch) {
				// Only filter on the first matched enum
				if (isJobTypeMatch) {
					filters.type = searchValue as JobType;
				} else if (isJobSourceMatch) {
					filters.source = searchValue as JobSource;
				}
			} else {
				Object.assign(filters, {
					OR: [
						{
							title: {
								contains: options.searchValue,
								mode: 'insensitive',
							},
						},
						{
							id: !isNaN(Number(searchValue))
								? parseInt(searchValue, 10)
								: undefined,
						},
						{
							farm: {
								OR: [
									{
										name: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										township: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										county: {
											contains: options.searchValue,
											mode: 'insensitive',
										},
									},
									{
										state: {
											name: {
												contains: options.searchValue,
												mode: 'insensitive',
											},
										},
									},
								],
							},
						},
						{
							grower: {
								OR: [
									{
										id: !isNaN(Number(searchValue))
											? parseInt(searchValue, 10)
											: undefined,
									},
									{
										fullName: {
											contains: options.searchValue,
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
				case 'title':
					searchFilter.title = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as JobType, // Ensure type matches your Prisma enum
					};
					break;
				case 'source':
					searchFilter.source = {
						equals: searchValue.toUpperCase() as JobSource, // Ensure type matches your Prisma enum
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
				case 'township':
					searchFilter.farm = {
						township: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
							name: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
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
	}
	if (user.role === 'APPLICATOR') {
		const jobs = await prisma.job.findMany({
			where: filters,
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
				totalAcres: parseFloat(
					job.fields
						.reduce(
							(sum, f) =>
								sum + (f.actualAcres?.toNumber?.() || 0),
							0,
						)
						.toFixed(2),
				),
			};
		});
		// Calculate the total number of pages based on the total results and limit
		const totalResults = await prisma.job.count({
			where: filters,
			//  {
			// 	applicatorId: user.id,
			// 	status: 'REJECTED',
			// 	// source: 'APPLICATOR',
			// },
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
				totalAcres: parseFloat(
					job.fields
						.reduce(
							(sum, f) =>
								sum + (f.actualAcres?.toNumber?.() || 0),
							0,
						)
						.toFixed(2),
				),
			};
		});
		// Calculate the total number of pages based on the total results and limit
		const totalResults = await prisma.job.count({
			where: filters,
			// {
			// 	growerId: user.id,
			// 	status: 'REJECTED',
			// 	//   source: 'GROWER'
			// },
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
							config: true,
							fieldImageUrl: true,
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
			totalAcres: parseFloat(
				job.fields
					.reduce(
						(sum, f) => sum + (f.actualAcres?.toNumber?.() || 0),
						0,
					)
					.toFixed(2),
			),
			farm: {
				...job.farm,
				totalAcres: parseFloat(
					fields
						.reduce(
							(sum, f) =>
								sum + (f.acres ? f.acres.toNumber() : 0),
							0,
						)
						.toFixed(2),
				),
			},
			products: formattedProducts,
			applicationFees: formattedApplicationFees,
			bidDescription: Bid[0]?.description,
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
		// status: { in: ['INVOICED', 'PAID'] as JobStatus[] },
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
			totalAcres: parseFloat(
				fields
					.reduce(
						(sum, f) => sum + (f.acres ? f.acres.toNumber() : 0),
						0,
					)
					.toFixed(2),
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
const getAllJobInvoices = async (
	user: User,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
) => {
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
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;

		if (options.label === 'all') {
			const upperValue = searchValue.toUpperCase();

			const isJobSourceMatch = Object.values(JobSource).includes(
				upperValue as JobSource,
			);
			const isJobStatuseMatch = Object.values(JobStatus).includes(
				upperValue as JobStatus,
			);

			if (isJobSourceMatch || isJobStatuseMatch) {
				if (isJobSourceMatch) {
					whereCondition.source = {
						equals: upperValue as JobSource,
					};
				} else if (isJobStatuseMatch) {
					whereCondition.status = {
						equals: upperValue as JobStatus,
					};
				}
			} else {
				Object.assign(whereCondition, {
					OR: [
						{
							Invoice: {
								id: parseInt(searchValue, 10),
							},
						},
						{
							Invoice: {
								totalAmount: parseInt(searchValue, 10),
							},
						},
						{
							title: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							grower: {
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
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'invoiceId':
					searchFilter.Invoice = {
						id: parseInt(searchValue, 10),
					};
					break;
				case 'invoiceDate':
					searchFilter.Invoice = {
						issuedAt: { gte: new Date(searchValue) },
					};
					break;
				case 'billTo':
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
				case 'amount':
					searchFilter.Invoice = {
						totalAmount: parseInt(searchValue, 10),
					};
					break;
				case 'source':
					searchFilter.source = {
						equals: searchValue.toUpperCase() as JobSource, // Ensure type matches your Prisma enum
					};
					break;
				case 'status':
					searchFilter.status =
						searchValue.toUpperCase() as Prisma.EnumJobStatusFilter;
					break;
				default:
					throw new Error('Invalid label provided.');
			}
			Object.assign(whereCondition, searchFilter); // Merge filters dynamically
		}
	}
	console.log(
		options.label,
		options.searchValue,
		whereCondition,
		'condition',
	);
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
					growers:
						role === 'APPLICATOR'
							? {
								where: {
									applicatorId: id,
								},
								select: {
									growerFirstName: true,
									growerLastName: true,
								},
							}
							: undefined,
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
		const applicatorGrower = job.grower?.growers?.[0];
		const growerFirstName = applicatorGrower?.growerFirstName || '';
		const growerLastName = applicatorGrower?.growerLastName || '';
		return {
			invoiceId: Invoice ? Invoice.id : null,
			invoiceDate: Invoice ? Invoice.issuedAt : null,
			amount: Invoice ? Invoice.totalAmount : null,
			...jobData,
			grower: {
				...job.grower,
				growers: undefined,
				firstName:
					role === 'APPLICATOR'
						? growerFirstName
						: job.grower?.firstName,
				lastName:
					role === 'APPLICATOR'
						? growerLastName
						: job.grower?.lastName,
				fullName:
					role === 'APPLICATOR'
						? `${growerFirstName} ${growerLastName}`
						: job.grower?.fullName,
			},
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
	token: string,
	data: { status: 'ACCEPT' | 'REJECT'; rejectionReason: string },
) => {
	const { status, rejectionReason } = data;
	const whereCondition: {
		token: string;
		status: JobStatus;
	} = { token: token, status: 'PENDING' };

	if (status === 'ACCEPT') {
		await prisma.$transaction(async (tx) => {
			const job = await tx.job.update({
				where: {
					token: token,
				},
				data: {
					status: 'READY_TO_SPRAY',
				},
				select: {
					id: true,
					applicatorId: true,
					growerId: true,
					source: true,
				},
			});
			if (!job) {
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					'Invalid data or request has already been accepted or rejected.',
				);
			}
			if (job.growerId) {
				await tx.jobActivity.create({
					data: {
						jobId: job.id,
						changedById: job.growerId, //Connect to an existing user
						changedByRole: 'GROWER',
						oldStatus: whereCondition.status,
						newStatus: 'READY_TO_SPRAY',
					},
				});
			}
			await tx.job.update({
				where: { id: job.id },
				data: { token: null, tokenExpiresAt: null },
			});
		});
		return {
			message: 'Job accepted successfully.',
		};
	}
	if (status === 'REJECT') {
		await prisma.$transaction(async (tx) => {
			const job = await tx.job.update({
				where: {
					token: token,
				},
				data: {
					status: 'REJECTED',
				},
				select: {
					id: true,
					applicatorId: true,
					growerId: true,
					source: true,
				},
			});
			if (!job) {
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					'Invalid data or request has already been accepted or rejected.',
				);
			}

			if (job.growerId) {
				await tx.jobActivity.create({
					data: {
						jobId: job.id,
						changedById: job.growerId, //Connect to an existing user
						changedByRole: 'GROWER',
						oldStatus: whereCondition.status,
						newStatus: 'REJECTED',
						reason: rejectionReason,
					},
				});
			}
			await tx.job.update({
				where: { id: job.id },
				data: { token: null, tokenExpiresAt: null },
			});
		});

		return {
			message: 'Job rejected successfully.',
		};
	}
};
const getMyJobsByPilot = async (
	// applicatorId: number,
	pilotId: number,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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

	const filters: Prisma.JobWhereInput = {
		fieldWorkerId: pilotId,
		NOT: {
			status: 'ASSIGNED_TO_PILOT',
		},
	};
	// Apply dynamic label filtering
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			const upperValue = options.searchValue?.toUpperCase();

			// Try to match enums first
			const isJobTypeMatch = Object.values(JobType).includes(
				upperValue as JobType,
			);
			const isJobSourceMatch = Object.values(JobSource).includes(
				upperValue as JobSource,
			);
			const isJobStatusMatch = Object.values(JobStatus).includes(
				upperValue as JobStatus,
			);

			if (isJobTypeMatch || isJobSourceMatch || isJobStatusMatch) {
				// Only filter on the first matched enum
				if (isJobTypeMatch) {
					filters.type = upperValue as JobType;
				} else if (isJobSourceMatch) {
					filters.source = upperValue as JobSource;
				} else if (isJobStatusMatch) {
					filters.status = upperValue as JobStatus;
				}
			} else {
				Object.assign(filters, {
					OR: [
						{
							title: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							fieldWorker: {
								fullName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
						},
						{
							farm: {
								OR: [
									{
										name: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										township: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										county: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										state: {
											name: {
												contains: searchValue,
												mode: 'insensitive',
											},
										},
									},
								],
							},
						},
						{
							applicator: {
								fullName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'title':
					searchFilter.title = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as JobType, // Ensure type matches your Prisma enum
					};
					break;
				case 'source':
					searchFilter.source = {
						equals: searchValue.toUpperCase() as JobSource, // Ensure type matches your Prisma enum
					};
					break;

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
				case 'status':
					searchFilter.status =
						searchValue.toUpperCase() as Prisma.EnumJobStatusFilter;
					break;
				case 'township':
					searchFilter.farm = {
						township: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
							name: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					};
					break;

				case 'pilot':
					searchFilter.fieldWorker = {
						fullName: {
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
	const jobs = await prisma.job.findMany({
		where: filters,
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
							config: true,
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
		where: filters,
		// {
		// 	fieldWorkerId: pilotId,
		// 	NOT: {
		// 		status: 'ASSIGNED_TO_PILOT',
		// 	},
		// },
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
		totalAcres: parseFloat(
			job.fields
				.reduce((sum, f) => sum + (f.actualAcres?.toNumber?.() || 0), 0)
				.toFixed(2),
		),
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
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.JobWhereInput = {
		fieldWorkerId: pilotId,
		status: 'ASSIGNED_TO_PILOT',
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			const upperValue = options.searchValue?.toUpperCase();

			// Try to match enums first
			const isJobTypeMatch = Object.values(JobType).includes(
				upperValue as JobType,
			);
			const isJobSourceMatch = Object.values(JobSource).includes(
				upperValue as JobSource,
			);

			if (isJobTypeMatch || isJobSourceMatch) {
				// Only filter on the first matched enum
				if (isJobTypeMatch) {
					filters.type = upperValue as JobType;
				} else if (isJobSourceMatch) {
					filters.source = upperValue as JobSource;
				} else {
					Object.assign(filters, {
						OR: [
							{
								title: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
							{
								fieldWorker: {
									fullName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
							},
							{
								farm: {
									OR: [
										{
											name: {
												contains: searchValue,
												mode: 'insensitive',
											},
										},
										{
											township: {
												contains: searchValue,
												mode: 'insensitive',
											},
										},
										{
											county: {
												contains: searchValue,
												mode: 'insensitive',
											},
										},
										{
											state: {
												name: {
													contains: searchValue,
													mode: 'insensitive',
												},
											},
										},
									],
								},
							},
							{
								applicator: {
									fullName: {
										contains: searchValue,
										mode: 'insensitive',
									},
								},
							},
						],
					});
				}
			}
		} else {
			switch (options.label) {
				case 'title':
					searchFilter.title = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as JobType, // Ensure type matches your Prisma enum
					};
					break;
				case 'source':
					searchFilter.source = {
						equals: searchValue.toUpperCase() as JobSource, // Ensure type matches your Prisma enum
					};
					break;

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
				case 'township':
					searchFilter.farm = {
						township: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
							name: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					};
					break;

				case 'pilot':
					searchFilter.fieldWorker = {
						fullName: {
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
	const jobs = await prisma.job.findMany({
		where: filters,
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
							config: true,
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
		status: 'PENDING',
		totalAcres: parseFloat(
			job.fields
				.reduce((sum, f) => sum + (f.actualAcres?.toNumber?.() || 0), 0)
				.toFixed(2),
		), // Sum actualAcres, default to 0 if null
	}));
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
const getPilotRejectedJobs = async (
	// applicatorId: number,
	pilotId: number,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
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
	const filters: Prisma.JobWhereInput = {
		fieldWorkerId: pilotId,
		status: 'PILOT_REJECTED',
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			const upperValue = options.searchValue?.toUpperCase();

			// Try to match enums first
			const isJobTypeMatch = Object.values(JobType).includes(
				upperValue as JobType,
			);
			const isJobSourceMatch = Object.values(JobSource).includes(
				upperValue as JobSource,
			);

			if (isJobTypeMatch || isJobSourceMatch) {
				// Only filter on the first matched enum
				if (isJobTypeMatch) {
					filters.type = upperValue as JobType;
				} else if (isJobSourceMatch) {
					filters.source = upperValue as JobSource;
				}
			} else {
				Object.assign(filters, {
					OR: [
						{
							title: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							fieldWorker: {
								fullName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
						},
						{
							farm: {
								OR: [
									{
										name: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										township: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										county: {
											contains: searchValue,
											mode: 'insensitive',
										},
									},
									{
										state: {
											name: {
												contains: searchValue,
												mode: 'insensitive',
											},
										},
									},
								],
							},
						},
						{
							applicator: {
								fullName: {
									contains: searchValue,
									mode: 'insensitive',
								},
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'title':
					searchFilter.title = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as JobType, // Ensure type matches your Prisma enum
					};
					break;
				case 'source':
					searchFilter.source = {
						equals: searchValue.toUpperCase() as JobSource, // Ensure type matches your Prisma enum
					};
					break;

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
				case 'township':
					searchFilter.farm = {
						township: {
							contains: searchValue,
							mode: 'insensitive',
						},
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
							name: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}
			Object.assign(filters, searchFilter); // Merge filters dynamically
		}
	}
	console.log(filters, 'filters');
	const jobs = await prisma.job.findMany({
		// where: {
		// 	jobActivities: {
		// 		some: {
		// 			changedById: pilotId,
		// 			newStatus: 'PILOT_REJECTED',
		// 		},
		// 		none: {
		// 			changedById: pilotId,
		// 			newStatus: {
		// 				in: ['IN_PROGRESS', 'SPRAYED'],
		// 			}, // Exclude accepted reassigned jobs
		// 		},
		// 	},
		// },
		where: filters,
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
							config: true,
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
		status: 'REJECTED',
		totalAcres: parseFloat(
			job.fields
				.reduce((sum, f) => sum + (f.actualAcres?.toNumber?.() || 0), 0)
				.toFixed(2),
		), // Sum actualAcres, default to 0 if null
	}));

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
const getJobByIdForPilot = async (
	jobId: number,
	pilotId: number,
	// options: PaginateOptions,
) => {
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
							config: true,
							fieldImageUrl: true,
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
			DroneFlightLog: {
				select: {
					id: true,
					droneId: true,
					startTime: true,
					endTime: true,
					mapImageUrl: true,
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
		totalAcres: parseFloat(
			job.fields
				.reduce((sum, f) => sum + (f.actualAcres?.toNumber?.() || 0), 0)
				.toFixed(2),
		), // Sum actualAcres, default to 0 if null
		farm: {
			...job.farm,
			totalAcres: parseFloat(
				fields
					.reduce(
						(sum, f) => sum + (f.acres ? f.acres.toNumber() : 0),
						0,
					)
					.toFixed(2),
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
		DroneFlightLog: job.DroneFlightLog,
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
				bidId: newBid.id,
				type: 'BID_PLACED',
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
const getJobBytokenThroughEmail = async (token: string) => {
	const job = await prisma.job.findUnique({
		where: {
			token,
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
							config: true,
							fieldImageUrl: true,
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
		totalAcres: parseFloat(
			job.fields
				.reduce((sum, f) => sum + (f.actualAcres?.toNumber?.() || 0), 0)
				.toFixed(2),
		),
		farm: {
			...job.farm,
			totalAcres: parseFloat(
				fields
					.reduce(
						(sum, f) => sum + (f.acres ? f.acres.toNumber() : 0),
						0,
					)
					.toFixed(2),
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
const getMonthlyAcresSprayed = async (user: User, year: number) => {
	const { id: userId, role } = user;

	// Role-based filter
	const filter =
		role === 'APPLICATOR'
			? { applicatorId: userId }
			: role === 'WORKER'
				? { fieldWorkerId: userId }
				: role === 'GROWER'
					? { growerId: userId }
					: {};

	const jobs = await prisma.job.findMany({
		where: {
			...filter,
			status: {
				in: ['SPRAYED', 'INVOICED', 'PAID'], // only jobs that were completed
			},
			startDate: {
				gte: new Date(`${year}-01-01`),
				lte: new Date(`${year}-12-31`),
			},
		},
		select: {
			startDate: true,
			fields: {
				select: {
					actualAcres: true,
				},
			},
		},
	});

	// Initialize monthly buckets
	const monthLabels = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec',
	];
	const acresByMonth: Record<string, number> = Object.fromEntries(
		monthLabels.map((label) => [label, 0]),
	);

	for (const job of jobs) {
		const monthIndex = job?.startDate?.getMonth();

		if (
			typeof monthIndex === 'number' &&
			monthIndex >= 0 &&
			monthIndex <= 11
		) {
			const label = monthLabels[monthIndex];

			const totalAcresForJob = job.fields.reduce((sum, field) => {
				return sum + Number(field.actualAcres ?? 0);
			}, 0);

			acresByMonth[label] = parseFloat(
				(acresByMonth[label] + totalAcresForJob).toFixed(2),
			);
		}
	}

	return {
		data: monthLabels.map((month) => ({
			month,
			acres: acresByMonth[month],
		})),
		maxY: calculateMaxY(Object.values(acresByMonth)),
		yAxisInterval: calculateInterval(Object.values(acresByMonth)),
	};
};

const getFinancialSummary = async (user: User, range: string) => {
	const { id: userId, role } = user;

	const now = new Date();
	now.setHours(0, 0, 0, 0); // Normalize to start of today

	const daysBack = range === '7d' ? 7 : 30;

	const currentPeriodStart = new Date(now);
	currentPeriodStart.setDate(now.getDate() - daysBack);

	const previousPeriodStart = new Date(currentPeriodStart);
	previousPeriodStart.setDate(previousPeriodStart.getDate() - daysBack);

	// Role-based filter
	const filter =
		role === 'APPLICATOR'
			? { applicatorId: userId }
			: role === 'WORKER'
				? { fieldWorkerId: userId }
				: role === 'GROWER'
					? { growerId: userId }
					: {};

	// Fetch current period jobs
	const currentJobs = await prisma.job.findMany({
		where: {
			...filter,
			paidAt: { gte: currentPeriodStart, lt: now },
			status: 'PAID',
		},
		select: {
			paidAt: true,
			Invoice: {
				select: { totalAmount: true },
			},
		},
	});

	// Fetch previous period jobs
	const previousJobs = await prisma.job.findMany({
		where: {
			...filter,
			paidAt: { gte: previousPeriodStart, lt: currentPeriodStart },
			status: 'PAID',
		},
		select: {
			Invoice: {
				select: { totalAmount: true },
			},
		},
	});

	// Initialize date map
	const amountByDate: Record<string, number> = {};
	for (let i = 0; i < daysBack; i++) {
		const date = new Date(currentPeriodStart);
		date.setDate(date.getDate() + i);
		const label = date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		}); // e.g. Apr 30
		amountByDate[label] = 0;
	}

	let totalCurrent = 0;
	for (const job of currentJobs) {
		const label = job.paidAt?.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
		const amount = job.Invoice?.totalAmount ?? 0;

		if (label && label in amountByDate) {
			amountByDate[label] += Number(amount);
			totalCurrent += Number(amount);
		}
	}

	const totalPrevious = previousJobs.reduce(
		(sum, job) => sum + Number(job.Invoice?.totalAmount ?? 0),
		0,
	);

	// Calculate growth
	let growth = 0;
	if (totalPrevious > 0) {
		growth = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
	}

	// Prepare result
	const data = Object.entries(amountByDate).map(([day, amount]) => ({
		day,
		amount,
	}));

	return {
		label: role === 'GROWER' ? 'Expenditure' : 'Revenue',
		growth: parseFloat(growth.toFixed(2)),
		data,
	};
};

const getCalendarApplications = async (user: User, month?: string) => {
	const { id: userId, role } = user;
	if (role !== 'APPLICATOR' && role !== 'WORKER') {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'You are not authorized to access this resource.',
		);
	}
	const now = new Date(); // 🕐 Current time
	// 1. Calculate date range for selected month
	const startDate = new Date(`${month}-01`);
	const endDate = new Date(startDate);
	endDate.setMonth(endDate.getMonth() + 1); // Move to the 1st of next month

	// Determine the ID filter based on role
	const roleFilter =
		role === 'APPLICATOR'
			? { applicatorId: userId }
			: role === 'WORKER'
				? { fieldWorkerId: userId }
				: {};

	// 2. Fetch only upcoming jobs for this month
	const jobs = await prisma.job.findMany({
		where: {
			...roleFilter,
			status: 'READY_TO_SPRAY',
			startDate: {
				gte: startDate,
				lt: endDate,
			},
			AND: {
				startDate: {
					gte: now,
				},
			},
		},
		orderBy: {
			startDate: 'asc',
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

	// 3. Group Jobs by Date
	const grouped: Record<string, any[]> = {};

	jobs.forEach((job) => {
		if (!job.startDate) return;

		const dateKey = job.startDate.toISOString().split('T')[0];

		if (!grouped[dateKey]) {
			grouped[dateKey] = [];
		}

		const fields = job.fields.map((f) => ({
			fieldName: f.field?.name || '',
			crop: f.field?.crop || 'unknown',
			acres: f.field?.acres?.toNumber?.() || Number(f.field?.acres) || 0,
		}));

		grouped[dateKey].push({
			id: job.id,
			farmName: job.farm?.name || '',
			fields,
		});
	});

	// 4. Prepare the grouped jobs response (with per-date summary)
	const upcomingApplications = Object.entries(grouped).map(([date, jobs]) => {
		// Build crop summary for this date
		const cropSummary: Record<string, { totalAcres: number }> = {};

		jobs.forEach((job) => {
			job.fields.forEach((field: any) => {
				const crop = field.crop || 'unknown';
				const acres = field.acres || 0;

				if (!cropSummary[crop]) {
					cropSummary[crop] = {
						totalAcres: 0,
					};
				}
				cropSummary[crop].totalAcres += acres;
			});
		});

		// Format and sort the summary
		const cropsSummary = Object.entries(cropSummary)
			.map(([crop, data]) => ({
				crop,
				totalAcres: parseFloat(data.totalAcres.toFixed(2)),
			}))
			.sort((a, b) => b.totalAcres - a.totalAcres);

		return {
			date,
			numberOfJobs: jobs.length,
			jobs,
			summary: cropsSummary, // 🆕 Added per date
		};
	});

	// 5. Final return
	return upcomingApplications; // 🔥 Each day now has its own summary
};
const getApplicationsByRange = async (
	user: User,
	startDate?: string,
	endDate?: string,
) => {
	const { id: userId, role } = user;
	if (role !== 'APPLICATOR' && role !== 'WORKER') {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'You are not authorized to access this resource.',
		);
	}
	if (!startDate || !endDate) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'startDate and endDate are required',
		);
	}

	// Determine the ID filter based on role
	const roleFilter =
		role === 'APPLICATOR'
			? { applicatorId: userId }
			: role === 'WORKER'
				? { fieldWorkerId: userId }
				: {};
	const start = new Date(startDate);
	const end = new Date(endDate);

	if (start > end) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			'startDate must be before or equal to endDate',
		);
	}

	const jobs = await prisma.job.findMany({
		where: {
			...roleFilter,
			status: 'READY_TO_SPRAY',
			startDate: {
				gte: start,
				lte: end,
			},
		},
		orderBy: {
			startDate: 'asc',
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

	// Group jobs by startDate
	const grouped: Record<string, any[]> = {};

	jobs.forEach((job) => {
		if (!job.startDate) return;

		const dateKey = job.startDate.toISOString().split('T')[0];

		if (!grouped[dateKey]) {
			grouped[dateKey] = [];
		}

		const fields = job.fields.map((f) => ({
			fieldName: f.field?.name || '',
			crop: f.field?.crop || 'unknown',
			acres: Number(f.field?.acres) || 0,
		}));

		grouped[dateKey].push({
			id: job.id,
			farmName: job.farm?.name || '',
			fields,
		});
	});

	// Build final response array
	const applications = Object.entries(grouped).map(([date, jobs]) => {
		return {
			date,
			numberOfJobs: jobs.length,
			jobs,
		};
	});

	return applications.sort((a, b) => a.date.localeCompare(b.date));
};
const uploadFlightLog = async (
	userId: number,
	jobId: number,
	file: Express.Multer.File,
) => {
	// // Step 1: Convert KML → GeoJSON
	// const geojson = await convertKmlToGeoJson(file.buffer);
	// // Step 2: Generate flight map image
	// const imageBuffer = await generateMapImage(geojson);
	// // const imageBuffer = await generateMapImage();
	// // Step 3: Upload image to Azure Blob
	// const blobPath = `flight-maps/${jobId}_${Date.now()}.png`;
	// const mapImageUrl = await uploadToAzureBlob(imageBuffer, blobPath);
	// // Step 4: Create record in DB
	// const flightLog = await prisma.droneFlightLog.create({
	// 	data: {
	// 		jobId,
	// 		uploadedById: userId,
	// 		geojsonData: geojson,
	// 		mapImageUrl,
	// 		startTime: new Date(), // optionally parse from GeoJSON if available
	// 		endTime: new Date(),
	// 	},
	// });
	// return {
	// 	message: 'Flight log uploaded successfully',
	// 	flightLog,
	// };
};

const getFaaReports = async (
	user: User,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
) => {
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
		status: { in: ['SPRAYED', 'INVOICED', 'PAID'] as JobStatus[] },
	};

	if (role === 'APPLICATOR') {
		whereCondition.applicatorId = id;
	} else if (role === 'GROWER') {
		whereCondition.growerId = id;
	}
	// Apply dynamic label filtering
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.JobWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			const upperValue = options.searchValue?.toUpperCase();
			// Try to match enums first
			const isJobTypeMatch = Object.values(JobType).includes(
				upperValue as JobType,
			);
			const isJobStatusMatch = Object.values(JobStatus).includes(
				upperValue as JobStatus,
			);
			// Only filter on the first matched enum
			if (isJobTypeMatch) {
				Object.assign(whereCondition, {
					type: { equals: upperValue as JobType },
				});
			} else if (isJobStatusMatch) {
				if (
					upperValue === 'SPRAYED' ||
					upperValue === 'INVOICED' ||
					upperValue === 'PAID'
				) {
					Object.assign(whereCondition, {
						status: { equals: upperValue as JobStatus },
					});
				}
			} else {
				Object.assign(whereCondition, {
					OR: [
						{
							id: !isNaN(Number(searchValue))
								? parseInt(searchValue, 10)
								: undefined,
						},
						{
							title: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'title':
					searchFilter.title = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'type':
					searchFilter.type = {
						equals: searchValue.toUpperCase() as JobType, // Ensure type matches your Prisma enum
					};
					break;
				case 'status':
					searchFilter.status = {
						equals: searchValue.toUpperCase() as JobStatus, // Ensure type matches your Prisma enum
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}

			Object.assign(whereCondition, searchFilter); // Merge filters dynamically
		}
	}
	console.log(whereCondition, 'whereCondition');
	const jobInvoices = await prisma.job.findMany({
		where: whereCondition,
		select: {
			id: true,
			title: true,
			type: true,
			source: true,
			status: true,
			DroneFlightLog: {
				omit: {
					id: true,
					jobId: true,
					geojsonData: true,
					uploadedById: true,
				},
			},
			applicator: {
				select: {
					email: true,
					businessName: true,
				},
			},
			fieldWorker: {
				select: {
					fullName: true,
					email: true,
				},
			},
			// grower: {
			// 	select: {
			// 		firstName: true,
			// 		lastName: true,
			// 		fullName: true,
			// 	},
			// },
			// Invoice: {
			// 	select: {
			// 		id: true,
			// 		totalAmount: true,
			// 		issuedAt: true,
			// 		paidAt: true,
			// 	},
			// },
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});

	const flattened = jobInvoices.map((job) => {
		const { ...jobData } = job;
		return {
			// invoiceId: Invoice ? Invoice.id : null,
			// invoiceDate: Invoice ? Invoice.issuedAt : null,
			// amount: Invoice ? Invoice.totalAmount : null,
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

const uploadFlightLogImage = async (
	user: User,
	jobId: number,
	fileBuffer: Buffer,
): Promise<{ imageUrl: string }> => {
	const { id: userId, role } = user;
	const uploader = getUploader();
	const whereCondition: any = { id: jobId };
	if (role === 'APPLICATOR') {
		whereCondition.applicatorId = userId;
	} else if (role === 'GROWER') {
		whereCondition.growerId = userId;
	}

	const job = await prisma.job.findFirst({
		where: whereCondition,
		select: { id: true },
	});

	if (!job) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			"Job not found or you don't have permission to upload a flight log image for this job.",
		);
	}

	const blobKey = `flight-maps/${jobId}_${Date.now()}.webp`;
	const uploadObjects = [
		{
			Key: blobKey,
			Body: fileBuffer,
			ContentType: 'image/webp',
		},
	];

	const res = await uploader(uploadObjects);

	return {
		imageUrl: res[0],
	};
};
const createFlighLog = async (
	user: User,
	jobId: number,
	data: DroneFlightLog,
) => {
	const { id: userId, role } = user;
	const { droneId, startTime, endTime, mapImageUrl, geojsonData } = data;

	const whereCondition: any = { id: jobId };

	if (role === 'APPLICATOR') {
		whereCondition.applicatorId = userId;
	} else if (role === 'GROWER') {
		whereCondition.growerId = userId;
	}

	const job = await prisma.job.findFirst({
		where: whereCondition,
		select: { id: true },
	});

	if (!job) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			"Job not found or you don't have permission to upload a flight log image for this job.",
		);
	}

	// Step 4: Create record in DB
	const flightLog = await prisma.droneFlightLog.create({
		data: {
			jobId,
			droneId,
			uploadedById: userId,
			mapImageUrl,
			startTime: startTime ? new Date(Number(startTime) * 1000) : null, // Convert seconds to milliseconds
			endTime: endTime ? new Date(Number(endTime) * 1000) : null,
			geojsonData: geojsonData as Prisma.InputJsonValue,
		},
	});

	return {
		message: 'Flight log uploaded successfully',
		flightLog,
	};
};
const getFlighLogById = async (user: User, logId: number) => {
	// const { id: userId, role } = user;

	const flightLog = await prisma.droneFlightLog.findUnique({
		where: {
			id: logId,
		},
	});
	return flightLog;
};
const getSearchProduct = async (
	user: User,
	options: PaginateOptions & {
		search?: string;
	},
) => {
	const applicatorId = user.id;

	const limit =
		options.limit && parseInt(options.limit, 10) > 0
			? parseInt(options.limit, 10)
			: 10;
	const page =
		options.page && parseInt(options.page, 10) > 0
			? parseInt(options.page, 10)
			: 1;
	const skip = (page - 1) * limit;

	const query = options.search?.trim().toLowerCase() || '';
	const hasMinSearch = query.length >= 3;

	// Fetch paginated data
	const [products, chemicals, productCount, chemicalCount] =
		await Promise.all([
			prisma.product.findMany({
				where: {
					createdById: applicatorId,
					...(query && {
						productName: { contains: query, mode: 'insensitive' },
					}),
				},
				skip,
				take: limit,
			}),
			hasMinSearch
				? prisma.chemical.findMany({
					where: hasMinSearch
						? {
							deletedAt: null,
							productName: {
								contains: query,
								mode: 'insensitive',
							},
						}
						: undefined,
					skip,
					take: limit,
				})
				: Promise.resolve([]),
			prisma.product.count({
				where: {
					createdById: applicatorId,
					...(query && {
						productName: { contains: query, mode: 'insensitive' },
					}),
				},
			}),
			hasMinSearch
				? prisma.chemical.count({
					where: hasMinSearch
						? {
							deletedAt: null,
							productName: {
								contains: query,
								mode: 'insensitive',
							},
						}
						: undefined,
				})
				: Promise.resolve(0),
		]);

	const productMapped = products.map((p) => ({
		id: p.id,
		code: p.epaRegistration,
		productName: p.productName,
		tag: p.baseProductName,
		type: p.category,
		category: p.category,
		perAcreRate: p.perAcreRate,
		label: 'PRODUCT',
	}));

	const chemicalMapped = chemicals.map((c, index) => ({
		id: c.id,
		code: c.registrationNumber,
		productName: c.productName,
		tag: c.abns,
		type: c.pesticideType,
		category: c.pesticideCategory,
		label: 'CHEMICAL',
		isFirstChemical: index === 0, // add identifier only to first chemical
	}));

	const result = [...productMapped, ...chemicalMapped];

	const totalResults = productCount + chemicalCount;
	const totalPages = Math.ceil(totalResults / limit);

	return {
		result,
		limit,
		page,
		totalPages,
		totalResults,
	};
};
const updateAutoJobStatus = async (
	userId: number,
	user: User,
	status: boolean,
) => {
	const { id, role } = user;

	if (role === 'APPLICATOR') {
		await prisma.applicatorGrower.update({
			where: {
				applicatorId_growerId: {
					applicatorId: id,
					growerId: userId,
				},
			},
			data: {
				autoAcceptJobsByApplicator: status,
			},
		});
	}

	if (role === 'GROWER') {
		await prisma.applicatorGrower.update({
			where: {
				applicatorId_growerId: {
					applicatorId: userId,
					growerId: id,
				},
			},
			data: {
				autoAcceptJobsByGrower: status,
			},
		});
	}
	return {
		message: 'status successfully updated.',
	};
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
	getFarmListByApplicatorId,
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
	getJobBytokenThroughEmail,
	getMonthlyAcresSprayed,
	getFinancialSummary,
	getCalendarApplications,
	getApplicationsByRange,
	uploadFlightLog,
	getFaaReports,
	uploadFlightLogImage,
	createFlighLog,
	getFlighLogById,
	getHeadersDataForPilot,
	getSearchProduct,
	updateAutoJobStatus,
	getAllJobsByApplicatorDashboard,
};
