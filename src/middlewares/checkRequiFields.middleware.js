import opError from "../utils/classes/opError.class.js";

export const checkRequiredFields = (fields = [], isFile = false) => {

    return (req, res, next) => {

        // for req.file
        if (isFile === true) {
            const errOrNull = !req.file ? new opError(`Missing required file, field name: ${fields[0]}`, 400) : null;
            return next(errOrNull);
        }

        // check for req.body
        for (const field of fields) {
            const { name, type } = field;
            const value = req.body[name];

            // presence check
            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                return next(new opError(`Missing required field: ${name}`, 400));
            }

            // type check
            if (type === 'string' && typeof value !== 'string') {
                return next(new opError(`Field '${name}' must be a string`, 400));
            }

            if (type === 'number' && isNaN(Number(value))) {
                return next(new opError(`Field '${name}' must be a number`, 400));
            }

            if (type === 'boolean' && value !== 'true' && value !== 'false' && typeof value !== 'boolean') {
                return next(new opError(`Field '${name}' must be a boolean`, 400));
            }

            if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return next(new opError(`Field '${name}' must be a valid email`, 400));
            }
        }

        next();
    }
};