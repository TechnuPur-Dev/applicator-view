import { JobType } from '@prisma/client';

interface CreateJob {
	title: string; // Job title (Required)
	type: JobType; // Enum for job type (Required)
	userId?: number; // Nullable grower ID
	startDate?: Date; // Optional start date
	endDate?: Date; // Optional end date
	description?: string; // Optional job description
	farmId: number; // Required farm ID
	fields: { fieldId: number; actualAcres?: number }[]; // List of fields (Required)
	sensitiveAreas?: string; // Optional sensitive areas info
	adjacentCrops?: string; // Optional adjacent crops info
	products: {
		productId: number;
		productName?: string;
		totalAcres: number;
		price: number;
		perAcreRate?: number;
	}[]; // Job products (Required)
	applicationFees?: {
		description: string;
		rateUoM: number;
		perAcre: boolean;
	}[]; // Application fees (Optional)
	specialInstructions?: string; // Optional special instructions
	attachments?: object; // JSON object (Optional)
}

export { CreateJob };
