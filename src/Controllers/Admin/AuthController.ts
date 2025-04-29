import { Request, Response } from 'express';
import { registerUserSchema } from '../../Validations/UserValidation';
import { loginUserSchema } from '../../Validations/UserValidation';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';


interface UserRequest extends Request {
    user?: {
        id: string;
    };
}

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
                        type: 'user',
                        role,
                    },
                });

                // Generate a JWT token
                const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET as string, {
                    expiresIn: '1h',
                });

                res.status(201).json({ message: 'User registered successfully', token, id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, type: newUser.type });
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
            // Fetch the user and include company info if they are a company
            const user = await prisma.user.findUnique({
                where: { email },
                include: {
                    company: true, // Will be null if not a company
                },
            });
    
            if (!user) {
                res.status(401).json({ message: 'Invalid email or password' });
                return;
            }
    
            // Compare the provided password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                res.status(401).json({ message: 'Invalid email or password' });
                return;
            }
    
            // Prepare token payload
            const payload: any = {
                id: user.id,
                type: user.type,
                role: user.role,
            };
    
            if (user.type === 'company' && user.company) {
                payload.companyId = user.company.id;
            }
    
            // Generate JWT token
            const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
                expiresIn: '23h',
            });
    
            // Send response
            res.status(200).json({
                message: 'User logged in successfully',
                token,
                id: user.id,
                name: user.name,
                email: user.email,
                type: user.type,
                role: user.role,
                company: user.company ?? null,
            });
    
            console.log('User logged in successfully');
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    

    static async UserProfile(req: UserRequest, res: Response): Promise<void> {
        try {
            const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            res.status(200).json({ message: 'User profile fetched successfully', user });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
            console.error(error);
        }
    }
    

}

export default AuthController;




