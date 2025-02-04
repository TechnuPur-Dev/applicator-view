import express, { Router } from 'express';

import supportTicketController from './support-ticket-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
const router: Router = express.Router();





router.route('/all-categories').get(verifyToken, supportTicketController.getAllTicketCategories);
router.route('/all-statuses').get(verifyToken, supportTicketController.getAllTicketStatuses);
router.route('/all-priorities').get(verifyToken, supportTicketController.getAllTicketPriorities);

export default router;
