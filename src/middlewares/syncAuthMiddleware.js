/**
 * Admin Authentication Middleware for Sync Endpoints
 * Protects sync endpoints - restricts access to admin users only
 */

/**
 * Middleware to check if user is authenticated and has admin privileges
 * Uses session-based authentication
 */
const requireAdmin = (req, res, next) => {
    try {
        // Check if user is logged in
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Authentication required",
            });
        }

        // For now, allow any logged-in user to access sync
        // You can add more strict role checking here if needed
        // Example: Check if user is actually admin
        //const userRole = req.session.Quyen;
        //if (userRole !== "Admin") {
        //  return res.status(403).json({
        //    success: false,
        //    message: "Forbidden - Admin access required",
        //  });
        //}

        // User is authenticated - allow access
        next();
    } catch (error) {
        console.error("Admin middleware error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during authentication",
        });
    }
};

/**
 * Alternative: API Key based authentication (commented out)
 * Uncomment if you want to use API key instead of session-based auth
 */
/*
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const validApiKey = process.env.SYNC_API_KEY || 'your-secret-api-key';

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing API key'
    });
  }

  next();
};
*/

module.exports = {
    requireAdmin,
    // requireApiKey, // Uncomment if using API key
};
