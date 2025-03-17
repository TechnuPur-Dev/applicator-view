import { $Enums, UserRole } from '@prisma/client';
import { InviteStatus, ProfileStatus } from '@prisma/client';
import { User } from '../../../../../shared/types/global';

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
	stateId?: number;
	county?: string;
	township?: string;
	zipCode?: string;
	bio?: string;
	additionalInfo?: string;
	profileStatus?: ProfileStatus;
}
interface UpdateStatus {
	status: InviteStatus;
	userId: number;
}
interface UpdateArchiveStatus {
	userId: number;
	role: UserRole;
	archiveStatus: boolean;
	canManageFarmsStauts: boolean;
}
interface ResponseData {
	expiresAt?: Date|null;
	growerFirstName?: string | null;
	growerLastName?: string | null;
	inviteStatus?: $Enums.InviteStatus;
	isArchivedByApplicator?: boolean;
	canManageFarms?: boolean;
	grower?: User;
	inviteUrl?: string;
}
export {
	UploadProfileImage,
	UpdateUser,
	UpdateStatus,
	UpdateArchiveStatus,
	ResponseData,
};
