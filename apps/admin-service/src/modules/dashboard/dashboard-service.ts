// import httpStatus from 'http-status';
// import { Decimal } from '@prisma/client/runtime/library';
import { Prisma,UserRole } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
// import axios from 'axios';
import { prisma } from '../../../../../shared/libs/prisma-client';
// import {
// 	UpdateUser,
// 	UpdateStatus,
// 	UpdateArchiveStatus,
// 	ResponseData,
// } from './user-types';
// import config from '../../../../../shared/config/env-config';
// import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // Adjust based on Azure SDK usage
// import { mailHtmlTemplate } from '../../../../../shared/helpers/node-mailer';
// import { sendEmail } from '../../../../../shared/helpers/node-mailer';
// import { hashPassword } from '../../helper/bcrypt';
// import {
// 	PaginateOptions,
	
// } from '../../../../../shared/types/global';
// import ApiError from '../../../../../shared/utils/api-error';
// import { generateInviteToken, verifyInvite } from '../../helper/invite-token';
// import { InviteStatus } from '@prisma/client';


// get user List
const getSummary = async () => {
	const now = new Date();
	const pastDate = new Date();
	pastDate.setDate(now.getDate() - 30);
	   //get all total users 
	const [totalUsers, totalApplicators, totalGrowers, totalPilots] = await Promise.all([
	  prisma.user.count(),
	  prisma.user.count({ where: { role: 'APPLICATOR' } }),
	  prisma.user.count({ where: { role: 'GROWER' } }),
	  prisma.user.count({ where: { role: 'WORKER' } }),
	]);
   
	const [prevUsers, prevApplicators, prevGrowers, prevPilots] = await Promise.all([
	  prisma.user.count({ where: { createdAt: { lte: pastDate } } }),//less the or equals to
	  prisma.user.count({ where: { role: 'APPLICATOR', createdAt: { lte: pastDate } } }),
	  prisma.user.count({ where: { role: 'GROWER', createdAt: { lte: pastDate } } }),
	  prisma.user.count({ where: { role: 'WORKER', createdAt: { lte: pastDate } } }),
	]);
    // to calculate growth rate which is basically tha growth of current month user vs previous 30 days user 
	const getGrowth = (current: number, past: number) => {
	  return past === 0 ? 100 : +(((current - past) / past) * 100).toFixed(2);
	};
   
	return {
	  totalUsers,
	  totalApplicators,
	  totalGrowers,
	  totalPilots,
	  growthRate: {
		users: getGrowth(totalUsers, prevUsers),
		applicators: getGrowth(totalApplicators, prevApplicators),
		growers: getGrowth(totalGrowers, prevGrowers),
		pilots: getGrowth(totalPilots, prevPilots),
	  },
	};
  };
const getBarChartData = async (role?: UserRole| 'ALL') => {
	const nowDate = new Date();
	nowDate.setHours(0, 0, 0, 0); // start of today
  
	const current7Days = [];
	const days = [];
	const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
	// Current 7 Days: Day-wise Breakdown
	for (let i = 6; i >= 0; i--) {
	  const dayDate = new Date(nowDate); // current date 
	  dayDate.setDate(nowDate.getDate() - i); //get prevoius  date i.e if i is 2 then we get 2 days before date
  
	  const start = new Date(dayDate);//i.e get start and end time of 2 days before date
	  start.setHours(0, 0, 0, 0);
  
	  const end = new Date(dayDate);
	  end.setHours(23, 59, 59, 999);
  
	  const count = await prisma.user.count({
		where: {
		  createdAt: { gte: start, lte: end },
		  ...(role && role !== 'ALL' ? { role } : {}), // condition for ignoring 'ALL'
		},
	  });
  
	  current7Days.push(count);
	  days.push({
		day: weekDays[dayDate.getDay()],
		value: count,
	  });
	}
 
	//Previous 7 Days  Total
	const prevStart = new Date(nowDate);
	prevStart.setDate(prevStart.getDate() - 13); //now get last week start date
	prevStart.setHours(0, 0, 0, 0);
  
	const prevEnd = new Date(nowDate);
	prevEnd.setDate(prevEnd.getDate() - 7);
	prevEnd.setHours(23, 59, 59, 999);
  
	const prevTotal = await prisma.user.count({
	  where: {
		createdAt: { gte: prevStart, lte: prevEnd },
		...(role && role !== 'ALL' ? { role } : {}),
	  },
	});
	console.log(current7Days,"current7Dayssssss")
  //curent 7 days and previous 7 days percentage 
	const currentTotal = current7Days.reduce((a, b) => a + b, 0);
	const change = prevTotal === 0 ? 100 : +(((currentTotal - prevTotal) / prevTotal) * 100).toFixed(2);
	return {
	  change,
	  data: days,
	};
  };
const getLineChartData = async (role?: UserRole| 'ALL') => {
	const nowDate = new Date();
	nowDate.setHours(0, 0, 0, 0); // start of today
  
	const current7Days = [];
	const days = [];
	const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
	// Current 7 Days: Day-wise Breakdown
	for (let i = 6; i >= 0; i--) {
	  const dayDate = new Date(nowDate); // current date 
	  dayDate.setDate(nowDate.getDate() - i); //get prevoius  date i.e if i is 2 then we get 2 days before date
  
	  const start = new Date(dayDate);//i.e get start and end time of 2 days before date
	  start.setHours(0, 0, 0, 0);
  
	  const end = new Date(dayDate);
	  end.setHours(23, 59, 59, 999);
  
	  const count = await prisma.user.count({ //count the user who comes on that particular date 
		where: {
		  createdAt: { gte: start, lte: end },
		  ...(role === 'ALL' ? {} : { role: role || 'APPLICATOR' }),
		  
		},
	  });
  
	  current7Days.push(count);
	  days.push({
		day: weekDays[dayDate.getDay()],
		value: count,
	  });
	}

	return {
	  data: days,
	};
  };
 const getDonutChartData = async (role?: UserRole | 'ALL') => {
	const users = await prisma.user.findMany({
	  where: {
		...(role === 'ALL' ? {} : { role: role || 'GROWER' }),
	  },
	  select: {
		state: true, 
	  },
	});
  
	// Count user per state name
	const stateCount: Record<string, number> = {};
  
	users.forEach((user) => {
	  const stateName =
		typeof user.state === 'string' ? user.state : user.state?.name || 'Unknown';
	  stateCount[stateName] = (stateCount[stateName] || 0) + 1;
	});

	const totalUsers = users.length;
	const data = Object.entries(stateCount).map(([state, count]) => ({
	  state,
	  userPercent: totalUsers ? +((count / totalUsers) * 100).toFixed(2) : 0,
	}));
  
	return {
	  data,
	};
  }; 
  // const getDonutChartData = async (role?: UserRole | 'ALL') => {
// 	const roleCondition =
// 		role && role !== 'ALL' ? Prisma.sql`WHERE u.role = ${role}` : Prisma.empty;

// 	const results = await prisma.$queryRaw<
// 		{ state: string | null; count: number }[]
// 	>(Prisma.sql`
// 		SELECT
// 			s."name" AS state,
// 			COUNT(*) as count
// 		FROM "User" u
// 		LEFT JOIN "State" s ON u."stateId" = s.id
// 		${roleCondition}
// 		GROUP BY s."name"
// 	`);

// 	const total = results.reduce((sum, row) => sum + Number(row.count), 0);

// 	return results.map(row => ({
// 		state: row.state ?? 'Unknown',
// 		percent: Math.round((Number(row.count) / total) * 100),
// 	}));
// };


  

	
  
export default {

	getSummary,
	getBarChartData,
	getLineChartData,
	getDonutChartData

	
};
