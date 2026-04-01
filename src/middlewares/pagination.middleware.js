/**
 * Middleware to handle pagination logic.
 * Extracts page and limit from query parameters and calculates skip.
 */
export const paginate = (defaultLimit = 10) => {
    return (req, res, next) => {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || defaultLimit);
        const skip = (page - 1) * limit;

        req.pagination = {
            page,
            limit,
            skip
        };

        next();
    };
};