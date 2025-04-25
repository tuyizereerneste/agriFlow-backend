import { Request, Response } from "express";
import { prisma } from "../../../config/db";

class ProjectSearchController {
  /**
   * Search for projects based on date range and target practice.
   * @param req - Express request object
   * @param res - Express response object
   */

  static async searchProjects(req: Request, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        targetPractice,
        query,
        page = "1",
        limit = "10",
      } = req.query;
  
      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);
  
      if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
        res.status(400).json({ message: "Invalid page or limit values" });
      }
  
      const skip = (pageNumber - 1) * limitNumber;
  
      const filters: any = {};
  
      // Date filters
      if (startDate || endDate) {
        filters.AND = [];
  
        if (startDate) {
          filters.AND.push({
            startDate: { gte: new Date(startDate as string) },
          });
        }
  
        if (endDate) {
          filters.AND.push({
            endDate: { lte: new Date(endDate as string) },
          });
        }
      }
  
      // Text query across multiple fields
      if (query) {
        const q = query as string;
        filters.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { owner: { contains: q, mode: "insensitive" } },
          { objectives: { contains: q, mode: "insensitive" } },
        ];
      }
  
      // Target practice filter
      if (targetPractice) {
        filters.targetPractices = {
          some: {
            title: {
              contains: targetPractice as string,
              mode: "insensitive",
            },
          },
        };
      }
  
      // Total count for pagination
      const total = await prisma.project.count({ where: filters });
  
      const projects = await prisma.project.findMany({
        where: filters,
        skip,
        take: limitNumber,
        orderBy: {
          createdAt: "desc",
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
        data: projects,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      });
    } catch (error) {
      console.error("Error searching projects:", error);
      res.status(500).json({ message: "Error searching projects", error });
    }
  }
  
  
}

export default ProjectSearchController;