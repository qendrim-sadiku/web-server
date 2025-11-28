const Fuse = require('fuse.js');

/**
 * Conceptual search mappings - maps search terms to related concepts
 */
const conceptualMappings = {
  'ball': ['tennis', 'ping pong', 'table tennis', 'badminton', 'squash', 'racquet', 'racket', 'golf', 'baseball', 'softball', 'cricket', 'hockey', 'lacrosse', 'polo'],
  'sport': ['fitness', 'exercise', 'training', 'workout', 'gym', 'athletic'],
  'fitness': ['gym', 'workout', 'exercise', 'training', 'cardio', 'strength', 'muscle'],
  'swimming': ['water', 'pool', 'aquatic', 'diving', 'synchronized'],
  'running': ['jogging', 'marathon', 'sprint', 'track', 'cardio'],
  'yoga': ['meditation', 'mindfulness', 'stretching', 'flexibility', 'balance'],
  'dance': ['choreography', 'movement', 'rhythm', 'music', 'performance']
};

/**
 * Expand search query with conceptual mappings
 * @param {string} searchQuery - The original search query
 * @returns {Array} Array of expanded search terms
 */
const expandSearchQuery = (searchQuery) => {
  const searchLower = searchQuery.toLowerCase();
  const expandedTerms = [searchQuery]; // Always include original term
  
  // Add conceptual mappings
  Object.keys(conceptualMappings).forEach(key => {
    if (searchLower.includes(key)) {
      expandedTerms.push(...conceptualMappings[key]);
    }
  });
  
  // Also check if any mapped terms are in the search query
  Object.entries(conceptualMappings).forEach(([key, values]) => {
    values.forEach(value => {
      if (searchLower.includes(value)) {
        expandedTerms.push(key);
        expandedTerms.push(...values);
      }
    });
  });
  
  return [...new Set(expandedTerms)]; // Remove duplicates
};

/**
 * Fuzzy search utility for services
 * @param {Array} services - Array of services to search through
 * @param {string} searchQuery - The search query
 * @param {Object} options - Fuse.js options
 * @returns {Array} Array of matching services with scores
 */
const fuzzySearchServices = (services, searchQuery, options = {}) => {
  if (!searchQuery || !services || services.length === 0) {
    return [];
  }

  // Default Fuse.js options optimized for service search
  const defaultOptions = {
    keys: [
      { name: 'name', weight: 0.3 },
      { name: 'description', weight: 0.2 },
      { name: 'tags', weight: 0.25 }, // High weight for tags since they're specific keywords
      { name: 'SubCategory.name', weight: 0.1 },
      { name: 'SubCategory.Category.name', weight: 0.05 },
      { name: 'ServiceDetail.fullDescription', weight: 0.05 },
      { name: 'ServiceDetail.highlights', weight: 0.025 },
      { name: 'ServiceDetail.whatsIncluded', weight: 0.025 }
    ],
    threshold: 0.6, // Higher threshold means more lenient matching (0 = exact match, 1 = match anything)
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 1,
    ...options
  };

  const fuse = new Fuse(services, defaultOptions);
  const results = fuse.search(searchQuery);

  return results.map(result => ({
    ...result.item,
    _fuzzyScore: result.score,
    _fuzzyMatches: result.matches
  }));
};

/**
 * Enhanced search that prioritizes exact phrase matches, then falls back to fuzzy search.
 * Conceptual expansion (e.g., mapping "football" -> "ball") is ONLY used in the fuzzy step
 * so generic tags like "ball" do not outrank exact phrase matches like "Football Conditioning".
 * @param {Array} services
 * @param {string} searchQuery
 * @returns {{ exactMatches: Array, fuzzyMatches: Array }}
 */
const enhancedSearch = (services, searchQuery) => {
  if (!searchQuery || !services || services.length === 0) {
    return { exactMatches: [], fuzzyMatches: [] };
  }

  const q = searchQuery.toLowerCase().trim();

  // 1) Rank exact/phrase matches without conceptual expansion
  const scored = [];
  for (const service of services) {
    const name = service.name?.toLowerCase() || '';
    const desc = service.description?.toLowerCase() || '';
    const tags = (service.tags && Array.isArray(service.tags)) ? service.tags.map(t => (t || '').toLowerCase()) : [];
    const sub  = service.SubCategory?.name?.toLowerCase() || '';
    const cat  = service.SubCategory?.Category?.name?.toLowerCase() || '';

    let score = null;

    // Highest priority: exact name equality
    if (name === q) score = 0;
    // Name starts with phrase
    else if (name.startsWith(q)) score = 0.05;
    // Name contains phrase
    else if (name.includes(q)) score = 0.1;
    // Description contains phrase
    else if (desc.includes(q)) score = 0.25;
    // Tags contain phrase
    else if (tags.some(t => t.includes(q))) score = 0.3;
    // Subcategory or category contain phrase
    else if (sub.includes(q)) score = 0.35;
    else if (cat.includes(q)) score = 0.4;

    if (score !== null) {
      scored.push({ service, _exactRankScore: score });
    }
  }

  if (scored.length > 0) {
    // Sort ascending by score (lower is better)
    scored.sort((a, b) => a._exactRankScore - b._exactRankScore);
    return { exactMatches: scored.map(s => s.service), fuzzyMatches: [] };
  }

  // 2) Fallback to fuzzy search WITH conceptual expansion
  const expandedTerms = expandSearchQuery(searchQuery);
  const allFuzzyResults = [];
  for (const term of expandedTerms) {
    const fuzzyResults = fuzzySearchServices(services, term);
    allFuzzyResults.push(...fuzzyResults);
  }

  const uniqueResults = allFuzzyResults
    .filter((result, index, self) => index === self.findIndex(r => r.id === result.id))
    .sort((a, b) => a._fuzzyScore - b._fuzzyScore);

  return { exactMatches: [], fuzzyMatches: uniqueResults };
};

/**
 * Get search suggestions based on partial matches
 * @param {Array} services - Array of services to search through
 * @param {string} searchQuery - The search query
 * @param {number} limit - Maximum number of suggestions
 * @returns {Array} Array of search suggestions
 */
const getSearchSuggestions = (services, searchQuery, limit = 5) => {
  if (!searchQuery || searchQuery.length < 2) {
    return [];
  }

  const suggestions = new Set();
  const searchLower = searchQuery.toLowerCase();

  services.forEach(service => {
    // Check service name
    if (service.name?.toLowerCase().includes(searchLower)) {
      suggestions.add(service.name);
    }
    
    // Check tags
    if (service.tags && Array.isArray(service.tags)) {
      service.tags.forEach(tag => {
        if (tag.toLowerCase().includes(searchLower)) {
          suggestions.add(tag);
        }
      });
    }
    
    // Check subcategory name
    if (service.SubCategory?.name?.toLowerCase().includes(searchLower)) {
      suggestions.add(service.SubCategory.name);
    }
    
    // Check category name
    if (service.SubCategory?.Category?.name?.toLowerCase().includes(searchLower)) {
      suggestions.add(service.SubCategory.Category.name);
    }
  });

  return Array.from(suggestions).slice(0, limit);
};

module.exports = {
  fuzzySearchServices,
  enhancedSearch,
  getSearchSuggestions,
  expandSearchQuery
};
