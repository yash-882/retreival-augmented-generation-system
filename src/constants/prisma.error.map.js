const prismaErrorMap = {
    P2002: {
        statusCode: 400,
        message: (err) => `Duplicate value for field: ${err.meta?.target?.join(', ')}`
    },
    P2003: {
        statusCode: 400,
        message: () => 'Invalid reference: related record not found'
    },
    P2025: {
        statusCode: 404,
        message: () => 'Record not found'
    },
    P2000: {
        statusCode: 400,
        message: () => 'Input value is too long'
    },
    P2021: {
        statusCode: 500,
        message: () => 'Database table does not exist'
    },
    P2022: {
        statusCode: 500,
        message: () => 'Database column does not exist'
    },
    P2007: {
        statusCode: 400,
        message: () => 'Invalid data format provided'
    }
}

export default prismaErrorMap;