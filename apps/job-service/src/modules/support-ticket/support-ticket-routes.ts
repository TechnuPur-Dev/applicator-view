import express, { Router } from 'express';

import supportTicketController from './support-ticket-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
const router: Router = express.Router();




//job type
router.route('/all-types').get(verifyToken, supportTicketController.getAllJobTypes);

// job status
router.route('/all-statuses').get(verifyToken, supportTicketController.getAllJobStatus);
export default router;
