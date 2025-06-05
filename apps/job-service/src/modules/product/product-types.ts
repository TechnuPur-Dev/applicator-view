/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProductCategory, ProductUnit } from '@prisma/client';

interface CreateProduct {
	productName: string; // Specific product name
	baseProductName: string; // Main product category (min/max length can be enforced in validation)
	productType: string; // Product Type
	productCategory: string; // Product Category
	epaRegistration?: string; // Optional regulatory product number
	perAcreRate?: number; // Optional float for application rate per acre
	restrictedUse: boolean; // Boolean flag
	// Deprecated Fields
	code?: number; // Optional numeric code
	category: ProductCategory; // Enum or string for product category
	company?: string; // Optional manufacturer name
	inventoryUnit: ProductUnit; // Enum or string for inventory unit
	appliedUnits: ProductUnit; // Enum or string for applied units
	density?: string; // Optional density description
	treatAsLiquid?: boolean; // Boolean flag, default false
	canadSalesTax?: number; // Optional float for sales tax
	primaryNutrient?: string; // Optional primary nutrient
	reentryInterval?: number; // Optional number for reentry time (in hours)

	nutrients?: Record<string, any>; // JSON object (key-value pairs)
	jobPricePerMonth?: Record<string, any>; // JSON object for monthly job prices
	ticketPricePerMonth?: Record<string, any>; // JSON object for monthly ticket prices

	// jobPrice?: number; // Float for job price
	// ticketPrice?: number; // Float for ticket price

	personalProtectiveEquipment?: string; // Optional PPE details
	preHarvestInterval?: string; // Optional pre-harvest interval
	comments?: string; // Optional comments
}

interface UpdateProduct {
	productName: string; // Specific product name
	baseProductName: string; // Main product category (min/max length can be enforced in validation)
	productType: string; // Product Type
	productCategory: string; // Product Category
	epaRegistration?: string; // Optional regulatory product number
	perAcreRate?: number; // Optional float for application rate per acre
	restrictedUse: boolean; // Boolean flag
	// Deprecated Fields
	code?: number; // Optional numeric code
	category?: ProductCategory; // Enum or string for product category
	company?: string; // Optional manufacturer name
	inventoryUnit?: ProductUnit; // Enum or string for inventory unit
	appliedUnits?: ProductUnit; // Enum or string for applied units
	density?: string; // Optional density description
	treatAsLiquid?: boolean; // Boolean flag, default false
	canadSalesTax?: number; // Optional float for sales tax
	primaryNutrient?: string; // Optional primary nutrient
	reentryInterval?: number; // Optional number for reentry time (in hours)

	nutrients?: Record<string, any>; // JSON object (key-value pairs)
	jobPricePerMonth?: Record<string, any>; // JSON object for monthly job prices
	ticketPricePerMonth?: Record<string, any>; // JSON object for monthly ticket prices

	// jobPrice?: number; // Float for job price
	// ticketPrice?: number; // Float for ticket price

	personalProtectiveEquipment?: string; // Optional PPE details
	preHarvestInterval?: string; // Optional pre-harvest interval
	comments?: string; // Optional comments
}

export { CreateProduct, UpdateProduct };
