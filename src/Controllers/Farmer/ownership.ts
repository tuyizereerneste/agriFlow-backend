import { Request, Response } from 'express';
import { PrismaClient, Ownership, NearbyType } from '@prisma/client';

const prisma = new PrismaClient();

class OwnershipController {
    static async getFarmersByFilters(req: Request, res: Response): Promise<void> {
        try {
          const { page = 1, limit = 10, ownership, nearby, minSize, maxSize, crops } = req.query;
      
          console.log("Query Parameters:", { page, limit, ownership, nearby, minSize, maxSize, crops });
      
          const pageNumber = Number(page);
          const limitNumber = Number(limit);
      
          if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
            res.status(400).json({ message: "Invalid page or limit values" });
          }
      
          const skip = (pageNumber - 1) * limitNumber;
      
          const landFilters: any = {};
      
          if (ownership) {
            landFilters.ownership = ownership as Ownership;
          }
      
          if (nearby) {
            landFilters.nearby = { has: nearby as NearbyType };
          }
      
          if (minSize !== undefined || maxSize !== undefined) {
            landFilters.size = {};
            if (minSize !== undefined) {
              landFilters.size.gte = Number(minSize);
            }
            if (maxSize !== undefined) {
              landFilters.size.lte = Number(maxSize);
            }
          }
      
          if (crops) {
            landFilters.crops = { has: crops as string };
          }
      
          console.log("Constructed Filters:", landFilters);
      
          const farmers = await prisma.farmer.findMany({
            skip,
            take: limitNumber,
            where: {
              lands: {
                some: landFilters,
              },
            },
            include: {
              partner: {
                select: {
                  name: true,
                },
              },
              children: {
                select: {
                  name: true,
                },
              },
              lands: {
                where: landFilters,
              },
            },
          });
      
          // Get total count for pagination
          const totalFarmers = await prisma.farmer.count({
            where: {
              lands: {
                some: landFilters,
              },
            },
          });
      
          console.log("Total Farmers:", totalFarmers);
      
          res.status(200).json({
            data: farmers,
            pagination: {
              total: totalFarmers,
              page: pageNumber,
              limit: limitNumber,
              totalPages: Math.ceil(totalFarmers / limitNumber),
            },
          });
        } catch (error) {
          console.error("Error fetching farmers:", error);
          res.status(500).json({ message: "Error fetching farmers", error });
        }
      }
}
export default OwnershipController;