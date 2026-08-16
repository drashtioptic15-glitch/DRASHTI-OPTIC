import express from 'express';
import {
  getNumbers,
  getNumberById,
  createNumber,
  updateNumber,
  deleteNumber,
} from '../controllers/numberController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getNumbers).post(createNumber);
router.route('/:id').get(getNumberById).put(updateNumber).delete(deleteNumber);

export default router;
