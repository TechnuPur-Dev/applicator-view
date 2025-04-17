import { PrismaClient } from '@prisma/client';
import { hashPassword,  } from '../apps/user-service/src/helper/bcrypt';



const prisma = new PrismaClient();

async function main() {
	const email = 'superadmin@acre.com';
	const existingUser = await prisma.user.findUnique({ where: { email } });

	if (existingUser) {
		console.log('Super admin already exists.');
		return;
	}

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

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
