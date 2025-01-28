import { UserRole } from '@prisma/client';
import { InviteStatus, ProfileStatus } from '@prisma/client';

interface UploadProfileImage {
	statusCode: number;
	body: Record<string, unknown>;
}
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
	state?: string;
	county?: string;
	township?: string;
	zipCode?: string;
	bio?: string;
	additionalInfo?: string;
	profileStatus?: ProfileStatus;
}
interface UpdateStatus {
	status: InviteStatus;
	growerId: number;
	applicatorId: number;
}
interface UpdateArchiveStatus {
	userId:number,
	role:UserRole,
	archiveStatus: boolean;
	canManageFarmsStauts: boolean;
}
export { UploadProfileImage, UpdateUser, UpdateStatus,UpdateArchiveStatus };
