import express, { Router } from 'express';

import supportTicketController from './support-ticket-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import supportTicketValidation from './support-ticket-validation';
import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();
router.use(verifyToken);
router.use(normalizeApplicatorUser);
router
	.route('/all-categories')
	.get(supportTicketController.getAllTicketCategories);
router.route('/all-statuses').get(supportTicketController.getAllTicketStatuses);
router
	.route('/all-priorities')
	.get(supportTicketController.getAllTicketPriorities);
router
	.route('/create')
	.post(
		validateSchema(supportTicketValidation.supportTicketSchema),
		supportTicketController.createSupportTicket,
	);
router.route('/all').get(supportTicketController.getAllSupportTicket);
router
	.route('/get-byId/:ticketId')
	.get(
		validateSchema(supportTicketValidation.paramsSchema),
		supportTicketController.getSupportTicketById,
	);
router
	.route('/update/:ticketId')
	.put(
		validateSchema(supportTicketValidation.updateSupportTicketSchema),
		supportTicketController.updateSupportTicket,
	);
router.route('/my-tickets').get(supportTicketController.getMySupportTicket);
router
	.route('/pilot-tickets')
	.get(supportTicketController.getPilotSupportTicket);
router.route('/my-jobs').get(supportTicketController.getAllJobsByApplicator);
router
	.route('/delete/:ticketId')
	.delete(
		validateSchema(supportTicketValidation.paramsSchema),
		supportTicketController.deleteTicket,
	);
router
	.route('/resolve/:ticketId')
	.put(
		validateSchema(supportTicketValidation.resolveSupportTicketSchema),
		supportTicketController.resolveSupportTicket,
	);
// router
// 	.route('/assign/:ticketId')
// 	.put(
// 		validateSchema(supportTicketValidation.assignSupportTicketSchema),
// 		supportTicketController.assignSupportTicket,
// 	);
	router
		.route('/get-supportTicketActivity/:ticketId')
		.get(
			verifyToken,
			validateSchema(supportTicketValidation.paramsSchema),
			supportTicketController.getSupportTicketActivityById,
		);
export default router;
