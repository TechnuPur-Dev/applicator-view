import { InviteStatus, WorkerType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface ApplicatorWorker {
	title: WorkerType;
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
	pilotPestLicenseNumber?: string;
	pilotLicenseNumber?: string;
	businessLicenseNumber?: string;
	planeOrUnitNumber?: string;
	percentageFee: Decimal;
	dollarPerAcre: Decimal;
	autoAcceptJobs: boolean;
	canViewPricingDetails: boolean;
	code: string;
	lastLogin: Date;
	isActive: boolean;
}
interface UpdateStatus {
	status: InviteStatus;
	applicatorId: number;
}
export { ApplicatorWorker, UpdateStatus };
