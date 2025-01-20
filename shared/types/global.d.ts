// global.d.ts
export {}; // Makes the file an external module

declare global {
	namespace Express {
		interface Request {
			user: {
				id: number;
				firstName: string | null;
				lastName: string | null;
				fullName: string | null;
				email: string | null;
			};
			payload: {
				id: number;
				email?: string;
				password?: string;
			};
		}
	}
}
