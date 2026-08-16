import express from 'express';
import { getTransactions, getTransactionById } from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getTransactions);
router.route('/:id').get(getTransactionById);

export default router;
