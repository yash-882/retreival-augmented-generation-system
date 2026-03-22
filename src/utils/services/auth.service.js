import bcrypt from 'bcrypt';
import {randomInt} from 'crypto';
import opError from '../classes/opError.class.js';

// generates bcrypt hash
export const generateBcryptHash = async (text, saltRounds = 10) => {
    return await bcrypt.hash(text, saltRounds);
}

// compares bcrypt hash with plain text, throws error if result is invalid
export const compareBcryptHash = async (text, hash, message = 'Invalid credentials') => {
    const isValid = await bcrypt.compare(text, hash);

    if(!isValid){
        throw new opError(message, 401)
    }

    return isValid;
}

// generates random numbers based on length 
export const generateRandomInt = (length=4) => {
    return randomInt(10 ** (length - 1), 10 ** length);

}