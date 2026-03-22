import { isRedisAlive, prismaClient as prisma } from '../server.js';
import opError from '../utils/classes/opError.class.js';
import sendEmail from '../utils/services/email.service.js';
import { compareBcryptHash, generateBcryptHash, generateRandomInt } from '../utils/services/auth.service.js';
import RedisService from '../utils/services/classes/redis.service.js';

// create user
export const initUserSignUp = async (req, res, next) => {

  const { name, email, password } = req.body;

  // generate 6 digits OTP
  const digits = 6;
  const otp = generateRandomInt(digits).toString();

  const redisService = new RedisService(email, 'SIGN_UP_OTP');

  // Store for sign-up verification with a TTL of 10 minutes
    await redisService.setShortLivedData({ 
      name, 
      hashedOtp: await generateBcryptHash(otp, 10),  
      password, 
      email: email,
    }, 600);


  // Send OTP to user's email
  await sendEmail(email, 'OTP for Registration', `Your OTP for completing the sign-up process is: ${otp}.`);

  res.status(201).json({
    status: 'success',
    message: 'OTP sent to your email. Please verify to complete registration.'
  });
}

export const completeUserSignUp = async (req, res, next) => {
  const { email, otp } = req.body;

  const redisService = new RedisService(email, 'SIGN_UP_OTP');

  const storedData = await redisService.getData();

  if (!storedData) {
    return next(new opError('OTP expired or invalid session. Please request a new OTP.', 400));
  }

  // Compare the provided OTP with the stored OTP, the util throws error if invalid
  await compareBcryptHash(otp, storedData.hashedOtp, 'Invalid OTP. Please try again.')

  // proceed to create the user
  const { name, email: storedEmail, password } = storedData;
  const hashedPassword = await generateBcryptHash(password, 12); // hashed password

  const newUser = await prisma.user.create({
    data: {
      name,
      email: storedEmail,
      password: hashedPassword,
    }
  });

  // Remove the OTP data from Redis after successful sign-up
  await redisService.deleteData();

  newUser.password = undefined; // remove password from the response

  res.status(201).json({
    status: 'success',
    message: 'User created successfully.',
    data: {
      user: newUser
    }
  });
}
