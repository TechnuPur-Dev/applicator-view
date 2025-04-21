import { $Enums, UserRole } from '@prisma/client';
// import { InviteStatus, ProfileStatus } from '@prisma/client';
// import { User } from '../../../../../shared/types/global';


interface UpdateUser {
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
	profileStatus?: ProfileStatus;
}

interface UpdateArchiveStatus {
	userId: number;
	role: UserRole;
	archiveStatus: boolean;
	canManageFarmsStauts: boolean;
}
export {
	UpdateUser,
	UpdateArchiveStatus,
};
