import express, { Router } from 'express';

import applicatorWorker from './applicator-workers-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import  workerValidation from './applicator-workers-validation';
const router: Router = express.Router();

router.route('/create').post(verifyToken,validateSchema(workerValidation.workerCreateSchema), applicatorWorker.createWorker);
router.route('/all').get(verifyToken, applicatorWorker.getAllWorker);
router.route('/get-byId/:id').get(verifyToken,validateSchema(workerValidation.paramsSchema), applicatorWorker.getWorkerById);
router.route('/update/:id').put(verifyToken,validateSchema(workerValidation.updateSchema) ,applicatorWorker.updateWorker);
router.route('/delete/:id').delete(verifyToken,validateSchema(workerValidation.paramsSchema), applicatorWorker.deleteWorker);

export default router;