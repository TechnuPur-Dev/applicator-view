import { prisma } from '../../../../../shared/libs/prisma-client';
import { Prisma, ProductCategory, ProductUnit } from '@prisma/client';
import { CreateProduct, UpdateProduct } from './product-types';
import { PaginateOptions, User } from '../../../../../shared/types/global';
import ApiError from '../../../../../shared/utils/api-error';

const getAllProductCategories = async () => {
	const productCategoryList = Object.values(ProductCategory).map(
		(category, index) => ({
			id: index + 1,
			name: category,
		}),
	);
	return productCategoryList;
};

const getAllAppliedUnits = async () => {
	const ticketStatusList = Object.values(ProductUnit).map(
		(status, index) => ({
			id: index + 1,
			name: status,
		}),
	);
	return ticketStatusList;
};

const createProduct = async (user: User, data: CreateProduct) => {
	const product = await prisma.product.create({
		data: {
			createdById: user.id,
			...data,
		},
	});

	return product;
};

const getAllProducts = async (
	user: User,
	options: PaginateOptions & {
		label?: string;
		searchValue?: string;
	},
) => {
	const limit =
		options.limit && parseInt(options.limit, 10) > 0
			? parseInt(options.limit, 10)
			: 10;
	// Set the page number, default to 1 if not specified or invalid
	const page =
		options.page && parseInt(options.page, 10) > 0
			? parseInt(options.page, 10)
			: 1;
	// Calculate the number of users to skip based on the current page and limit
	const skip = (page - 1) * limit;
	const { id: userId, role } = user;
	if (role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized to perform this action.',
		);
	}
	const filters: Prisma.ProductWhereInput = {
		createdById: userId,
	};
	if (options.label && options.searchValue) {
		const searchFilter: Prisma.ProductWhereInput = {};
		const searchValue = options.searchValue;
		if (options.label === 'all') {
			const upperValue = searchValue.toUpperCase();
			const isProductCategory = Object.values(ProductCategory).includes(
				upperValue as ProductCategory,
			);
			const isProductUnit = Object.values(ProductUnit).includes(
				upperValue as ProductUnit,
			);
			if (isProductCategory) {
				Object.assign(filters, {
					category: { equals: upperValue as ProductCategory },
				});
			} else if (isProductUnit) {
				Object.assign(filters, {
					OR: [
						{
							inventoryUnit: {
								equals: upperValue as ProductUnit,
							},
						},
						{ appliedUnits: { equals: upperValue as ProductUnit } },
					],
				});
			} else {
				Object.assign(filters, {
					OR: [
						{
							code: !isNaN(Number(searchValue))
								? parseInt(searchValue, 10)
								: undefined,
						},
						{
							productName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							baseProductName: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
						{
							epaRegistration: {
								contains: searchValue,
								mode: 'insensitive',
							},
						},
					],
				});
			}
		} else {
			switch (options.label) {
				case 'code':
					searchFilter.code = parseInt(searchValue, 10);
					break;
				case 'productName':
					searchFilter.productName = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'baseProductName':
					searchFilter.baseProductName = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'category':
					searchFilter.category = {
						equals: searchValue as ProductCategory,
					};
					break;
				case 'epaRegistration':
					searchFilter.epaRegistration = {
						contains: searchValue,
						mode: 'insensitive',
					};
					break;
				case 'inventoryUnit':
					searchFilter.inventoryUnit = {
						equals: searchValue as ProductUnit,
					};
					break;
				case 'appliedUnits':
					searchFilter.appliedUnits = {
						equals: searchValue as ProductUnit,
					};
					break;
				default:
					throw new Error('Invalid label provided.');
			}

			Object.assign(filters, searchFilter); // Merge filters dynamically
		}
	}
	const products = await prisma.product.findMany({
		where: filters,
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	const totalResults = await prisma.product.count({
		where: filters,
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: products,
		page,
		limit,
		totalPages,
		totalResults,
	};
};

const getProductById = async (user: User, productId: number) => {
	const { id: userId, role } = user;
	if (role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized to perform this action.',
		);
	}
	const product = await prisma.product.findUnique({
		where: {
			id: productId,
			createdById: userId,
		},
	});
	return product;
};

const updateProduct = async (
	user: User,
	productId: number,
	data: UpdateProduct,
) => {
	const { id: userId, role } = user;
	if (role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized to perform this action.',
		);
	}
	const product = await prisma.product.update({
		where: { id: productId, createdById: userId },
		data: {
			...data,
		},
	});

	return product;
};

const deleteProduct = async (user: User, productId: number) => {
	const { id: userId, role } = user;
	if (role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized to perform this action.',
		);
	}
	await prisma.product.delete({
		where: {
			id: productId,
			createdById: userId,
		},
	});

	return {
		message: 'Product deleted successfully.',
	};
};

const getAllProductsDropdown = async (user: User) => {
	return await prisma.product.findMany({
		where: { createdById: user.id, restrictedUse: false },
		select: {
			id: true,
			productName: true,
			perAcreRate: true,
		},
		orderBy: { id: 'desc' },
	});
};
const updateRestricted = async (productId: number, restrictedUse: boolean) => {
	await prisma.product.update({
		where: { id: productId },
		data: { restrictedUse },
	});
	return { messaage: 'Product updated successfully' };
};

const getAllChemicals = async (
	user: User,
	options: PaginateOptions & {
		searchValue?: string;
	},
) => {
	const limit =
		options.limit && parseInt(options.limit, 10) > 0
			? parseInt(options.limit, 10)
			: 10;
	// Set the page number, default to 1 if not specified or invalid
	const page =
		options.page && parseInt(options.page, 10) > 0
			? parseInt(options.page, 10)
			: 1;
	// Calculate the number of users to skip based on the current page and limit
	const skip = (page - 1) * limit;

	const chemicals = await prisma.chemical.findMany({
		where: {
			productName: {
				contains: options.searchValue,
				mode: 'insensitive',
			},
		},
		skip,
		take: limit,
		orderBy: {
			id: 'desc',
		},
	});
	const totalResults = await prisma.chemical.count({
		where: {
			productName: {
				contains: options.searchValue,
				mode: 'insensitive',
			},
		},
	});

	const totalPages = Math.ceil(totalResults / limit);
	// Return the paginated result including users, current page, limit, total pages, and total results
	return {
		result: chemicals,
		page,
		limit,
		totalPages,
		totalResults,
	};
};
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
