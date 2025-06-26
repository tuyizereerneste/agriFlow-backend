import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../../config/db';

class QrCodeController {
  static async generateQrCode(req: Request, res: Response): Promise<void> {
    const { farmerId } = req.params;

    try {
        const farmer = await prisma.farmer.findUnique({
            where: { id: farmerId },
            select: {
                id: true,
                names: true,
                farmerNumber: true,
                phones: true,
                gender: true,
                dob: true,
            },
        });

        if (!farmer) {
            res.status(404).json({ error: "Farmer not found" });
            return;
        }

        const farmerData = {
            farmerId: farmer.id,
            names: farmer.names,
            farmerNumber: farmer.farmerNumber,
            phones: farmer.phones,
            gender: farmer.gender,
            dob: farmer.dob,
        };

        const farmerDataString = JSON.stringify(farmerData);

        const qrCodeDataURL = await QRCode.toDataURL(farmerDataString);

        res.status(200).json({ qrCode: qrCodeDataURL });
    } catch (error) {
        console.error("Error generating QR code:", error);
        res.status(500).json({ message: "Internal Server Error", error });
    }
}

  
}

export default QrCodeController;