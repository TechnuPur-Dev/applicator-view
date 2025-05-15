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
				role: 'SUPER_ADMIN', // Make sure this exists in your UserRole enum
				profileStatus: 'COMPLETE', // Or INCOMPLETE if that's the default
				createdAt: new Date(),
				joiningDate: new Date(),
				address1: '123 Admin Blvd',
				zipCode: '99999',
			},
		});
		console.log('✅ Super admin created.');
	}
	console.log('Super admin already exists.');
	PERMISSIONS.admin.map(async (name) => {
		await prisma.permission.upsert({
			where: { name },
			update: {},
			create: { name },
		});
	});
	console.log('Permissions seeded.');

	const filePath = path.join(__dirname, './../city.list.json');
	const fileData = await fs.readFile(filePath, 'utf-8');
	const cities = JSON.parse(fileData);

	const cityRecords = cities.map((city: any) => ({
		id: city.id,
		name: city.name,
		state: city.state || null,
		country: city.country,
		latitude: city.coord.lat,
		longitude: city.coord.lon,
	}));

	// Batch insert in chunks
	const chunkSize = 1000;
	for (let i = 0; i < cityRecords.length; i += chunkSize) {
		await prisma.city.createMany({
			data: cityRecords.slice(i, i + chunkSize),
			skipDuplicates: true,
		});
	}

	console.log('Cities imported successfully');
	return;
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
