import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../../config/db';

class QrCodeController {
    static async generateQrCode(req: Request, res: Response): Promise<void> {
        const { farmerId } = req.params;
        try {
            // Fetch the farmer's QR code data
            const farmer = await prisma.farmer.findUnique({
                where: { id: farmerId },
                select: { qrCode: true },
            });
    
            if (!farmer) {
                res.status(404).json({ error: "Farmer not found" });
                return;
            }
    
            // Generate the QR code
            const qrCodeDataURL = await QRCode.toDataURL(farmer.qrCode);
    
            // Send the QR code as a response
            res.status(200).json({ qrCode: qrCodeDataURL });
        } catch (error) {
            console.error("Error generating QR code:", error);
            res.status(500).json({ message: "Internal Server Error", error });
        }
    }

    // Inside your FarmerController or router
static async getFarmerByQrCode(req: Request, res: Response): Promise<void> {
    const { qrCode } = req.params;
  
    try {
      const farmer = await prisma.farmer.findFirst({
        where: { qrCode }, // This assumes qrCode is stored as a unique or searchable field
        select: { id: true, names: true }, // Return any other fields you need
      });
  
      if (!farmer) {
        res.status(404).json({ error: "Farmer not found" });
        return;
      }
  
      res.status(200).json({ farmer });
    } catch (error) {
      console.error("Error fetching farmer by QR code:", error);
      res.status(500).json({ message: "Internal Server Error", error });
    }
  }
  
}

export default QrCodeController;