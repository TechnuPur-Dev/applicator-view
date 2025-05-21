import express, { Router } from 'express';

import integrationController from './integration-controller';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
const router: Router = express.Router();
router.use(verifyToken);
router.use(normalizeApplicatorUser);

router
	.route('/open-api/xag_open_uav/invite-url')
	.post(integrationController.inviteUrl);
router
	.route('/open-api/xag_open_uav/bind-devices')
	.post(integrationController.bindDevices);
router
	.route('/open-api/xag_open_uav/devices-page')
	.post(integrationController.devicesPage);
router
	.route('/open-api/xag_open_uav/works-page')
	.post(integrationController.worksPage);
router
	.route('/open-api/xag_open_uav/work-report')
	.post(integrationController.workReport);
export default router;
