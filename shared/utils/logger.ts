import winston, { transports, createLogger, format } from 'winston';
import moment from 'moment';

// Function to create a logger instance
const createLoggerInstance = (config: { env: string }) => {
	const { combine, colorize, uncolorize, splat, printf } = format;

	const enumerateErrorFormat = winston.format((info) => {
		if (info instanceof Error) {
			Object.assign(info, { message: info.stack });
		}
		return info;
	});

	return createLogger({
		level: config.env === 'development' ? 'debug' : 'info',
		format: combine(
			enumerateErrorFormat(),
			config.env === 'development' ? colorize() : uncolorize(),
			splat(),
			printf(
				({ level, message }) =>
					`${level}: ${message} ${moment().format('MMMM Do YYYY, h:mm:ss a')}`,
			),
		),
		transports: [
			new transports.Console({
				stderrLevels: ['error'],
			}),
		],
	});
};

export default createLoggerInstance;
