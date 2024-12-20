import morgan from 'morgan';
import createLoggerInstance from '../utils/logger'; // Assuming logger is shared

// Custom morgan tokens and formatting logic
export const createMorganMiddleware = (config: { env: string }) => {
	const logger = createLoggerInstance(config);
	morgan.token('message', () => '');

	const getIpFormat = () =>
		config.env === 'production' ? ':remote-addr - ' : '';
	const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms`;
	const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - message: :message`;

	const successHandler = morgan(successResponseFormat, {
		skip: (req, res) => res.statusCode >= 400,
		stream: { write: (message) => logger.info(message.trim()) },
	});

	const errorHandler = morgan(errorResponseFormat, {
		skip: (req, res) => res.statusCode < 400,
		stream: { write: (message) => logger.error(message.trim()) },
	});

	return { successHandler, errorHandler };
};
