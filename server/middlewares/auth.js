const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dsffj329ufdksafiw";

function authenticateToken(req, res, next) {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user; // attach user info to request
    next(); // move to next middleware / route
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

module.exports = authenticateToken;
