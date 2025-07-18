import { Router } from 'express';
import User from '../models/User.js';
import permit from '../middleware/permission.js';

const router = Router();

// List all users (admin only)
router.get('/', permit('admin:manage'), async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role/permissions (admin only)
router.put('/:id', permit('admin:manage'), async (req, res) => {
  try {
    const { role, permissions } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, permissions },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 