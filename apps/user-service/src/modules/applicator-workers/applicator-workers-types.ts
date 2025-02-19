import { InviteStatus, WorkerType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface ApplicatorWorker {
	title: WorkerType;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber?: string;
	businessName?: string;
	address1?: string;
	address2?: string;
	stateId: number;
	county: string;
	township: string;
	zipCode: string;
    pilotLicenseNumber?:string;
    businessLicenseNumber?:string;
    planeOrUnitNumber?:string;
    perAcrePricing:Decimal;
    percentageFee: Decimal;       
    dollarPerAcre: Decimal;
    autoAcceptJobs:boolean        
    canViewPricingDetails:boolean 
    code:string
    lastLogin: Date   
}
interface UpdateStatus {
	status: InviteStatus;
	workerId: number;
}
export {ApplicatorWorker,UpdateStatus}