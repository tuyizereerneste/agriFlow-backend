import { Request, Response } from 'express';
import { registerUserSchema } from '../../Validations/UserValidation';
import { loginUserSchema } from '../../Validations/UserValidation';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';

class AuthController {
    static async UserRegister(req: Request, res: Response): Promise<void> {
        const { error } = registerUserSchema.validate(req.body);
            if (error) {
                res.status(400).json({ message: error.details[0].message });
            }

            const { name, email, password, role } = req.body;

            try {
                // Check if the user already exists
                const existingUser = await prisma.user.findUnique({ where: { email } });
                if (existingUser) {
                    res.status(400).json({ message: 'User already exists' });
                }

                // Hash the password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                // Create a new user
                const newUser = await prisma.user.create({
                    data: {
                        name,
                        email,
                        password: hashedPassword,
                        role,
                    },
                });

                // Generate a JWT token
                const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET as string, {
                    expiresIn: '1h',
                });

                res.status(201).json({ message: 'User registered successfully', token, id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
                console.log('User registered successfully');
            } catch (error) {
                res.status(500).json({ message: 'Server error' });
            }
    };

    static async UserLogin(req: Request, res: Response): Promise<void> {
        const { error } = loginUserSchema.validate(req.body);
        if (error) {
            res.status(400).json({ message: error.details[0].message });
            return;
        }
    
        const { email, password } = req.body;
    
        try {
            // Check if the user exists
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                res.status(401).json({ message: 'Invalid email or password' });
                return;
            }
    
            // Check if the password is correct
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                res.status(401).json({ message: 'Invalid email or password' });
            }
    
            // Generate a JWT token
            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
                expiresIn: '1h',
            });
    
            res.status(200).json({
                message: 'User logged in successfully',
                token,
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            });
            console.log('User logged in successfully');
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
            console.error(error);
        }
    }
    

}

export default AuthController;




