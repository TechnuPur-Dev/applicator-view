import app from './app'; // Implementation of all middlewares
import config from './src/config/env-config'; // Environment configuration
import { expressServer } from './src/config/server'; // Server setup utility

// ======== Start the Express Server ========
expressServer(config.port, app); // Initialize server with the configured port and app
