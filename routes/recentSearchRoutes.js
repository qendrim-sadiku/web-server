const express = require('express');
const router = express.Router();
const recentSearchController = require('../controllers/recentSearchController');

router.post('/recent-searches', recentSearchController.addRecentSearch); // Add a new search
router.get('/recent-searches/:userId', recentSearchController.getRecentSearches); // Get recent searches
router.delete('/recent-searches/:searchId', recentSearchController.removeRecentSearch); // Remove a specific search
router.delete('/recent-searches/clear/:userId', recentSearchController.clearRecentSearches); // Clear all searches

module.exports = router;
