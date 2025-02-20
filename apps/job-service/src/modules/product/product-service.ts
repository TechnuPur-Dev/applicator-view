import { prisma } from '../../../../../shared/libs/prisma-client';
import { ProductCategory, ProductUnit } from '@prisma/client';
import { CreateProduct, UpdateProduct } from './product-types';
import { User } from '../../../../../shared/types/global';
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

const getAllProducts = async (user: User) => {
	const { id: userId, role } = user;
	if (role !== 'APPLICATOR') {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			'You are not authorized to perform this action.',
		);
	}
	const products = await prisma.product.findMany({
		where: {
			createdById: userId,
		},
	});
	return products;
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
