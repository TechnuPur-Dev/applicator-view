import Joi, { Schema } from 'joi';
const paramsSchema: Schema = Joi.object({
    params: Joi.object({
        orgId:Joi.string(),
        farmId: Joi.string(),
        fieldId: Joi.string(),
        boundId: Joi.string()

    })
        .or('orgId', 'farmId', 'fieldId','boundId') // At least one must be present
        .required(),
});

export default{
    paramsSchema
}
