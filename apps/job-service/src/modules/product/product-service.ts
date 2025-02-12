import httpStatus from 'http-status';
// import { Prisma } from '@prisma/client';
// import sharp from 'sharp';
// import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../../../shared/libs/prisma-client';

import { ProductCategory, ProductUnit, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
// import ApiError from '../../../../../shared/utils/api-error';
import { CreateProduct, UpdateProduct } from './product-types';

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


const createProduct = async (
	data: CreateProduct,
) => {
	const product = await prisma.product.create({
		data: {
			...data
				},
	});

	return product;
};

const getAllProducts = async () => {
	const products = await prisma.product.findMany();
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
const updateProduct = async (
	productId: number,
	data: UpdateProduct
) => {
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

export default {
	getAllProductCategories,
	getAllAppliedUnits,
	createProduct,
	getAllProducts,
	getProductById,
	updateProduct,
	deleteProduct
	
};
