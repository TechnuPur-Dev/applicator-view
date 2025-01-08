// import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import createLoggerInstance from '../../../../shared/utils/logger';
import config from '../config/env-config';
import { Express } from 'express';
const logger = createLoggerInstance(config);

// Socket.IO server
// const socket: SocketIOServer = new SocketIOServer();

let server: HTTPServer | undefined;

/**
 * Initialize and start the Express server with Socket.IO.
 * @param port - The port number to run the server on.
 * @param app - The Express application instance.
 */
const expressServer = (port: number, app: Express): void => {
	try {
		server = app.listen(port, () => {
			logger.info(`Listening to port ${'http://localhost:' + port}`);
		});

		/**
		 * Socket.io configuration
		 */
		// socket.attach(server, {
		// 	path: '/clync-app', // Use a custom path for Socket.IO
		// 	cors: {
		// 		origin: '*', // Allow connections from any origin
		// 	},
		// 	maxHttpBufferSize: 1e8, // Buffer size limit
		// 	pingTimeout: 6000, // Ping timeout in milliseconds
		// });

		/**
		 * Graceful shutdown and error handling
		 */
		const exitHandler = (): void => {
			if (server) {
				server.close(() => {
					logger.info('Server closed');
					process.exit(1);
				});
			} else {
				process.exit(1);
			}
		};

		const unexpectedErrorHandler = (error: Error): void => {
			logger.error(error);
			exitHandler();
		};

		process.on('uncaughtException', unexpectedErrorHandler);
		process.on('unhandledRejection', unexpectedErrorHandler);

		process.on('SIGTERM', () => {
			logger.info('SIGTERM received');
			if (server) {
				server.close();
			}
		});
	} catch (error) {
		console.log(error);
		logger.error(`Server is not working: ERROR`);
	}
};

// export { expressServer, socket };
export { expressServer };
