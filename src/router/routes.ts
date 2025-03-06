import { Router } from 'express';
import AuthController from '../Controllers/Admin/AuthController';

const router = Router();

router.post('/auth/register', AuthController.UserRegister);
router.post('/auth/login', AuthController.UserLogin);

export default router;