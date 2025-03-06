// global.d.ts

import { UserRole } from '@prisma/client';

declare global {
	namespace Express {
		interface Request {
			user: {
				id: number;
				firstName: string | null;
				lastName: string | null;
				fullName: string | null;
				email: string | null;
				role: UserRole;
			};
			payload: {
				id: number;
				email?: string;
				password?: string;
			};
		}
	}
}

interface User {
	id: number;
	firstName: string | null;
	lastName: string | null;
	fullName: string | null;
	email: string | null;
	role: UserRole;
}
interface PaginateOptions {
	limit?: string;
	page?: string;
}
interface city {
	city?:string
}

export { User, PaginateOptions ,city}; // Makes the file an external module
