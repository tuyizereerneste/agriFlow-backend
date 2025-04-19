import { Router } from 'express';
import AuthController from '../Controllers/Admin/AuthController';
import FarmerController from '../Controllers/Farmer/FarmerController';
import { verifyToken } from '../Middleware/Verify';
import { authorizeRole } from '../Middleware/Verify';
import SearchController from '../Controllers/Farmer/SearchController';
import QrCodeController from '../Controllers/Farmer/QrCodeController';
import GenerateExcel from '../Controllers/Farmer/generateExcel';
import ProjectController from '../Controllers/Project-Management/Project/ProjectController';
import EnrollmentController from '../Controllers/Project-Management/Enrollments/EnrollmentController';
import ActivityController from '../Controllers/Project-Management/Activities/ActivityController';

const router = Router();

router.post('/auth/register', AuthController.UserRegister);
router.post('/auth/login', AuthController.UserLogin);
router.get('/auth/me', verifyToken, authorizeRole('Admin'), AuthController.UserProfile);

router.post('/farmer/create-farmer', verifyToken, authorizeRole('Admin'), FarmerController.createFarmer);
router.get('/farmer/all-farmers', verifyToken, authorizeRole('Admin'), FarmerController.getAllFarmers);
router.get('/farmer/get-farmer/:id', FarmerController.getFarmerById);
//router.put('/farmer/update-farmer/:farmerId', verifyToken, authorizeRole('Admin'), FarmerController.updateFarmer);
router.delete('/farmer/delete-farmer/:farmerId', verifyToken, authorizeRole('Admin'), FarmerController.deleteFarmer);

router.get('/search', verifyToken, authorizeRole('Admin'), SearchController.searchFarmers);

router.get("/farmers/export-excel", async (req, res) => {
    await GenerateExcel.generateExcelExport(res);
});

router.get('/farmer/generate-qrcode/:farmerId', verifyToken, authorizeRole('Admin'), QrCodeController.generateQrCode);

router.post('/project/create-project', verifyToken, authorizeRole('Admin'), ProjectController.createProject);
router.get('/project/get-project/:id', verifyToken, authorizeRole('Admin'), ProjectController.getProjectById);
router.get('/projest/project-details/:id', verifyToken, authorizeRole('Admin'), ProjectController.getProjectDetails);

router.post('/project/enroll-farmer', verifyToken, authorizeRole('Admin'), EnrollmentController.enrollFarmerInProject);
router.post('/project/create-activity', verifyToken, authorizeRole('Admin'), ActivityController.createActivity);

export default router;