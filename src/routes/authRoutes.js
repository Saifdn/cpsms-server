import express from 'express';
import { registerGraduate, login, refreshToken, logout } from '../controllers/authController.js';

const router = express.Router();

router.post('/register/graduate', registerGraduate);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

export default router;