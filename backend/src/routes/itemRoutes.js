import express from 'express';
import {
  getItems,
  getItemsByCategory,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  adjustStock,
} from '../controllers/itemController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/category/:categoryId', getItemsByCategory);
router.route('/').get(getItems).post(createItem);
router.route('/:id').get(getItemById).put(updateItem).delete(deleteItem);
router.post('/:id/stock', adjustStock);

export default router;
