import { UserRole } from '@prisma/client';
import { prisma } from '../../../../../shared/libs/prisma-client';
import { generateColorMapFromPercent } from '../../../../../shared/utils/generate-color-map';

// get user List
const getSummary = async () => {
	const now = new Date();
	const pastDate = new Date();
	pastDate.setDate(now.getDate() - 30);
	//get all total users
	const [totalUsers, totalApplicators, totalGrowers, totalPilots] =
		await Promise.all([
			prisma.user.count(),
			prisma.user.count({ where: { role: 'APPLICATOR' } }),
			prisma.user.count({ where: { role: 'GROWER' } }),
			prisma.user.count({ where: { role: 'WORKER' } }),
		]);

	const [prevUsers, prevApplicators, prevGrowers, prevPilots] =
		await Promise.all([
			prisma.user.count({ where: { createdAt: { lte: pastDate } } }), //less the or equals to
			prisma.user.count({
				where: { role: 'APPLICATOR', createdAt: { lte: pastDate } },
			}),
			prisma.user.count({
				where: { role: 'GROWER', createdAt: { lte: pastDate } },
			}),
			prisma.user.count({
				where: { role: 'WORKER', createdAt: { lte: pastDate } },
			}),
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
const getBarChartData = async (role?: UserRole | 'ALL') => {
	const nowDate = new Date();
	nowDate.setHours(0, 0, 0, 0); // start of today

	const current7Days = [];
	const days = [];
	const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	// Current 7 Days: Day-wise Breakdown
	for (let i = 6; i >= 0; i--) {
		const dayDate = new Date(nowDate); // current date
		dayDate.setDate(nowDate.getDate() - i); //get prevoius  date i.e if i is 2 then we get 2 days before date

		const start = new Date(dayDate); //i.e get start and end time of 2 days before date
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
	console.log(current7Days, 'current7Dayssssss');
	//curent 7 days and previous 7 days percentage
	const currentTotal = current7Days.reduce((a, b) => a + b, 0);
	const change =
		prevTotal === 0
			? 100
			: +(((currentTotal - prevTotal) / prevTotal) * 100).toFixed(2);
	return {
		change,
		data: days,
	};
};
const getLineChartData = async (role?: UserRole | 'ALL') => {
	const now = new Date();
	const currentYear = now.getFullYear();
	const lastYear = currentYear - 1; // take last year from current year

	const months = [
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

	const generateYearlyData = async (year: number) => {
		const data = [];

		for (let month = 0; month < 12; month++) {
			const start = new Date(year, month, 1);
			const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

			const count = await prisma.user.count({
				where: {
					createdAt: { gte: start, lte: end },
					...(role === 'ALL' ? {} : { role: role || 'APPLICATOR' }),
				},
			});

			data.push({
				month: months[month],
				value: count,
			});
		}

		return data;
	};

	const currentYearData = await generateYearlyData(currentYear);
	const lastYearData = await generateYearlyData(lastYear);

	return {
		currentYear: currentYearData,
		lastYear: lastYearData,
	};
};

interface UserStateData {
	state: string;
	userPercent: number;
	color?: string;
}

// const getLineChartData = async (role?: UserRole| 'ALL') => {
// 	const nowDate = new Date();
// 	nowDate.setHours(0, 0, 0, 0); // start of today

// 	const current7Days = [];
// 	const days = [];
// 	const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 	// Current 7 Days: Day-wise Breakdown
// 	for (let i = 6; i >= 0; i--) {
// 	  const dayDate = new Date(nowDate); // current date
// 	  dayDate.setDate(nowDate.getDate() - i); //get prevoius  date i.e if i is 2 then we get 2 days before date

// 	  const start = new Date(dayDate);//i.e get start and end time of 2 days before date
// 	  start.setHours(0, 0, 0, 0);

// 	  const end = new Date(dayDate);
// 	  end.setHours(23, 59, 59, 999);

// 	  const count = await prisma.user.count({ //count the user who comes on that particular date
// 		where: {
// 		  createdAt: { gte: start, lte: end },
// 		  ...(role === 'ALL' ? {} : { role: role || 'APPLICATOR' }),

// 		},
// 	  });

// 	  current7Days.push(count);
// 	  days.push({
// 		day: weekDays[dayDate.getDay()],
// 		value: count,
// 	  });
// 	}

// 	return {
// 	  data: days,
// 	};
//   };
const getDonutChartData = async (role?: UserRole | 'ALL') => {
	const users = await prisma.user.findMany({
		where: {
			...(role === 'ALL' ? {} : { role: role || 'GROWER' }),
		},
		select: {
			state: true,
		},
	});

	// Count users by state
	const stateCount: Record<string, number> = {};

	for (const item of users) {
		const stateObj = item?.state;
		const stateName =
			typeof stateObj === 'string'
				? stateObj
				: stateObj?.name || 'Unknown';

		stateCount[stateName] = (stateCount[stateName] || 0) + 1;
	}

	const totalUsers = users.length;

	const data: UserStateData[] = Object.entries(stateCount).map(
		([state, count]) => ({
			state,
			userPercent: totalUsers
				? +((count / totalUsers) * 100).toFixed(2)
				: 0,
		}),
	);

	// Generate consistent colors based on sorted percentages
	const colorMap = generateColorMapFromPercent(data);

	// Add colors to data
	const finalData = data.map((entry) => ({
		...entry,
		color: colorMap[entry.state] || '#ccc',
	}));

	return { data: finalData };
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
	getDonutChartData,
};
