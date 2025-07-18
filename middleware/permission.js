import User from '../models/User.js';

// Usage: permit('employee:create'), permit('task:delete'), ...
function permit(...allowed) {
  return async (req, res, next) => {
    try {
      const { role, permissions } = req.user;
      // Admins always allowed
      if (role === 'Admin') return next();
      // Check if any allowed permission is present
      if (permissions && allowed.some(p => permissions.includes(p))) {
        return next();
      }
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    } catch (err) {
      return res.status(500).json({ error: 'Permission middleware error' });
    }
  };
}

export default permit; 