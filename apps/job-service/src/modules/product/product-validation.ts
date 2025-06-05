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
		productName: Joi.string().min(1).max(600).required(), //Name
		baseProductName: Joi.string().min(1).max(600).optional(), // Tag
		productType: Joi.string().min(1).max(600).optional(), // Type
		productCategory: Joi.string().min(1).max(600).optional(), // Category
		epaRegistration: Joi.string().min(1).max(50).optional(), // Code
		perAcreRate: Joi.number().positive().precision(2).optional(),
		restrictedUse: Joi.boolean().optional(),
		//Deprecated Fields
		code: Joi.number().integer().positive().optional(),
		category: productCategorySchema.optional(),
		company: Joi.string().min(1).max(50).optional(),
		inventoryUnit: productUnitSchema.optional(),
		appliedUnits: productUnitSchema.optional(),
		density: Joi.string().min(1).max(50).optional(),
		treatAsLiquid: Joi.boolean().optional(),
		canadSalesTax: Joi.number().positive().precision(2).optional(),
		primaryNutrient: Joi.string().min(1).max(50).optional(),
		reentryInterval: Joi.number().integer().positive().optional(),
		nutrients: Joi.object().optional(),
		jobPricePerMonth: Joi.object().optional(),
		ticketPricePerMonth: Joi.object().optional(),
		// jobPrice: Joi.number().positive().precision(2).required(),
		// ticketPrice: Joi.number().positive().precision(2).required(),
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
		productName: Joi.string().min(1).max(600).required(), //Name
		baseProductName: Joi.string().min(1).max(600).optional(), // Tag
		productType: Joi.string().min(1).max(600).optional(), // Type
		productCategory: Joi.string().min(1).max(600).optional(), // Category
		epaRegistration: Joi.string().min(1).max(50).optional(), // Code
		perAcreRate: Joi.number().positive().precision(2).optional(),
		restrictedUse: Joi.boolean().optional(),
		//Deprecated Fields
		code: Joi.number().integer().positive().optional(),
		category: productCategorySchema.optional(),
		company: Joi.string().min(1).max(50).optional(),
		inventoryUnit: productUnitSchema.optional(),
		appliedUnits: productUnitSchema.optional(),
		density: Joi.string().min(1).max(50).optional(),
		treatAsLiquid: Joi.boolean().optional(),
		canadSalesTax: Joi.number().positive().precision(2).optional(),
		primaryNutrient: Joi.string().min(1).max(50).optional(),
		reentryInterval: Joi.number().integer().positive().optional(),
		nutrients: Joi.object().optional(),
		jobPricePerMonth: Joi.object().optional(),
		ticketPricePerMonth: Joi.object().optional(),
		// jobPrice: Joi.number().positive().precision(2).optional(),
		// ticketPrice: Joi.number().positive().precision(2).optional(),
		personalProtectiveEquipment: Joi.string().allow('').max(300).optional(),
		preHarvestInterval: Joi.string().allow('').max(300).optional(),
		comments: Joi.string().allow('').max(300).optional(),
	}).required(),
});
export default { productSchema, paramsSchema, updateProductSchema };
