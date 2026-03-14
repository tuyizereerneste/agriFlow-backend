import { Request, Response } from 'express';
import { registerUserSchema } from '../../Validations/UserValidation';
import { loginUserSchema } from '../../Validations/UserValidation';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';

interface AuthRequest extends Request {
    user?: {
        id: string;
    };
}

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

    if (!email) {
        res.status(400).json({ message: 'Email is required' });
        return;
    }

    try {
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
        const userId = id as string;
    
        try {
            const volunteer = await prisma.user.findUnique({
                where: { id: userId },
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
        const userId = id as string;
    
        try {
            const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    
            if (!existingUser || existingUser.role !== 'Volunteer') {
                res.status(404).json({ message: 'Volunteer not found' });
                return;
            }
    
            await prisma.$transaction([
                prisma.location.deleteMany({ where: { userId: existingUser.id } }),
                prisma.user.delete({ where: { id: existingUser.id } }),
            ]);
    
            res.status(200).json({ message: 'Volunteer deleted successfully' });
        } catch (error) {
            console.error('Error deleting volunteer:', error);
            res.status(500).json({ message: 'Failed to delete volunteer' });
        }
    }

    static async updateVolunteer(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const userId = id as string;
        const { name, email, password, locations } = req.body;

        try {
            const existingUser = await prisma.user.findUnique({ where: { id: userId } });

            if (!existingUser || existingUser.role !== 'Volunteer') {
                res.status(404).json({ message: 'Volunteer not found' });
                return;
            }

            const updatedData: any = {};
            if (name) updatedData.name = name;
            if (email) updatedData.email = email;

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: updatedData,
            });

            if (locations) {
                const locationsArray: Location[] = typeof locations === 'string' ? JSON.parse(locations) : locations || [];
                
                await prisma.location.deleteMany({ where: { userId: userId } });

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
                                userId: userId,
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

    static async searchVolunteers(req: Request, res: Response): Promise<void> {
        const { query } = req.query;

        try {
            const volunteers = await prisma.user.findMany({
                where: {
                    role: 'Volunteer',
                    OR: [
                        { name: { contains: query as string } },
                        { email: { contains: query as string } },
                    ],
                },
                include: {
                    location: true,
                },
            });

            res.status(200).json(volunteers);
        } catch (error) {
            console.error('Error searching volunteers:', error);
            res.status(500).json({ message: 'Failed to search volunteers' });
        }
    }

    static async assignVolunteerToProject(req: AuthRequest, res: Response): Promise<void> {
        const { volunteerId, projectId } = req.body;
      
        if (!volunteerId || !projectId) {
          res.status(400).json({ message: "Missing volunteerId or projectId" });
          return;
        }
      
        try {
          const assignment = await prisma.volunteerProjectAssignment.create({
            data: {
              volunteerId: volunteerId,
              projectId,
            },
          });
      
          res.status(201).json({
            message: "Volunteer successfully assigned to project ✅",
            data: assignment,
          });
        } catch (error) {
          console.error("Error assigning volunteer:", error);
          res.status(500).json({
            message: "Error assigning volunteer",
            error: error instanceof Error ? error.message : error,
          });
        }
      }

      static async getVolunteerProjects(req: AuthRequest, res: Response): Promise<void> {
        const { volunteerId } = req.params;
        const userId = volunteerId as string;
      
        if (!volunteerId) {
          res.status(400).json({ message: "Volunteer ID is required" });
          return;
        }
      
        try {
          const projects = await prisma.volunteerProjectAssignment.findMany({
            where: { volunteerId: userId },
            orderBy: { assignedAt: 'desc' },
            include: {
              project: true,
            },
          });
      
          res.status(200).json({ message: "Projects retrieved successfully", data: projects });
        } catch (error) {
          console.error("Error retrieving projects:", error);
          res.status(500).json({ message: "Error retrieving projects", error });
        }
      }

      static async getMyAssignedProjects(req: AuthRequest, res: Response): Promise<void> {
        const volunteerId = req.user?.id;

        if (!volunteerId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
            }
      
        try {
          // Get project IDs assigned to this volunteer
          const assignments = await prisma.volunteerProjectAssignment.findMany({
            where: { volunteerId },
            select: { projectId: true },
          });
      
          const assignedProjectIds = assignments.map((a) => a.projectId);
      
          if (assignedProjectIds.length === 0) {
            res.status(200).json({
              message: "No projects assigned to you.",
              data: [],
            });
            return;
          }
      
          // Get full project details including target practices and activities
          const projects = await prisma.project.findMany({
            where: {
              id: { in: assignedProjectIds },
            },
            include: {
              targetPractices: {
                include: {
                  activities: true,
                },
              },
            },
          });
      
          res.status(200).json({
            message: "Assigned projects retrieved successfully",
            data: projects,
          });
        } catch (error) {
          console.error("Error retrieving assigned projects", error);
          res.status(500).json({ message: "Error retrieving assigned projects", error });
        }
      }
      
}    
    
export default VolunteerController;
