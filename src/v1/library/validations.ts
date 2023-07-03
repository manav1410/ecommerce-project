import Joi from "joi";
import { functions } from "../library/functions";


/**
 * Validate requet object with schema validation
 * @param req req object
 * @param res res object
 * @param next next object to move on next function
 * @param schema schema validation e.g:-
 * const schema = Joi.object({
        doctor_name: Joi.string().trim().replace(/'/g, "").required()
    });
    Ref.: https://joi.dev/api/?v=17.3.0
 */
export function validateRequest(req: any, res: any, next: any, schema: any) {
    const options = {
        abortEarly: true, // include all errors
        allowUnknown: true, // ignore unknown props
        stripUnknown: false // remove unknown props
    };

    const { error, value } = schema.validate(req.body, options);
    if (error) {
        let functionsObj = new functions();
        res.send(functionsObj.output(0, error.message));
        return false;
        // next(`Validation error: ${error.details.map(x => x.message).join(', ')}`);
    } else {
        req.body = value;
        next();
    }
}

/**
 * Check whether mobile is valid or not
 * @param mobile mobile - string
 */
    // isMobileValid(mobile: string) {
    //     let regex = /^[0-9]{10}$/;

    //     regex.test(mobile);
    // }

