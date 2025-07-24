import jwt, { decode } from 'jsonwebtoken';
import User from '../models/User.js';

const auth = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    

    // Fetch the full user object
    const user = await User.findById(decoded.userId).lean();
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || []
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is not valid' });
  }
};

export default auth; 