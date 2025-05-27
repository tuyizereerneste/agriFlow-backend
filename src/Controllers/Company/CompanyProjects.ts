import { Request, Response } from 'express';


interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}
import { prisma } from '../../config/db';

class CompanyProjectsController {
  /**
   * Retrieves all projects for a company.
   * @param req - The request object containing user information.
   * @param res - The response object to send the result.
   */
  static async getCompanyProjects(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
  
    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }
  
    console.log("Fetching projects for userId:", userId);
  
    try {
      const projects = await prisma.project.findMany({
        where: { ownerId: userId },
        include: {
          targetPractices: {
            include: {
              activities: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
  
      if (!projects || projects.length === 0) {
        res.status(404).json({ message: "No projects found for this user" });
        return;
      }
  
      res.status(200).json({ message: "Projects retrieved successfully", data: projects });
    } catch (error) {
      console.error("Error retrieving projects:", error);
      res.status(500).json({ message: "Error retrieving projects" });
    }
  }
  
}
export default CompanyProjectsController;