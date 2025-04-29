// controllers/ProjectController.ts
import { Request, Response } from "express";
import { prisma } from "../../../config/db";

class ProjectController {
  static async createProject(req: Request, res: Response): Promise<void> {
    const {title, description, userId, startDate, endDate, objectives, targetPractices} = req.body;
  
    if (!title || !userId || !startDate || !endDate || !targetPractices) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
  
    try {
      const result = await prisma.$transaction(async (tx) => {
        // ✅ Fetch the companyId from the selected user
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { company: true },
        });
  
        if (!user || user.type !== "company" || !user.company) {
          throw new Error("Selected user is not a valid company.");
        }
  
        // ✅ Use company.id as owner
        const project = await tx.project.create({
          data: {
            title,
            description,
            owner: user.company.id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            objectives,
          },
        });
  
        // ✅ Create target practices and activities (no extra validation added)
        for (const practice of targetPractices) {
          const createdPractice = await tx.targetPractice.create({
            data: {
              title: practice.title,
              initialSituation: practice.initialSituation,
              projectId: project.id,
            },
          });
  
          if (practice.activities && Array.isArray(practice.activities)) {
            for (const activity of practice.activities) {
              await tx.activity.create({
                data: {
                  title: activity.title,
                  description: activity.description,
                  startDate: new Date(activity.startDate),
                  endDate: new Date(activity.endDate),
                  targetPracticeId: createdPractice.id,
                },
              });
            }
          }
        }
  
        return project;
      });
  
      res.status(201).json({
        message: "Project with activities created successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error creating project with activities:", error);
      res.status(500).json({
        message: "Error creating project with activities",
        error: error instanceof Error ? error.message : error,
      });
    }
  }  
  
  

  static async getProjectById(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
  
    if (!projectId) {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }
  
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          farmers: {
            include: {
              farmer: {
                select: {
                  id: true,
                  names: true,
                  phones: true,
                  farmerNumber: true,
                  dob: true,
                  gender: true,
                  location: true,
                },
              },
            },
          },
          targetPractices: {
            include: {
              activities: true,
              lands: {
                include: {
                  land: {
                    include: {
                      locations: {
                        include: {
                          location: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      
  
      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }
  
      res.status(200).json({ message: "Project details retrieved", data: project });
    } catch (error) {
      console.error("Error fetching project details:", error);
      res.status(500).json({ message: "Error fetching project details", error });
    }
  }
  


  static async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = await prisma.project.findMany({
        include: {
          targetPractices: {
            include: {
              activities: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
  
      res.status(200).json({ message: "Projects retrieved successfully", data: projects });
    } catch (error) {
      console.error("Error retrieving projects:", error);
      res.status(500).json({ message: "Error retrieving projects", error });
    }
  }

  static async getProjectPractices(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;

    if (!projectId) {
      res.status(400).json({ message: "Project ID is required" });
      return;
    }

    try {
      const projectPractices = await prisma.targetPractice.findMany({
        where: { projectId },
        include: {
          activities: true,
        },
      });

      if (!projectPractices) {
        res.status(404).json({ message: "No practices found for this project" });
        return;
      }

      res.status(200).json({ message: "Project practices retrieved successfully", data: projectPractices });
    } catch (error) {
      console.error("Error retrieving project practices:", error);
      res.status(500).json({ message: "Error retrieving project practices", error });
    }
  }
  
  
  
}


export default ProjectController;