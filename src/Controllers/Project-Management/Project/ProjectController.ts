// controllers/ProjectController.ts
import { Request, Response } from "express";
import { prisma } from "../../../config/db";

class ProjectController {
  static async createProject(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        owner,
        startDate,
        endDate,
        objectives,
        targetPractices,
      } = req.body;

      if (!title || !owner || !startDate || !endDate || !targetPractices) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      const project = await prisma.project.create({
        data: {
          title,
          description,
          owner,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          objectives,
          targetPractices: {
            create: targetPractices.map((practice: any) => ({
              title: practice.title,
              initialSituation: practice.initialSituation,
            })),
          },
        },
        include: {
          targetPractices: true,
        },
      });

      res.status(201).json({ message: "Project created successfully", data: project });
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Error creating project", error });
    }
  }

  static async getProjectById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          targetPractices: true,
        },
      });

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      res.status(200).json({ data: project });
    } catch (error) {
      res.status(500).json({ message: "Error retrieving project", error });
    }
  }

  static async getProjectDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          farmers: {
            include: {
              farmer: {
                include: {
                  lands: true,
                },
              },
            },
          },
          targetPractices: {
            include: {
              activities: true,
              lands: {
                include: {
                  land: true,
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

      res.status(200).json({ data: project });
    } catch (error) {
      console.error("Error fetching project details:", error);
      res.status(500).json({ message: "Error fetching project details", error });
    }
  }
}


export default ProjectController;