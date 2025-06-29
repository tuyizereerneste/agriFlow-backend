import { Request, Response } from "express";
import { prisma } from "../../../config/db";


class EnrollmentController {
    static async enrollFarmerInProject(req: Request, res: Response): Promise<void> {
      try {
        const { farmerId, projectId, assignments } = req.body;
    
        if (!farmerId || !projectId || !Array.isArray(assignments)) {
          res.status(400).json({ message: "Missing or invalid data" });
          return;
        }

        const existingEnrollment = await prisma.projectEnrollment.findFirst({
          where: { farmerId, projectId },
        });
        if (existingEnrollment) {
          res.status(400).json({ message: "Farmer is already enrolled in this project." });
          return;
        }
        
    
        // Validate Farmer
        const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } });
        if (!farmer) {
          res.status(404).json({ message: "Farmer not found" });
          return;
        }
    
        // Validate Project
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          res.status(404).json({ message: "Project not found" });
          return;
        }
    
        // Validate all TargetPractices belong to the project
        const allTargetPracticeIds = assignments.map(a => a.targetPracticeId);
        const validTargetPractices = await prisma.targetPractice.findMany({
          where: {
            id: { in: allTargetPracticeIds },
            projectId,
          },
          select: { id: true },
        });
        const validPracticeIdSet = new Set(validTargetPractices.map(p => p.id));
    
        // Validate farmer's land ownership
        const farmerLandIds = await prisma.land.findMany({
          where: { farmerId },
          select: { id: true },
        });
        const validLandIdSet = new Set(farmerLandIds.map(l => l.id));
    
        for (const assignment of assignments) {
          if (!validPracticeIdSet.has(assignment.targetPracticeId)) {
            res.status(400).json({ message: `TargetPractice ${assignment.targetPracticeId} is invalid or not part of the project.` });
            return;
          }
    
          for (const landId of assignment.landIds) {
            if (!validLandIdSet.has(landId)) {
              res.status(400).json({ message: `Land ${landId} does not belong to the specified farmer.` });
              return;
            }
          }
        }
    
        // Create ProjectEnrollment
        const projectEnrollment = await prisma.projectEnrollment.create({
          data: {
            farmerId,
            projectId,
          },
        });
    
        // Link lands to target practices
        for (const assignment of assignments) {
          for (const landId of assignment.landIds) {
            await prisma.targetPracticeLand.create({
              data: {
                targetPracticeId: assignment.targetPracticeId,
                landId,
              },
            });
          }
        }
    
        res.status(201).json({
          message: "Farmer enrolled successfully with validated land assignments",
          enrollment: projectEnrollment,
        });
    
      } catch (error) {
        console.error("Enrollment error:", error);
        res.status(500).json({ message: "Failed to enroll farmer", error });
      }
}

static async getEnrollmentByPractice(req: Request, res: Response): Promise<void> {
  const { practiceId } = req.params;

  if (!practiceId) {
    res.status(400).json({ message: "Practice ID is required" });
    return;
  }

  try {
    const practice = await prisma.targetPractice.findUnique({
      where: { id: practiceId },
      select: {
        id: true,
        title: true,
        projectId: true,
        project: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!practice) {
      res.status(404).json({ message: "Practice not found" });
      return;
    }

    const enrollments = await prisma.projectEnrollment.findMany({
      where: { projectId: practice.projectId },
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
    });

    const farmers = enrollments
      .map((e) => e.farmer)
      .sort((a, b) => a.names.localeCompare(b.names));

    if (!farmers || farmers.length === 0) {
      res.status(404).json({ message: "No farmers found for this practice" });
      return;
    }

    res.status(200).json({
      message: "Farmers retrieved successfully",
      data: {
        projectTitle: practice.project.title,
        practiceTitle: practice.title,
        farmers,
      },
    });
  } catch (error) {
    console.error("Error retrieving farmers:", error);
    res.status(500).json({ message: "Error retrieving farmers", error });
  }
}



}

export default EnrollmentController;

