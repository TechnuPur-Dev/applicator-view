import express, { Router } from 'express';
import certificationController from './certification-controller';
// import certificationValidation from './certification-validation';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware';
import { normalizeApplicatorUser } from '../../../../../shared/middlewares/normalize-user-middleware';
import uploadMiddleware from '../../../../../shared/middlewares/multer-middleware';

const router: Router = express.Router();

// Define routes
router
	.route('/')
	.post(
		verifyToken,
		normalizeApplicatorUser,
		certificationController.createCertification,
	)
	.get(
		verifyToken,
		normalizeApplicatorUser,
		certificationController.getAllCertifications,
	);

router
	.route('/:id')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		certificationController.getCertificationById,
	)
	.put(
		verifyToken,
		normalizeApplicatorUser,
		certificationController.updateCertification,
	)
	.delete(
		verifyToken,
		normalizeApplicatorUser,
		certificationController.deleteCertification,
	);

router
	.route('/types/dropdown')
	.get(
		verifyToken,
		normalizeApplicatorUser,
		certificationController.getCertificationTypes,
	);

router
	.route('/upload')
	.post(
		verifyToken,
		uploadMiddleware,
		certificationController.uploadCertification,
	);

export default router;
