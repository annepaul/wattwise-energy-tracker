// middleware/authenticateToken.js

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided in request headers');  // <-- Add this line
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT verification error:', err);  // <-- Add this line
      return res.sendStatus(403);
    }

    console.log('Decoded JWT payload:', user);  // <-- Add this line
    req.user_id = user.user_id;  
    next();
  });
}

module.exports = authenticateToken;
