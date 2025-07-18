import { Router } from 'express';
import { register, login, logout, getMe, forgotPassword, changePassword, resetPassword } from '../controllers/authController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', auth, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/change-password', changePassword);
router.post('/reset-password', resetPassword);

export default router; 