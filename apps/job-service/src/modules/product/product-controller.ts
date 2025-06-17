import { Request, Response } from 'express';
import catchAsync from '../../../../../shared/utils/catch-async';
import httpStatus from 'http-status';
import productService from './product-service';
import pick from '../../../../../shared/utils/pick';

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
	const result = await productService.createProduct(currentUser, data);
	res.status(httpStatus.CREATED).json(result);
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page', 'label', 'searchValue']);
	const currentUser = req.user;
	const productData = await productService.getAllProducts(
		currentUser,
		options,
	);
	res.status(httpStatus.OK).json(productData);
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const id = +req.params.productId;
	const result = await productService.getProductById(currentUser, id);
	res.status(httpStatus.OK).json(result);
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const productId = +req.params.productId;
	const data = req.body;
	const result = await productService.updateProduct(
		currentUser,
		productId,
		data,
	);
	res.status(httpStatus.OK).json(result);
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
	const currentUser = req.user;
	const productId = +req.params.productId;
	const result = await productService.deleteProduct(currentUser, productId);
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
const updateRestricted = catchAsync(async (req: Request, res: Response) => {
	const id = +req.params.id;
	const { restrictedUse } = req.body;
	const productData = await productService.updateRestricted(
		id,
		restrictedUse,
	);
	res.status(httpStatus.OK).json(productData);
});
const getAllChemicals = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['limit', 'page', 'search']);
	const search = req.query.search as string;
	// if (!search || search.length < 3) {
	// 	return res.status(400).json({ error: 'Search term too short' });
	// }
	const currentUser = req.user;
	const productData = await productService.getAllChemicals(
		currentUser,
		options,
		search,
	);
	res.status(httpStatus.OK).json(productData);
});
export default {
	getAllProductCategories,
	getAllAppliedUnits,
	createProduct,
	getAllProducts,
	getProductById,
	updateProduct,
	deleteProduct,
	getAllProductsDropdown,
	updateRestricted,
	getAllChemicals,
};
