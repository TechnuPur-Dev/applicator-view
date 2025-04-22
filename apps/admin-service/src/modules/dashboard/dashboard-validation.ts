
import Joi, { Schema } from 'joi';
// import {
// 	userRoleSchema,
// } from '../../../../../shared/utils/joi-common-validations';


const paramsSchema: Schema = Joi.object({
    query: Joi.object({
        searchValue: Joi.string()
        .valid('ALL','APPLICATOR', 'GROWER', 'WORKER')
        .optional(), // Adjust roles as needed
    
    })
        // .or('id', 'growerId', 'applicatorId') // At least one must be present
        .optional(),
});


export default {
    paramsSchema,
    
};

