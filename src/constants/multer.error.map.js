const multerErrorMap = {
    LIMIT_FILE_SIZE: {
        statusCode: 400,
        message: () => `File size exceeds the limit of ${process.env.FILE_SIZE_LIMIT_MB} MB`
    },
    LIMIT_FILE_COUNT: {
        statusCode: 400,
        message: () => 'Too many files uploaded'
    },
    LIMIT_UNEXPECTED_FILE: {
        statusCode: 400,
        message: () => 'Unexpected file field'
    },
    LIMIT_PART_COUNT: {
        statusCode: 400,
        message: () => 'Too many parts in multipart request'
    },
    LIMIT_FIELD_KEY: {
        statusCode: 400,
        message: () => 'Field name is too long'
    },
    LIMIT_FIELD_VALUE: {
        statusCode: 400,
        message: () => 'Field value is too long'
    },
    LIMIT_FIELD_COUNT: {
        statusCode: 400,
        message: () => 'Too many non-file fields'
    }
}

export default multerErrorMap;