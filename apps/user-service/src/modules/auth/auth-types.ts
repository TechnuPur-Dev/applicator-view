import { UserRole } from '@prisma/client';

interface RegisterUser {
	profileImage?: string;
	thumbnailProfileImage?: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber?: string;
	password: string;
	role: UserRole;
	businessName?: string;
	experience?: number; // Convert Decimal to number for the DTO
	address1?: string;
	address2?: string;
	state?: string;
	county?: string;
	township?: string;
	zipCode?: string;
	bio?: string;
	additionalInfo?: string;
}

export { RegisterUser };
