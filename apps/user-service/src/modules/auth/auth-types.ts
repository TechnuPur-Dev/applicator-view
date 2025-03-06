import { UserRole, ProfileStatus } from '@prisma/client';

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
	stateId?: number;
	county?: string;
	township?: string;
	zipCode?: string;
	bio?: string;
	additionalInfo?: string;
}
interface LoginUser {
	email: string;
	password: string;
	deviceToken?: string;
	role: UserRole;
}
interface verifyOTPAndRegisterEmail {
	email: string;
	otp: number;
	role: UserRole;
}

interface signUpUserSchema {
	token: string;
	profileImage?: string;
	thumbnailProfileImage?: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber?: string;
	password: string;
	businessName?: string;
	experience?: number; // Convert Decimal to number for the DTO
	address1?: string;
	address2?: string;
	stateId?: number;
	county?: string;
	township?: string;
	zipCode?: string;
	bio?: string;
	additionalInfo?: string;
	profileStatus?: ProfileStatus;
}

export { RegisterUser, LoginUser, verifyOTPAndRegisterEmail, signUpUserSchema };
