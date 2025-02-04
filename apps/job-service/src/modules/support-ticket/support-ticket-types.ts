import { JobType, JobSource,JobStatus} from '@prisma/client';


interface CreateJob {
	title: string; // Job title (Required)
	type: JobType; // Enum for job type (Required)
	source: JobSource; // Enum for job source (Required)
	status?: JobStatus; // Enum for job status (Default: TO_BE_MAPPED)
	growerId?: number; // Nullable grower ID
	applicatorId?: number; // Nullable applicator ID
	fieldWorkerId?: number; // Nullable field worker ID
	startDate?: Date; // Optional start date
	endDate?: Date; // Optional end date
	description?: string; // Optional job description
	farmId: number; // Required farm ID
	fields: { fieldId: number; actualAcres?: number }[]; // List of fields (Required)
	sensitiveAreas?: string; // Optional sensitive areas info
	adjacentCrops?: string; // Optional adjacent crops info
	products: { name: string; ratePerAcre: number; totalAcres: number; price: number }[]; // Job products (Required)
	applicationFees?: { description: string; rateUoM: number; perAcre: boolean }[]; // Application fees (Optional)
	specialInstructions?: string; // Optional special instructions
	attachments?: object; // JSON object (Optional)
};

export { CreateJob };
