import express, { Router } from 'express';

import supportTicketController from './support-ticket-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware'; 
import supportTicketValidation from './support-ticket-validation';

const router: Router = express.Router();

router
	.route('/all-categories')
	.get(verifyToken, supportTicketController.getAllTicketCategories);
router
	.route('/all-statuses')
	.get(verifyToken, supportTicketController.getAllTicketStatuses);
router
	.route('/all-priorities')
	.get(verifyToken, supportTicketController.getAllTicketPriorities);
router
	.route('/create')
	.post(verifyToken, validateSchema(supportTicketValidation.supportTicketSchema), supportTicketController.createSupportTicket);
    router
	.route('/all')
	.get(verifyToken, supportTicketController.getAllSupportTicket);
    router
	.route('/get-byId/:ticketId')
	.get(verifyToken, supportTicketController.getSupportTicketById);
export default router;
