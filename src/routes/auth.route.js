import express from 'express';
import { completeUserSignUp, initUserSignUp } from '../controllers/auth.controller.js';
import { checkRequiredFields } from '../middlewares/checkRequiFields.middleware.js';
import { lowerCaseEmail, validateSignUpFields } from '../middlewares/auth.middleware.js';
import { checkRedisStatus } from '../middlewares/serviceCheck.middleware.js';

const router = express.Router();

// Route to initiate sign up and send OTP
router.post('/sign-up/init',
    checkRedisStatus(false), 
    checkRequiredFields([
        { name: 'email', type: 'email' },
        { name: 'password', type: 'string' }
    ]), 
    lowerCaseEmail, 
    validateSignUpFields, 
    initUserSignUp
);

// Route to verify OTP and complete registration
router.post('/sign-up/complete', 
    checkRedisStatus(false),
    checkRequiredFields([
        { name: 'email', type: 'string' },
        { name: 'otp', type: 'string' }
    ]), 
    lowerCaseEmail, 
    completeUserSignUp
);

export default router;
