class ApiError extends Error {
	public statusCode: number;
	public isOperational: boolean;
	public stack?: string;

	/**
	 * @param {number} statusCode
	 * @param {string} message
	 * @param {boolean} isOperational
	 * @param {string} stack
	 */
	constructor(
		statusCode: number,
		message: string,
		isOperational = true,
		stack = '',
	) {
		super(message);
		this.statusCode = statusCode;
		this.isOperational = isOperational;

		// If a stack trace is provided, use it, otherwise generate it
		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

export default ApiError;
