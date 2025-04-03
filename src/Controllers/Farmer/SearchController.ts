import { Request, Response } from "express";
import { PrismaClient, Ownership, NearbyType } from "@prisma/client";

const prisma = new PrismaClient();

class SearchController {
  static async searchFarmers(req: Request, res: Response): Promise<void> {
    try {
        const {
            query, page = 1, limit = 10,
            ownership, crops, nearby, minSize, maxSize,
            province, district, sector, cell, village
        } = req.query;

        const searchTerm = query ? (query as string).toLowerCase() : null;
        const farmerWhere: any = {};
        const landWhere: any = {};
        // If a search query is provided, search across both Farmers and Locations
        if (searchTerm) {
            farmerWhere.OR = [
                { farmerNumber: { contains: searchTerm, mode: "insensitive" } },
                { names: { contains: searchTerm, mode: "insensitive" } },
                { phones: { has: searchTerm } },
                { gender: { in: ['Male', 'Female'].filter(g => g.toLowerCase().includes(searchTerm)) } },
                { location: { some: { province: { contains: searchTerm, mode: "insensitive" } } } },
                { location: { some: { district: { contains: searchTerm, mode: "insensitive" } } } },
                { location: { some: { sector: { contains: searchTerm, mode: "insensitive" } } } },
                { location: { some: { cell: { contains: searchTerm, mode: "insensitive" } } } },
                { location: { some: { village: { contains: searchTerm, mode: "insensitive" } } } }
            ];
        }
        

        let validOwnership: Ownership[] = [];
        if (ownership) {
          const ownershipArray = Array.isArray(ownership) ? ownership.map(o => o.toString().trim()) : [ownership.toString().trim()];
          const enumValues = Object.values(Ownership) as string[];
  
          validOwnership = ownershipArray.filter(o => enumValues.map(e => e.toLowerCase()).includes(o.toLowerCase())) as Ownership[];
  
          if (validOwnership.length > 0) {
            farmerWhere.lands = { some: { ownership: { in: validOwnership } } };
          }
        }
  
        let validNearby: NearbyType[] = [];
        if (nearby) {
          const nearbyArray = Array.isArray(nearby) ? nearby.map(n => n.toString().toLowerCase()) : [nearby.toString().toLowerCase()];
          validNearby = nearbyArray
            .map((n) => Object.values(NearbyType).find((type: string) => type.toLowerCase() === n))
            .filter((type): type is NearbyType => type !== undefined);
  
          if (validNearby.length > 0) {
            landWhere.nearby = { hasSome: validNearby };
          }
        }
  
        if (minSize || maxSize) {
          landWhere.size = {};
          if (minSize) landWhere.size.gte = parseFloat(minSize as string);
          if (maxSize) landWhere.size.lte = parseFloat(maxSize as string);
        }
  
        const pageNumber = isNaN(Number(page)) || Number(page) < 1 ? 1 : Number(page);
        const limitNumber = isNaN(Number(limit)) || Number(limit) < 1 ? 10 : Number(limit);
        const skip = (pageNumber - 1) * limitNumber;
  
        const allFilteredFarmers = await prisma.farmer.findMany({
          where: farmerWhere,
          include: { lands: { where: landWhere } },
        });
  
        let filteredFarmers = allFilteredFarmers;
        if (crops) {
          const cropsArray = Array.isArray(crops) ? crops.map(c => c.toString().toLowerCase()) : [crops.toString().toLowerCase()];
          filteredFarmers = allFilteredFarmers.filter(farmer =>
            farmer.lands.some(land =>
              land.crops.some(crop => cropsArray.includes(crop.toLowerCase()))
            )
          );
        }
  
        if (nearby || ownership) {
          filteredFarmers = filteredFarmers.filter(farmer =>
            farmer.lands.some(land => {
              const matchesNearby = !validNearby.length || validNearby.some(type => land.nearby.includes(type));
              const matchesOwnership = !validOwnership.length || validOwnership.includes(land.ownership);
              return matchesNearby && matchesOwnership;
            })
          );
        }
        const totalFarmers = filteredFarmers.length;
        const paginatedFarmers = filteredFarmers.slice(skip, skip + limitNumber);

        if (totalFarmers === 0) {
            res.status(404).json({ message: "No matching results found" });
            return;
        }

        res.status(200).json({
            message: "Farmers and lands fetched successfully",
            farmers: paginatedFarmers,
            totalFarmers,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalFarmers / limitNumber),
        });

    } catch (error) {
        console.error("Search farmers and lands error:", error);
        res.status(500).json({ message: "Server error" });
    }
}



}

export default SearchController;

