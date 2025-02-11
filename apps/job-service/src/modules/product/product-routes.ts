import express, { Router } from 'express';

import productController from './product-controller';
// import upload from '../../../../../shared/middlewares/multer-middleware';
import { verifyToken } from '../../../../../shared/middlewares/auth-middleware'; // Uncomment and add correct path for TypeScript support if needed
import validateSchema from '../../../../../shared/middlewares/validation-middleware';
import productValidation from './product-validation';

const router: Router = express.Router();

router
	.route('/all-categories')
	.get(verifyToken, productController.getAllProductCategories);
router
	.route('/all-units')
	.get(verifyToken, productController.getAllAppliedUnits);
router
	.route('/create')
	.post(
		verifyToken,
		validateSchema(productValidation.productSchema),
		productController.createProduct,
	);
router
	.route('/all')
	.get(verifyToken, productController.getAllProducts);
router
	.route('/get-byId/:productId')
	.get(
		verifyToken,
		validateSchema(productValidation.paramsSchema),
		productController.getProductById,
	);
router
	.route('/update/:productId')
	.put(
		verifyToken,
		validateSchema(productValidation.updateProductSchema),
		productController.updateProduct,
	);
	router
	.route('/delete/:productId')
	.delete(
		verifyToken,
		validateSchema(productValidation.paramsSchema),
		productController.deleteProduct,
	);

export default router;
