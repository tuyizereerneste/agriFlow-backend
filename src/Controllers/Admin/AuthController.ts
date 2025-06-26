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
                const existingUser = await prisma.user.findUnique({ where: { email } });
                if (existingUser) {
                    res.status(400).json({ message: 'User already exists' });
                }

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const newUser = await prisma.user.create({
                    data: {
                        name,
                        email,
                        password: hashedPassword,
                        type: 'user',
                        role,
                    },
                });

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
            const user = await prisma.user.findUnique({
                where: { email },
                include: {
                    company: true,
                },
            });
    
            if (!user) {
                res.status(401).json({ message: 'Invalid email or password' });
                return;
            }
    
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                res.status(401).json({ message: 'Invalid email or password' });
                return;
            }
    
            const payload: any = {
                id: user.id,
                type: user.type,
                role: user.role,
            };
    
            if (user.type === 'company' && user.company) {
                payload.companyId = user.company.id;
            }
    
            const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
                expiresIn: '23h',
            });
    
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
        const userId = req.user?.id;
      
        if (!userId) {
          res.status(401).json({ message: 'Unauthorized' });
          return;
        }
      
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
              company: {
                include: {
                  location: true,
                },
              },
            },
          });
      
          if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
          }
      
          res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            type: user.type,
            role: user.role,
            company: user.company
              ? {
                  id: user.company.id,
                  logo: user.company.logo,
                  tin: user.company.tin,
                  location: user.company.location.map((loc) => ({
                    province: loc.province,
                    district: loc.district,
                    sector: loc.sector,
                    cell: loc.cell,
                    village: loc.village,
                  })),
                }
              : null,
          });
        } catch (error) {
          console.error('Profile retrieval error:', error);
          res.status(500).json({ message: 'Server error' });
        }
      }
      
      

    static async PasswordChange(req: UserRequest, res: Response): Promise<void> {
        const userId = req.user?.id;
        const { oldPassword, newPassword } = req.body;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });

            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
            if (!isOldPasswordValid) {
                res.status(400).json({ message: 'Old password is incorrect' });
                return;
            }

            const salt = await bcrypt.genSalt(10);
            const hashedNewPassword = await bcrypt.hash(newPassword, salt);

            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedNewPassword },
            });

            res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    

}

export default AuthController;




