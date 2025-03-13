import { Request, Response } from "express";
import { PrismaClient, Ownership, NearbyType } from "@prisma/client";

const prisma = new PrismaClient();

class SearchController {
  static async searchFarmersAndLands(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        page = 1,
        limit = 10,
        ownership,
        crops,
        nearby,
        minSize,
        maxSize
      } = req.query;

      const searchTerm = query ? (query as string).toLowerCase() : null;

      const farmerWhere: any = {};
      const landWhere: any = {};

      if (searchTerm) {
        farmerWhere.OR = [
          { names: { contains: searchTerm, mode: "insensitive" } },
          { phones: { has: searchTerm } },
          { province: { contains: searchTerm, mode: "insensitive" } },
          { district: { contains: searchTerm, mode: "insensitive" } },
          { sector: { contains: searchTerm, mode: "insensitive" } },
          { cell: { contains: searchTerm, mode: "insensitive" } },
          { village: { contains: searchTerm, mode: "insensitive" } },
          { gender: { in: ['Male', 'Female'].filter(level => level.toLowerCase().includes(searchTerm)) } },
        ];
      }

      if (ownership) {
        landWhere.ownership = ownership as Ownership;
      }
      if (crops) {
        landWhere.crops = { hasSome: [crops as string] };
      }
      if (nearby) {
        landWhere.nearby = { hasSome: [nearby as string] };
      }

      if (minSize || maxSize) {
        landWhere.size = {};
        if (minSize) landWhere.size.gte = parseFloat(minSize as string);
        if (maxSize) landWhere.size.lte = parseFloat(maxSize as string);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const farmers = await prisma.farmer.findMany({
        where: farmerWhere,
        include: {
          lands: {
            where: landWhere,
          },
        },
        skip,
        take: Number(limit),
      });

      const filteredFarmers = farmers.filter(farmer => farmer.lands.length > 0);

      const totalFarmers = filteredFarmers.length;

      if (totalFarmers === 0) {
        res.status(404).json({ message: "No matching results found" });
        return;
      }

      res.status(200).json({
        message: "Farmers and lands fetched successfully",
        farmers: filteredFarmers,
        totalFarmers,
        currentPage: Number(page),
        totalPages: Math.ceil(totalFarmers / Number(limit)),
      });
    } catch (error) {
      console.error("Search farmers and lands error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
}

export default SearchController;