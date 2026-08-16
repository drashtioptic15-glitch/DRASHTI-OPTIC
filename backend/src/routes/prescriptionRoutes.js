import express from 'express';
import {
  getAllPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
} from '../controllers/prescriptionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply auth protection
router.use(protect);

router.route('/').get(getAllPrescriptions).post(createPrescription);
router
  .route('/:id')
  .get(getPrescriptionById)
  .put(updatePrescription)
  .delete(deletePrescription);

export default router;
