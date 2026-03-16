import opError from "../utils/classes/opError.class.js";

export const checkRequiredFields = (fields = [], isFile = false) => {


    return (req, res, next) => {

        // for req.file
        if (isFile === true) {
            const errOrNull = !req.file ? new opError(`Missing required file, field name: ${fields[0]}`, 400) : null;
            return next(errOrNull)
        }

        // check for req.body
        const missingFields = fields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            const message = `Missing required fields: ${missingFields.join(', ')}`;
            return next(new opError(message, 400));
        }

        next();
    }

};
