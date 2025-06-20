import { Request, Response } from 'express';
import { registerUserSchema } from '../../Validations/UserValidation';
import { loginUserSchema } from '../../Validations/UserValidation';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';

interface Location {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  }

class VolunteerController {
  static async createVolunteer(req: Request, res: Response): Promise<void> {
    const { name, email, password, locations } = req.body;

    // Log the request body to ensure it contains the expected data
    console.log('Request body:', req.body);

    // Validate required fields
    if (!email) {
        res.status(400).json({ message: 'Email is required' });
        return;
    }

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Parse locations
        const locationsArray: Location[] = typeof locations === 'string' ? JSON.parse(locations) : locations || [];

        // Create user and locations in a transaction
        const { user, createdLocations } = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    type: 'user',
                    role: 'Volunteer',
                },
            });

            const createdLocations = await Promise.all(
                locationsArray.map((loc) =>
                    tx.location.create({
                        data: {
                            province: loc.province,
                            district: loc.district,
                            sector: loc.sector,
                            cell: loc.cell,
                            village: loc.village,
                            userId: user.id,
                        },
                    })
                )
            );

            return { user, createdLocations };
        });

        // Generate token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
            expiresIn: '1h',
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                type: user.type,
                locations: createdLocations,
            },
        });
    } catch (error) {
        console.error('Error creating volunteer:', error);
        res.status(500).json({ message: 'Failed to create volunteer' });
    }
}


    static async getAllVolunteers(req: Request, res: Response): Promise<void> {
        try {
            const volunteers = await prisma.user.findMany({
                where: { role: 'Volunteer' },
                include: {
                    location: true,
                },
            });
    
            res.status(200).json(volunteers);
        } catch (error) {
            console.error('Error fetching volunteers:', error);
            res.status(500).json({ message: 'Failed to retrieve volunteers' });
        }
    }
    
    static async getVolunteerById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
    
        try {
            const volunteer = await prisma.user.findUnique({
                where: { id },
                include: {
                    location: true,
                },
            });
    
            if (!volunteer || volunteer.role !== 'Volunteer') {
                res.status(404).json({ message: 'Volunteer not found' });
                return;
            }
    
            res.status(200).json(volunteer);
        } catch (error) {
            console.error('Error fetching volunteer:', error);
            res.status(500).json({ message: 'Failed to retrieve volunteer' });
        }
    }
    
    static async deleteVolunteer(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
    
        try {
            const existingUser = await prisma.user.findUnique({ where: { id } });
    
            if (!existingUser || existingUser.role !== 'Volunteer') {
                res.status(404).json({ message: 'Volunteer not found' });
                return;
            }
    
            await prisma.$transaction([
                prisma.location.deleteMany({ where: { userId: id } }),
                prisma.user.delete({ where: { id } }),
            ]);
    
            res.status(200).json({ message: 'Volunteer deleted successfully' });
        } catch (error) {
            console.error('Error deleting volunteer:', error);
            res.status(500).json({ message: 'Failed to delete volunteer' });
        }
    }

    static async updateVolunteer(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const { name, email, password, locations } = req.body;

        try {
            const existingUser = await prisma.user.findUnique({ where: { id } });

            if (!existingUser || existingUser.role !== 'Volunteer') {
                res.status(404).json({ message: 'Volunteer not found' });
                return;
            }

            // Update user data
            const updatedData: any = {};
            if (name) updatedData.name = name;
            if (email) updatedData.email = email;

            const updatedUser = await prisma.user.update({
                where: { id },
                data: updatedData,
            });

            // Update locations
            if (locations) {
                const locationsArray: Location[] = typeof locations === 'string' ? JSON.parse(locations) : locations || [];
                
                // Delete existing locations
                await prisma.location.deleteMany({ where: { userId: id } });

                // Create new locations
                await Promise.all(
                    locationsArray.map((loc) =>
                        prisma.location.create({
                            data: {
                                province: loc.province,
                                district: loc.district,
                                sector: loc.sector,
                                cell: loc.cell,
                                village: loc.village,
                                userId: id,
                            },
                        })
                    )
                );
            }

            res.status(200).json({
                message: 'Volunteer updated successfully',
                user: updatedUser,
            });
        } catch (error) {
            console.error('Error updating volunteer:', error);
            res.status(500).json({ message: 'Failed to update volunteer' });
        }
    }
}    
    
export default VolunteerController;
