import { Prisma } from '@prisma/client';

/**
 * Checks if the given error is a Prisma error.
 * @param e The error object
 * @param code Optional error code to match
 * @returns True if the error is a Prisma error, otherwise false
 */
function isPrismaError(
	e: unknown,
	code?: string,
): e is
	| Prisma.PrismaClientKnownRequestError
	| Prisma.PrismaClientInitializationError
	| Prisma.PrismaClientRustPanicError
	| Prisma.PrismaClientUnknownRequestError
	| Prisma.PrismaClientValidationError {
	if (
		e instanceof Prisma.PrismaClientKnownRequestError ||
		e instanceof Prisma.PrismaClientInitializationError ||
		e instanceof Prisma.PrismaClientRustPanicError ||
		e instanceof Prisma.PrismaClientUnknownRequestError ||
		e instanceof Prisma.PrismaClientValidationError
	) {
		return code ? (e as { code?: string }).code === code : true;
	}
	return false;
}

// Type for the structure of Prisma error details
interface PrismaErrorDetails {
	message: string;
	httpStatus: number;
	meta?: Record<string, unknown>;
}

// Prisma error code mapping
const QueryError = new Map<string, { message: string; httpStatus: number }>([
	['P2000', { message: 'prisma.P2000', httpStatus: 400 }],
	['P2001', { message: 'prisma.P2001', httpStatus: 404 }],
	['P2002', { message: 'prisma.P2002', httpStatus: 409 }],
	['P2003', { message: 'prisma.P2003', httpStatus: 409 }],
	['P2004', { message: 'prisma.P2004', httpStatus: 400 }],
	['P2005', { message: 'prisma.P2005', httpStatus: 400 }],
	['P2006', { message: 'prisma.P2006', httpStatus: 400 }],
	['P2007', { message: 'prisma.P2007', httpStatus: 400 }],
	['P2008', { message: 'prisma.P2008', httpStatus: 400 }],
	['P2009', { message: 'prisma.P2009', httpStatus: 400 }],
	['P2010', { message: 'prisma.P2010', httpStatus: 500 }],
	['P2011', { message: 'prisma.P2011', httpStatus: 400 }],
	['P2012', { message: 'prisma.P2012', httpStatus: 400 }],
	['P2013', { message: 'prisma.P2013', httpStatus: 400 }],
	['P2014', { message: 'prisma.P2014', httpStatus: 400 }],
	['P2015', { message: 'prisma.P2015', httpStatus: 404 }],
	['P2016', { message: 'prisma.P2016', httpStatus: 400 }],
	['P2017', { message: 'prisma.P2017', httpStatus: 400 }],
	['P2018', { message: 'prisma.P2018', httpStatus: 404 }],
	['P2019', { message: 'prisma.P2019', httpStatus: 400 }],
	['P2020', { message: 'prisma.P2020', httpStatus: 400 }],
	['P2021', { message: 'prisma.P2021', httpStatus: 404 }],
	['P2022', { message: 'prisma.P2022', httpStatus: 404 }],
	['P2023', { message: 'prisma.P2023', httpStatus: 400 }],
	['P2024', { message: 'prisma.P2024', httpStatus: 500 }],
	['P2025', { message: 'prisma.P2025', httpStatus: 404 }],
	['P2026', { message: 'prisma.P2026', httpStatus: 400 }],
	['P2027', { message: 'prisma.P2027', httpStatus: 500 }],
	['P2028', { message: 'prisma.P2028', httpStatus: 400 }],
	['P2029', { message: 'prisma.P2029', httpStatus: 400 }],
	['P2030', { message: 'prisma.P2030', httpStatus: 400 }],
	['P2031', { message: 'prisma.P2031', httpStatus: 400 }],
	['P2033', { message: 'prisma.P2033', httpStatus: 400 }],
	['P2034', { message: 'prisma.P2034', httpStatus: 400 }],
	['P2035', { message: 'prisma.P2035', httpStatus: 400 }],
	['P2036', { message: 'prisma.P2036', httpStatus: 500 }],
	['P2037', { message: 'prisma.P2037', httpStatus: 500 }],
]);

/**
 * Get a human-readable error message for Prisma errors
 * @param prismaError The Prisma error object
 * @returns An object containing the message, HTTP status, and optional meta information
 */
function getPrismaErrorMessage(
	prismaError:
		| Prisma.PrismaClientKnownRequestError
		| Prisma.PrismaClientInitializationError
		| Prisma.PrismaClientRustPanicError
		| Prisma.PrismaClientUnknownRequestError
		| Prisma.PrismaClientValidationError,
): PrismaErrorDetails {
	// Narrowing down to PrismaClientKnownRequestError to safely access the `code` property
	if (prismaError instanceof Prisma.PrismaClientKnownRequestError) {
		const error = QueryError.get(prismaError.code);
		if (!error) {
			return { message: '', httpStatus: 500 };
		}

		return {
			meta: prismaError.meta
				? JSON.parse(JSON.stringify(prismaError.meta))
				: undefined,
			message: error.message,
			httpStatus: error.httpStatus,
		};
	}

	// Handle other types of Prisma errors without `code`
	return { message: 'An unknown error occurred.', httpStatus: 500 };
}

export { isPrismaError, getPrismaErrorMessage };
