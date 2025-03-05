import Joi, { Schema } from 'joi';

const productCategorySchema = Joi.string()
	.valid(
		'INSECTICIDE',
		'FUNGICIDE',
		'ADJUVANT',
		'HERBICIDE',
		'PGR',
		'DRY_FERTILIZER',
		'LIQUID_FERTILIZER',
		'SEED',
		'OTHER',
	)
	.required();

const productUnitSchema = Joi.string()
	.valid(
		'GALLON',
		'PINT',
		'QUART',
		'FLOZ',
		'TON',
		'POUND',
		'OUNCE',
		'CASE',
		'BAG',
		'BULK_BAG',
		'JUG',
		'UNIT',
	)
	.required();

const productSchema: Schema = Joi.object({
	body: Joi.object({
		baseProductName: Joi.string().min(1).max(50).required(),
		productName: Joi.string().min(1).max(50).required(),
		code: Joi.number().integer().positive().optional(),
		category: productCategorySchema.required(),
		restrictedUse: Joi.boolean().required(),
		epaRegistration: Joi.string().min(1).max(50).optional(),
		company: Joi.string().min(1).max(50).optional(),
		inventoryUnit: productUnitSchema.required(),
		appliedUnits: productUnitSchema.required(),
		perAcreRate: Joi.number().positive().precision(2).optional(),
		density: Joi.string().min(1).max(50).optional(),
		treatAsLiquid: Joi.boolean().required(),
		canadSalesTax: Joi.number().positive().precision(2).optional(),
		primaryNutrient: Joi.string().min(1).max(50).optional(),
		reentryInterval: Joi.number().integer().positive().optional(),
		nutrients: Joi.object().optional(),
		jobPricePerMonth: Joi.object().required(),
		ticketPricePerMonth: Joi.object().required(),
		jobPrice: Joi.number().positive().precision(2).required(),
		ticketPrice: Joi.number().positive().precision(2).required(),
		personalProtectiveEquipment: Joi.string().allow('').max(300).optional(),
		preHarvestInterval: Joi.string().allow('').max(300).optional(),
		comments: Joi.string().allow('').max(300).optional(),
	}).required(),
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		productId: Joi.number().integer().positive().required(),
	}).required(),
});

const updateProductSchema: Schema = Joi.object({
	params: Joi.object({
		productId: Joi.number().integer().positive().required(),
	}).required(),
	body: Joi.object({
		baseProductName: Joi.string().min(1).max(50).optional(),
		productName: Joi.string().min(1).max(50).optional(),
		code: Joi.number().integer().positive().optional(),
		category: productCategorySchema.optional(),
		restrictedUse: Joi.boolean().optional(),
		epaRegistration: Joi.string().min(1).max(50).optional(),
		company: Joi.string().min(1).max(50).optional(),
		inventoryUnit: productUnitSchema.optional(),
		appliedUnits: productUnitSchema.optional(),
		perAcreRate: Joi.number().positive().precision(2).optional(),
		density: Joi.string().min(1).max(50).optional(),
		treatAsLiquid: Joi.boolean().optional(),
		canadSalesTax: Joi.number().positive().precision(2).optional(),
		primaryNutrient: Joi.string().min(1).max(50).optional(),
		reentryInterval: Joi.number().integer().positive().optional(),
		nutrients: Joi.object().optional(),
		jobPricePerMonth: Joi.object().optional(),
		ticketPricePerMonth: Joi.object().optional(),
		jobPrice: Joi.number().positive().precision(2).optional(),
		ticketPrice: Joi.number().positive().precision(2).optional(),
		personalProtectiveEquipment: Joi.string().min(1).max(300).optional(),
		preHarvestInterval: Joi.string().min(1).max(300).optional(),
		comments: Joi.string().min(1).max(300).optional(),
	}).required(),
});
export default { productSchema, paramsSchema, updateProductSchema };
