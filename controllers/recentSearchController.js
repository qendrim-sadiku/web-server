const RecentSearch = require('../models/RecentSearch ');

// Add a new recent search
exports.addRecentSearch = async (req, res) => {
  const { userId, query } = req.body;

  try {
    if (!userId || !query) {
      return res.status(400).json({ message: 'User ID and search query are required' });
    }

    await RecentSearch.create({ userId, query });

    res.status(201).json({ message: 'Search added successfully' });
  } catch (error) {
    console.error('Error adding search:', error);
    res.status(500).json({ message: 'Failed to add search', error });
  }
};

// Get recent searches for a user
exports.getRecentSearches = async (req, res) => {
  const { userId } = req.params;
  const { limit = 10 } = req.query; // Default limit is 10

  try {
    const searches = await RecentSearch.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
    });

    res.status(200).json({ message: 'Recent searches fetched successfully', data: searches });
  } catch (error) {
    console.error('Error fetching searches:', error);
    res.status(500).json({ message: 'Failed to fetch searches', error });
  }
};

// Remove a specific recent search by ID
exports.removeRecentSearch = async (req, res) => {
  const { searchId } = req.params;

  try {
    const search = await RecentSearch.findByPk(searchId);

    if (!search) {
      return res.status(404).json({ message: 'Search not found' });
    }

    await search.destroy();
    res.status(200).json({ message: 'Search removed successfully' });
  } catch (error) {
    console.error('Error removing search:', error);
    res.status(500).json({ message: 'Failed to remove search', error });
  }
};

// Clear all recent searches for a user
exports.clearRecentSearches = async (req, res) => {
  const { userId } = req.params;

  try {
    await RecentSearch.destroy({ where: { userId } });
    res.status(200).json({ message: 'All searches cleared successfully' });
  } catch (error) {
    console.error('Error clearing searches:', error);
    res.status(500).json({ message: 'Failed to clear searches', error });
  }
};
