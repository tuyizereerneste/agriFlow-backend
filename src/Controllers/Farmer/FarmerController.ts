import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createFarmerSchema } from "../../Validations/FarmerValidation";
import { updateFarmerSchema } from "../../Validations/FarmerValidation";

const prisma = new PrismaClient();

interface ChildInput {
  id?: string;
  name: string;
  dob: string;
  gender: "Male" | "Female";
}

interface LandInput {
  id?: string;
  size: number;
  latitude: number;
  longitude: number;
  ownership: "Owned" | "Rented" | "Borrowed" | "Other";
  crops: string[];
  nearby: ("River" | "Road" | "Lake" | "Other")[];
  image?: string;
}

class FarmerController {
  static async createFarmer(req: Request, res: Response): Promise<void> {
    const { error } = createFarmerSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
    }

    try {
      const { farmer, partner, children, lands } = req.body;

      if (!farmer) {
        res.status(400).json({ error: "Farmer data is missing" });
      }

      // Transaction to ensure atomicity
      const createdFarmer = await prisma.$transaction(async (tx) => {
        const newFarmer = await tx.farmer.create({
          data: {
            names: farmer.names,
            province: farmer.province,
            district: farmer.district,
            sector: farmer.sector,
            cell: farmer.cell,
            village: farmer.village,
            phones: farmer.phones,
            dob: new Date(farmer.dob),
            gender: farmer.gender,
          },
        });

        // Create Partner
        if (partner) {
          await tx.partner.create({
            data: {
              name: partner.name,
              phones: partner.phones,
              dob: new Date(partner.dob),
              gender: partner.gender,
              farmerId: newFarmer.id,
            },
          });
        }

        if (children?.length) {
          await tx.child.createMany({
            data: children.map((child: ChildInput) => ({
              name: child.name,
              dob: new Date(child.dob),
              gender: child.gender,
              farmerId: newFarmer.id,
            })),
          });
        }

        if (lands?.length) {
          await tx.land.createMany({
            data: lands.map((land: LandInput) => ({
              size: land.size,
              latitude: land.latitude,
              longitude: land.longitude,
              ownership: land.ownership,
              crops: land.crops,
              nearby: land.nearby,
              image: land.image,
              farmerId: newFarmer.id,
            })),
          });
        }

        return newFarmer;
      });

      res.status(201).json({
        message: "Farmer created successfully",
        farmer: createdFarmer,
      });
    } catch (error) {
      console.error("Error creating farmer:", error);
      res.status(500).json({ message: "Internal Server Error", error });
    }
  }

  static async getAllFarmers(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10 } = req.query;
  
      const pageNumber = Number(page);
      const limitNumber = Number(limit);
  
      if (isNaN(pageNumber) || pageNumber < 1 || isNaN(limitNumber) || limitNumber < 1) {
        res.status(400).json({ message: "Invalid page or limit values" });
      }
  
      const skip = (pageNumber - 1) * limitNumber;
  
      const farmers = await prisma.farmer.findMany({
        skip,
        take: limitNumber,
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
          lands: true,
        },
      });
  
      // Get total count for pagination
      const totalFarmers = await prisma.farmer.count();
  
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
      res.status(500).json({ message: "Error fetching farmers", error});
    }
  };

  static async getFarmerById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const farmer = await prisma.farmer.findUnique({
        where: { id },
        include: {
          partner: true,
          children: true,
          lands: true,
        },
      });
  
      if (!farmer) {
        res.status(404).json({ message: "Farmer not found" });
      } else {
        res.status(200).json(farmer);
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching farmer", error });
    }
  }

  static async updateFarmer(req: Request, res: Response): Promise<void> {
    const { error } = updateFarmerSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }
  
    try {
      const { farmerId } = req.params;
      const { farmer, partner, children, lands } = req.body;
  
      if (!farmerId) {
        res.status(400).json({ error: "Farmer ID is missing" });
        return;
      }

      const farmerData: any = {};
      if (farmer) {
        if (farmer.names !== undefined) farmerData.names = farmer.names;
        if (farmer.province !== undefined) farmerData.province = farmer.province;
        if (farmer.district !== undefined) farmerData.district = farmer.district;
        if (farmer.sector !== undefined) farmerData.sector = farmer.sector;
        if (farmer.cell !== undefined) farmerData.cell = farmer.cell;
        if (farmer.village !== undefined) farmerData.village = farmer.village;
        if (farmer.phones !== undefined) farmerData.phones = farmer.phones;
        if (farmer.dob !== undefined) farmerData.dob = new Date(farmer.dob);
        if (farmer.gender !== undefined) farmerData.gender = farmer.gender;
      }
  
      const updatedFarmer = await prisma.farmer.update({
        where: { id: farmerId },
        data: farmerData,
      });
  
      console.log("Farmer updated:", updatedFarmer);
  
      // Update or Add Partner
      if (partner) {
        await prisma.partner.upsert({
          where: { farmerId: farmerId },
          update: {
            name: partner.name,
            phones: partner.phones,
            dob: new Date(partner.dob),
            gender: partner.gender,
          },
          create: {
            name: partner.name,
            phones: partner.phones,
            dob: new Date(partner.dob),
            gender: partner.gender,
            farmerId: farmerId,
          },
        });
      }
  
      // Update or Add Children (if any)
      if (children && children.length > 0) {
        for (const child of children) {
          if (child.id) {
            // Update existing child
            await prisma.child.update({
              where: { id: child.id },
              data: {
                name: child.name,
                dob: new Date(child.dob),
                gender: child.gender,
              },
            });
          } else {
            // Add new child
            await prisma.child.create({
              data: {
                name: child.name,
                dob: new Date(child.dob),
                gender: child.gender,
                farmerId: farmerId,
              },
            });
          }
        }
      }
  
      // Update or Add Land Entries (if any)
      if (lands && lands.length > 0) {
        for (const land of lands) {
          if (land.id) {
            // Update existing land
            await prisma.land.update({
              where: { id: land.id },
              data: {
                size: land.size,
                latitude: land.latitude,
                longitude: land.longitude,
                ownership: land.ownership,
                nearby: land.nearby,
                image: land.image,
              },
            });
          } else {
            // Add new land
            await prisma.land.create({
              data: {
                size: land.size,
                latitude: land.latitude,
                longitude: land.longitude,
                ownership: land.ownership,
                nearby: land.nearby,
                image: land.image,
                farmerId: farmerId,
              },
            });
          }
        }
      }
  
      res.status(200).json({
        message: "Farmer updated successfully",
        farmer: updatedFarmer,
      });
    } catch (error) {
      console.error("Error updating farmer:", error);
      res.status(500).json({ message: "Internal Server Error", error });
    }
  }
  
  static async deleteFarmer(req: Request, res: Response): Promise<void> {
    try {
      const { farmerId } = req.params;
  
      if (!farmerId) {
        res.status(400).json({ error: "Farmer ID is missing" });
        return;
      }
  
      const transaction = await prisma.$transaction(async (prisma) => {
        // Delete associated children
        await prisma.child.deleteMany({
          where: { farmerId: farmerId },
        });
  
        // Delete associated lands
        await prisma.land.deleteMany({
          where: { farmerId: farmerId },
        });
  
        // Delete associated partner
        await prisma.partner.deleteMany({
          where: { farmerId: farmerId },
        });
  
        // Delete the farmer
        await prisma.farmer.delete({
          where: { id: farmerId },
        });
      });
  
      console.log("Farmer and associated data deleted:", transaction);
  
      res.status(200).json({
        message: "Farmer and associated data deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting farmer:", error);
      res.status(500).json({ message: "Internal Server Error", error });
    }
  }
  
  
};

export default FarmerController;