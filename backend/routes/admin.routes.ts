import { Router } from 'express';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';
import * as adminService from '../services/admin.service.js';

const router = Router();

router.get('/users', authenticateToken, authenticateAdmin, async (req: any, res) => {
  try {
    const users = await adminService.listUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id/status', authenticateToken, authenticateAdmin, async (req: any, res) => {
  try {
    const user = await adminService.setUserStatus(req.params.id, req.body.isActive);
    res.json({ success: true, user: { id: user.id, isActive: user.isActive } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/reset-password', authenticateToken, authenticateAdmin, async (req: any, res) => {
  try {
    const { tempPassword } = await adminService.resetUserPassword(req.params.id);
    res.json({ success: true, message: `Password reset to: ${tempPassword}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/revoke', authenticateToken, authenticateAdmin, async (req: any, res) => {
  try {
    await adminService.revokeUser(req.params.id);
    res.json({ success: true, message: 'User credentials revoked' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
