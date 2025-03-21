import { Router } from 'express';
import AuthController from '../Controllers/Admin/AuthController';
import FarmerController from '../Controllers/Farmer/FarmerController';
import { verifyToken } from '../Middleware/Verify';
import { authorizeRole } from '../Middleware/Verify';
import SearchController from '../Controllers/Farmer/SearchController';
import GenerateExcel from '../Controllers/Farmer/generateExcel';

const router = Router();

router.post('/auth/register', AuthController.UserRegister);
router.post('/auth/login', AuthController.UserLogin);

router.post('/farmer/create-farmer', verifyToken, authorizeRole('Admin'), FarmerController.createFarmer);
router.get('/farmer/all-farmers', verifyToken, authorizeRole('Admin'), FarmerController.getAllFarmers);
router.get('/farmer/get-farmer/:id', verifyToken, authorizeRole('Admin'), FarmerController.getFarmerById);
router.put('/farmer/update-farmer/:farmerId', verifyToken, authorizeRole('Admin'), FarmerController.updateFarmer);
router.delete('/farmer/delete-farmer/:farmerId', verifyToken, authorizeRole('Admin'), FarmerController.deleteFarmer);

router.get('/search', verifyToken, authorizeRole('Admin'), SearchController.searchFarmersAndLands);

router.get("/farmers/export-excel", async (req, res) => {
    await GenerateExcel.generateExcelExport(res);
});

export default router;