import { prisma } from '../../../../../shared/libs/prisma-client';
import { ProductCategory, ProductUnit } from '@prisma/client';
import { CreateProduct, UpdateProduct } from './product-types';
import { User } from '../../../../../shared/types/global';

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
	const products = await prisma.product.findMany({
		where: {
			createdById: user.id,
		},
	});
	return products;
};

const getProductById = async (Id: number) => {
	const product = await prisma.product.findUnique({
		where: {
			id: Id,
		},
	});
	return product;
};
const updateProduct = async (productId: number, data: UpdateProduct) => {
	const product = await prisma.product.update({
		where: { id: productId },
		data: {
			...data,
		},
	});

	return product;
};

const deleteProduct = async (productId: number) => {
	await prisma.product.delete({
		where: {
			id: productId,
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
