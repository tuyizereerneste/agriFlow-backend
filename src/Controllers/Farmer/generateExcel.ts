import ExcelJS from 'exceljs';
import { Response } from 'express';
import { prisma } from '../../config/db';


class GenerateExcel {
    static formatDate(date: Date): string {
        const d = new Date(date);
        const month = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        const year = d.getFullYear();
        return `${year}-${month}-${day}`;
    }

    static async generateExcelExport(res: Response): Promise<void> {
        try {
            const farmers = await prisma.farmer.findMany({
                include: {
                    partner: true,
                    children: true,
                    lands: true,
                },
            });
    
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Farmers');
    
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 12 },
                { header: 'Names', key: 'names', width: 25 },
                { header: 'Province', key: 'province', width: 20 },
                { header: 'District', key: 'district', width: 20 },
                { header: 'Sector', key: 'sector', width: 20 },
                { header: 'Cell', key: 'cell', width: 15 },
                { header: 'Village', key: 'village', width: 20 },
                { header: 'Phones', key: 'phones', width: 25 },
                { header: 'Date of Birth', key: 'dob', width: 18 },
                { header: 'Gender', key: 'gender', width: 12 },
                { header: 'Partner Name', key: 'partnerName', width: 25 },
                { header: 'Partner Phones', key: 'partnerPhones', width: 25 },
                { header: 'Partner Date of Birth', key: 'partnerDob', width: 18 },
                { header: 'Partner Gender', key: 'partnerGender', width: 15 },
                { header: 'Child Name', key: 'childName', width: 30 },
                { header: 'Child Date of Birth', key: 'childDob', width: 18 },
                { header: 'Child Gender', key: 'childGender', width: 15 },
                { header: 'Land Size (m²)', key: 'landSize', width: 15 },
                { header: 'Land Latitude', key: 'landLatitude', width: 15 },
                { header: 'Land Longitude', key: 'landLongitude', width: 15 },
                { header: 'Land Ownership', key: 'landOwnership', width: 15 },
                { header: 'Land Crops', key: 'landCrops', width: 30 },
                { header: 'Land Nearby', key: 'landNearby', width: 25 }
            ];
    
            farmers.forEach((farmer) => {
                const partnerName = farmer.partner?.name || 'N/A';
                const partnerPhones = farmer.partner?.phones.join(', ') || 'N/A';
                const partnerDob = farmer.partner?.dob ? GenerateExcel.formatDate(farmer.partner.dob) : 'N/A';
                const partnerGender = farmer.partner?.gender || 'N/A';
    
                const children = farmer.children || [];
                const lands = farmer.lands || [];
    
                const maxRows = Math.max(children.length, lands.length, 1);
    
                for (let i = 0; i < maxRows; i++) {
                    const child = children[i] || { name: '', dob: '', gender: '' };
                    const land = lands[i] || { size: '', latitude: '', longitude: '', ownership: '', crops: [], nearby: [] };
    
                    worksheet.addRow({
                        id: i === 0 ? farmer.id : '',
                        names: i === 0 ? farmer.names : '',
                        province: i === 0 ? farmer.province : '',
                        district: i === 0 ? farmer.district : '',
                        sector: i === 0 ? farmer.sector : '',
                        cell: i === 0 ? farmer.cell : '',
                        village: i === 0 ? farmer.village : '',
                        phones: i === 0 ? farmer.phones.join(', ') : '',
                        dob: i === 0 ? GenerateExcel.formatDate(farmer.dob) : '',
                        gender: i === 0 ? farmer.gender : '',
                        partnerName: i === 0 ? partnerName : '',
                        partnerPhones: i === 0 ? partnerPhones : '',
                        partnerDob: i === 0 ? partnerDob : '',
                        partnerGender: i === 0 ? partnerGender : '',
                        childName: child.name || '',
                        childDob: child.dob ? GenerateExcel.formatDate(child.dob) : '',
                        childGender: child.gender || '',
                        landSize: land.size || '',
                        landLatitude: land.latitude || '',
                        landLongitude: land.longitude || '',
                        landOwnership: land.ownership || '',
                        landCrops: land.crops.length ? land.crops.join(', ') : '',
                        landNearby: land.nearby.length ? land.nearby.join(', ') : ''
                    });
                }
            });
    
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=farmers.xlsx');
    
            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Error generating Excel file:', error);
            res.status(500).send('Internal Server Error');
        }
    }
    
}

export default GenerateExcel;