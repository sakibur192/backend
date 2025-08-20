const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, "a94bd8c982cf441fa5120bd13cbdfc44260e18c2f7361c7631c46c72b329b334");
    req.user = decoded; // user info inside token
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
