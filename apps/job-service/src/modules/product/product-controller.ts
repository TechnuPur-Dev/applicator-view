import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import productService from './product-service';

const getAllProductCategories = catchAsync(
	async (req: Request, res: Response) => {
		const productData = await productService.getAllProductCategories();
		res.status(httpStatus.OK).json({ result: productData });
	},
);

const getAllAppliedUnits = catchAsync(async (req: Request, res: Response) => {
	const productData = await productService.getAllAppliedUnits();
	res.status(httpStatus.OK).json({ result: productData });
});

const createProduct = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const data = req.body;
	const productData = await productService.createProduct(currentUser, data);
	res.status(httpStatus.OK).json({
		result: productData,
		message: 'Product created successfully',
	});
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const productData = await productService.getAllProducts(currentUser);
	res.status(httpStatus.OK).json({ result: productData });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
	const Id = +req.params.productId;
	const productData = await productService.getProductById(Id);
	res.status(httpStatus.OK).json({ result: productData });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
	const productId = +req.params.productId;
	const data = req.body;
	const productData = await productService.updateProduct(productId, data);
	res.status(httpStatus.OK).json({
		message: 'Product updated successfully',
		result: productData,
	});
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
	const productId = +req.params.productId;
	const result = await productService.deleteProduct(productId);
	res.status(httpStatus.OK).json(result);
});

const getAllProductsDropdown = catchAsync(
	async (req: Request, res: Response) => {
		const currentUser = req.user;
		const productData =
			await productService.getAllProductsDropdown(currentUser);
		res.status(httpStatus.OK).json({ result: productData });
	},
);

export default {
	getAllProductCategories,
	getAllAppliedUnits,
	createProduct,
	getAllProducts,
	getProductById,
	updateProduct,
	deleteProduct,
	getAllProductsDropdown,
};
