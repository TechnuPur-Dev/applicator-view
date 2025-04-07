import { InviteStatus } from '@prisma/client';
// import { Decimal } from '@prisma/client/runtime/library';

interface ApplicatorUser {
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber?: string;
	address1?: string;
	address2?: string;
	stateId: number;
	county: string;
	township: string;
	zipCode: string;
	userPermission:{
		permissionId:number,
		canView:boolean,
		canEdit:boolean
	}[]
}
interface UpdateStatus {
	status: InviteStatus;
	applicatorId: number;
}
export { ApplicatorUser, UpdateStatus };
