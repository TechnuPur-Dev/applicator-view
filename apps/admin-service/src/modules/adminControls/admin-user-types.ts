import { UserRole } from '@prisma/client';
import { ProfileStatus } from '@prisma/client';
// import { User } from '../../../../../shared/types/global';
interface UserData {
	firstName: string;
	lastName: string;
	email: string;
	password:string,
	phoneNumber?: string;
	role: UserRole;
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
	UserData,
	UpdateArchiveStatus,
};
