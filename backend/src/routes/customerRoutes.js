import express from 'express';
import {
  getCustomers,
  searchCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerPrescription,
  getCustomerPrescriptions,
  updatePrescription,
  deletePrescription,
} from '../controllers/customerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply auth protection to all customer routes
router.use(protect);

router.get('/search', searchCustomers);
router.route('/').get(getCustomers).post(createCustomer);
router.route('/:id').get(getCustomerById).put(updateCustomer).delete(deleteCustomer);

// Prescription sub-routes
router.route('/:id/prescriptions').get(getCustomerPrescriptions).post(addCustomerPrescription);
router
  .route('/:customerId/prescriptions/:prescriptionId')
  .put(updatePrescription)
  .delete(deletePrescription);

export default router;
