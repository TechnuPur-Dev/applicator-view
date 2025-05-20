/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../apps/user-service/src/helper/bcrypt';
import { PERMISSIONS } from '../shared/constants/index';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
	const email = 'superadmin@acre.com';
	const existingUser = await prisma.user.findUnique({ where: { email } });

	if (!existingUser) {
		const hashedPassword = await hashPassword('P@ss@cre');
		await prisma.user.create({
			data: {
				firstName: 'Super',
				lastName: 'Admin',
				fullName: 'Super Admin',
				email,
				phoneNumber: '1234567890',
				password: hashedPassword,
				role: 'SUPER_ADMIN',
				profileStatus: 'COMPLETE',
				createdAt: new Date(),
				joiningDate: new Date(),
				address1: '123 Admin Blvd',
				zipCode: '99999',
			},
		});
		console.log('✅ Super admin created.');
	} else {
		console.log('Super admin already exists.');
	}

	await Promise.all(
		PERMISSIONS.admin.map((name) =>
			prisma.permission.upsert({
				where: { name },
				update: {},
				create: { name },
			}),
		),
	);
	console.log('Permissions seeded.');

	// Seed cities
	const citiesFilePath = path.join(__dirname, './../city.list.json');
	const cityFileData = await fs.readFile(citiesFilePath, 'utf-8');
	const cities = JSON.parse(cityFileData);

	const cityRecords = cities.map((city: any) => ({
		id: city.id,
		name: city.name,
		state: city.state || null,
		country: city.country,
		latitude: city.coord.lat,
		longitude: city.coord.lon,
	}));

	for (let i = 0; i < cityRecords.length; i += 1000) {
		await prisma.city.createMany({
			data: cityRecords.slice(i, i + 1000),
			skipDuplicates: true,
		});
	}
	console.log('Cities imported successfully.');

	const filePath = path.join(__dirname, './../chemicals_seed_data.json');
	const fileData = await fs.readFile(filePath, 'utf-8');
	const chemicals = JSON.parse(fileData);
	chemicals.forEach((item: any) => {
		if (item.companyNumber !== null && item.companyNumber !== undefined) {
			const firstRegistrationDate = new Date(item.firstRegistrationDate);
			const statusDate = new Date(item.statusDate);
			const maxLabelDate = new Date(item.maxLabelDate);
			item.companyNumber = String(item.companyNumber);
			item.ridpNumberSort = String(item.ridpNumberSort);
			item.firstRegistrationDate = firstRegistrationDate.toISOString();
			item.statusDate = statusDate.toISOString();
			item.maxLabelDate = maxLabelDate.toISOString();
		}
	});

	const chunkSize = 1000;
	for (let i = 0; i < chemicals.length; i += chunkSize) {
		await prisma.chemical.createMany({
			data: chemicals.slice(i, i + chunkSize),
			skipDuplicates: true,
		});
	}

	console.log('✅ Chemicals seeded successfully');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
