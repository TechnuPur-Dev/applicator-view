import express, { Router } from 'express';

import supportTicketController from './support-ticket-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
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
	.post(
		verifyToken,
		validateSchema(supportTicketValidation.supportTicketSchema),
		supportTicketController.createSupportTicket,
	);
router
	.route('/all')
	.get(verifyToken, supportTicketController.getAllSupportTicket);
router
	.route('/get-byId/:ticketId')
	.get(
		verifyToken,
		validateSchema(supportTicketValidation.paramsSchema),
		supportTicketController.getSupportTicketById,
	);
router
	.route('/update/:ticketId')
	.put(
		verifyToken,
		validateSchema(supportTicketValidation.updateSupportTicketSchema),
		supportTicketController.updateSupportTicket,
	);
router
	.route('/my-ticktes')
	.get(verifyToken, supportTicketController.getMySupportTicket);
router
	.route('/pilot-ticktes')
	.get(verifyToken, supportTicketController.getPilotSupportTicket);
router
	.route('/my-jobs')
	.get(verifyToken, supportTicketController.getAllJobsByApplicator);
router
	.route('/delete/:ticketId')
	.delete(
		verifyToken,
		validateSchema(supportTicketValidation.paramsSchema),
		supportTicketController.deleteTicket,
	);
router
	.route('/resolve/:ticketId')
	.put(
		verifyToken,
		validateSchema(supportTicketValidation.resolveSupportTicketSchema),
		supportTicketController.resolveSupportTicket,
	);
router
	.route('/assign/:ticketId')
	.put(
		verifyToken,
		validateSchema(supportTicketValidation.assignSupportTicketSchema),
		supportTicketController.assignSupportTicket,
	);
export default router;
