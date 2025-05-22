import Joi, { Schema } from 'joi';


const chemicalSchema: Schema = Joi.object({
  body: Joi.object({
    productName: Joi.string().max(255).required(),
    registrationNumber: Joi.string().max(100).required(),
    registrationType: Joi.string().allow(null, ''),
    companyNumber: Joi.string().allow(null, ''),
    companyName: Joi.string().allow(null, ''),
    firstRegistrationDate: Joi.date().iso().allow(null),
    status: Joi.string().allow(null, ''),
    statusDescription: Joi.string().allow(null, ''),
    statusGroup: Joi.string().allow(null, ''),
    statusDate: Joi.date().iso().allow(null),
    useType: Joi.string().allow(null, ''),
    signalWord: Joi.string().allow(null, ''),
    rupFlag: Joi.boolean().allow(null),
    rupReason: Joi.string().allow(null, ''),
    pesticideType: Joi.string().allow(null, ''),
    pesticideCategory: Joi.string().allow(null, ''),
    physicalForm: Joi.string().allow(null, ''),
    ais: Joi.string().allow(null, ''),
    pests: Joi.string().allow(null, ''),
    sites: Joi.string().allow(null, ''),
    team: Joi.string().allow(null, ''),
    pmEmail: Joi.string().email().allow(null, ''),
    ridpNumberSort: Joi.string().allow(null, ''),
    usePattern: Joi.string().allow(null, ''),
    transferHistory: Joi.string().allow(null, ''),
    abns: Joi.string().allow(null, ''),
    meTooFlag: Joi.boolean().allow(null),
    meTooRefs: Joi.string().allow(null, ''),
    maxLabelDate: Joi.date().iso().allow(null),
    labelDates: Joi.string().allow(null, ''),
    labelNames: Joi.string().allow(null, ''),
    // createdAt: Joi.date().iso().allow(null),
    // updatedAt: Joi.date().iso().allow(null),
    // deletedAt: Joi.date().iso().allow(null),
  }).required()
});

const paramsSchema: Schema = Joi.object({
	params: Joi.object({
		id: Joi.number().integer().positive(),
	})
		.or('id') // At least one must be present
		.required(),
});
const ChemicalUpdateSchema: Schema = Joi.object({
    params: Joi.object({
        id: Joi.number().integer().positive().required(), 
    }).required(),
    body: Joi.object({
    productName: Joi.string().max(255).required(),
    registrationNumber: Joi.string().max(100).required(),
    registrationType: Joi.string().allow(null, ''),
    companyNumber: Joi.string().allow(null, ''),
    companyName: Joi.string().allow(null, ''),
    firstRegistrationDate: Joi.date().iso().allow(null),
    status: Joi.string().allow(null, ''),
    statusDescription: Joi.string().allow(null, ''),
    statusGroup: Joi.string().allow(null, ''),
    statusDate: Joi.date().iso().allow(null),
    useType: Joi.string().allow(null, ''),
    signalWord: Joi.string().allow(null, ''),
    rupFlag: Joi.boolean().allow(null),
    rupReason: Joi.string().allow(null, ''),
    pesticideType: Joi.string().allow(null, ''),
    pesticideCategory: Joi.string().allow(null, ''),
    physicalForm: Joi.string().allow(null, ''),
    ais: Joi.string().allow(null, ''),
    pests: Joi.string().allow(null, ''),
    sites: Joi.string().allow(null, ''),
    team: Joi.string().allow(null, ''),
    pmEmail: Joi.string().email().allow(null, ''),
    ridpNumberSort: Joi.string().allow(null, ''),
    usePattern: Joi.string().allow(null, ''),
    transferHistory: Joi.string().allow(null, ''),
    abns: Joi.string().allow(null, ''),
    meTooFlag: Joi.boolean().allow(null),
    meTooRefs: Joi.string().allow(null, ''),
    maxLabelDate: Joi.date().iso().allow(null),
    labelDates: Joi.string().allow(null, ''),
    labelNames: Joi.string().allow(null, ''),
    // createdAt: Joi.date().iso().allow(null),
    // updatedAt: Joi.date().iso().allow(null),
    // deletedAt: Joi.date().iso().allow(null),
  }).required()
})

export default {
	paramsSchema,
	ChemicalUpdateSchema,
	chemicalSchema
};
