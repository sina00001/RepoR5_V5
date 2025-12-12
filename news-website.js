// news-website.js
// Main JavaScript file for Global News website

// API Configuration
const API_KEY = '49020a5ab54a4bbab4523dcbbcea3392'; // Your actual API key // Your API key - in production, use environment variables
const BASE_URL = 'https://newsapi.org/v2/everything';
const TOP_HEADLINES_URL = 'https://newsapi.org/v2/top-headlines';

// Cache news data to avoid redundant API calls
let newsCache = {
    featured: null,
    categories: {},
    lastFetch: null
};

// DOM Elements
const elements = {
    featuredArticle: document.querySelector('.featured-article'),
    sidebarNews: document.querySelector('.sidebar-news'),
    latestNews: document.querySelector('.latest-news'),
    searchInput: document.querySelector('.search-bar input'),
    searchButton: document.querySelector('.search-bar button'),
    hamburger: document.getElementById('hamburger'),
    navMenu: document.getElementById('nav-menu'),
    categoryLinks: document.querySelectorAll('.nav-menu a'),
    viewAllLink: document.querySelector('.view-all'),
    currentDate: document.getElementById('current-date'),
    currentTime: document.getElementById('current-time')
};

// News categories
const categories = [
    { id: 'general', name: 'General', icon: 'fa-home' },
    { id: 'world', name: 'World', icon: 'fa-globe' },
    { id: 'business', name: 'Business', icon: 'fa-chart-line' },
    { id: 'technology', name: 'Technology', icon: 'fa-laptop' },
    { id: 'health', name: 'Health', icon: 'fa-heartbeat' },
    { id: 'sports', name: 'Sports', icon: 'fa-futbol' },
    { id: 'entertainment', name: 'Entertainment', icon: 'fa-film' }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initDateTime();
    setupEventListeners();
    loadNews();
    setupCategoryNavigation();
    
    // Show loading state
    showLoadingState();
});

// Update date and time
function initDateTime() {
    function updateDateTime() {
        const now = new Date();
        
        // Format date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = now.toLocaleDateString('en-US', options);
        if (elements.currentDate) {
            elements.currentDate.textContent = dateString;
        }
        
        // Format time
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
        if (elements.currentTime) {
            elements.currentTime.textContent = timeString;
        }
    }
    
    // Update immediately and every minute
    updateDateTime();
    setInterval(updateDateTime, 60000);
}

// Setup all event listeners
function setupEventListeners() {
    // Mobile menu toggle
    if (elements.hamburger) {
        elements.hamburger.addEventListener('click', toggleMobileMenu);
    }
    
    // Search functionality
    if (elements.searchButton && elements.searchInput) {
        elements.searchButton.addEventListener('click', handleSearch);
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }
    
    // View all link
    if (elements.viewAllLink) {
        elements.viewAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadNews('general');
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (elements.navMenu && elements.navMenu.classList.contains('active') &&
            !e.target.closest('.nav-menu') && !e.target.closest('.hamburger')) {
            elements.navMenu.classList.remove('active');
        }
    });
}

// Toggle mobile menu
function toggleMobileMenu() {
    elements.navMenu.classList.toggle('active');
}

// Handle search functionality
function handleSearch() {
    const searchTerm = elements.searchInput.value.trim();
    
    if (searchTerm) {
        // Show loading
        showLoadingState();
        
        // Search for news
        searchNews(searchTerm)
            .then(news => {
                displaySearchResults(news);
            })
            .catch(error => {
                console.error('Search error:', error);
                showError('Failed to search news. Please try again.');
            })
            .finally(() => {
                elements.searchInput.value = '';
            });
    }
}

// Setup category navigation
function setupCategoryNavigation() {
    elements.categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.textContent.toLowerCase().trim();
            const categoryId = categories.find(cat => 
                cat.name.toLowerCase() === category
            )?.id || 'general';
            
            // Update active state
            elements.categoryLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');
            
            // Load category news
            loadNews(categoryId);
            
            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                elements.navMenu.classList.remove('active');
            }
        });
    });
}

// Fetch news from API
async function fetchNews(query = 'technology', category = null, pageSize = 10) {
    const cacheKey = category || query;
    
    // Check cache first (cache valid for 5 minutes)
    if (newsCache.categories[cacheKey] && 
        newsCache.lastFetch && 
        (Date.now() - newsCache.lastFetch) < 300000) {
        return newsCache.categories[cacheKey];
    }
    
    try {
        let url;
        
        if (category) {
            // Use top headlines for categories
            url = `${TOP_HEADLINES_URL}?country=us&category=${category}&pageSize=${pageSize}&apiKey=${API_KEY}`;
        } else {
            // Use everything endpoint for searches
            url = `${BASE_URL}?q=${encodeURIComponent(query)}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${API_KEY}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache the results
        newsCache.categories[cacheKey] = data.articles;
        newsCache.lastFetch = Date.now();
        
        return data.articles;
    } catch (error) {
        console.error('Error fetching news:', error);
        
        // Return mock data for demo purposes if API fails
        return getMockNewsData(category || query);
    }
}

// Search news
async function searchNews(searchTerm) {
    return await fetchNews(searchTerm, null, 15);
}

// Load and display news
async function loadNews(category = 'technology') {
    try {
        // Fetch news for the category
        const articles = await fetchNews(null, category, 12);
        
        if (!articles || articles.length === 0) {
            showError('No news articles found for this category.');
            return;
        }
        
        // Update featured article with first article
        updateFeaturedArticle(articles[0]);
        
        // Update sidebar with next 4 articles
        updateSidebarNews(articles.slice(1, 5));
        
        // Update latest news with remaining articles
        updateLatestNews(articles.slice(5));
        
    } catch (error) {
        console.error('Error loading news:', error);
        showError('Failed to load news. Please try again later.');
    }
}

// Update featured article
function updateFeaturedArticle(article) {
    if (!elements.featuredArticle || !article) return;
    
    const img = elements.featuredArticle.querySelector('img');
    const category = elements.featuredArticle.querySelector('.category');
    const title = elements.featuredArticle.querySelector('h2');
    const description = elements.featuredArticle.querySelector('p');
    const readMoreLink = elements.featuredArticle.querySelector('.read-more');
    
    // Update content
    if (img) img.src = article.urlToImage || getFallbackImage('technology');
    if (img) img.alt = article.title || 'Featured News';
    if (category) category.textContent = article.category || 'TOP STORY';
    if (title) title.textContent = article.title || 'Breaking News';
    if (description) description.textContent = article.description || 'Click to read more about this story.';
    if (readMoreLink) readMoreLink.href = article.url || '#';
    
    // Add click event to open article
    elements.featuredArticle.addEventListener('click', (e) => {
        if (!e.target.closest('.read-more')) {
            window.open(article.url || '#', '_blank');
        }
    });
}

// Update sidebar news
function updateSidebarNews(articles) {
    if (!elements.sidebarNews || !articles.length) return;
    
    const sidebarItems = elements.sidebarNews.querySelectorAll('.sidebar-item');
    
    articles.forEach((article, index) => {
        if (sidebarItems[index]) {
            const img = sidebarItems[index].querySelector('.sidebar-img');
            const titleLink = sidebarItems[index].querySelector('h4 a');
            const meta = sidebarItems[index].querySelector('.sidebar-meta');
            
            if (img) {
                img.src = article.urlToImage || getFallbackImage('general', index);
                img.alt = article.title || 'News Image';
            }
            
            if (titleLink) {
                titleLink.textContent = article.title || 'News Story';
                titleLink.href = article.url || '#';
                
                // Add click event to open article in new tab
                titleLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.open(article.url || '#', '_blank');
                });
            }
            
            if (meta) {
                const source = article.source?.name || 'News Source';
                const time = formatTimeAgo(article.publishedAt);
                meta.textContent = `${source} • ${time}`;
            }
        }
    });
}

// Update latest news section
function updateLatestNews(articles) {
    if (!elements.latestNews || !articles.length) return;
    
    // Clear existing content
    elements.latestNews.innerHTML = '';
    
    articles.forEach((article, index) => {
        if (index >= 4) return; // Limit to 4 articles
        
        const newsCard = createNewsCard(article, index);
        elements.latestNews.appendChild(newsCard);
    });
}

// Create a news card element
function createNewsCard(article, index) {
    const card = document.createElement('article');
    card.className = 'news-card';
    
    // Get category from article or use a default
    const category = article.category || getCategoryFromSource(article.source?.name) || 'NEWS';
    
    // Format published time
    const timeAgo = formatTimeAgo(article.publishedAt);
    
    card.innerHTML = `
        <img src="${article.urlToImage || getFallbackImage(category.toLowerCase(), index)}" 
             alt="${article.title || 'News Image'}">
        <div class="news-content">
            <div class="news-category">${category.toUpperCase()}</div>
            <h3><a href="${article.url || '#'}" target="_blank">${article.title || 'News Story'}</a></h3>
            <div class="news-meta">
                <span>${article.author || article.source?.name || 'Unknown Author'}</span>
                <span>${timeAgo}</span>
            </div>
        </div>
    `;
    
    return card;
}

// Display search results
function displaySearchResults(articles) {
    if (!articles.length) {
        showError('No results found for your search.');
        return;
    }
    
    // Update page title
    const searchTerm = elements.searchInput.value.trim();
    document.querySelector('.section-title h2').textContent = `Search Results: "${searchTerm}"`;
    
    // Update featured article with first result
    updateFeaturedArticle(articles[0]);
    
    // Clear and update sidebar
    const sidebarContainer = elements.sidebarNews.querySelector('.sidebar-news > div:not(h3)');
    if (sidebarContainer) sidebarContainer.remove();
    
    // Update latest news with search results
    updateLatestNews(articles.slice(1));
}

// Show loading state
function showLoadingState() {
    const loadingHTML = `
        <div class="loading-state" style="text-align: center; padding: 40px;">
            <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #e63946; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
            <p>Loading latest news...</p>
        </div>
    `;
    
    // Add CSS for spinner animation
    if (!document.querySelector('#loading-styles')) {
        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show loading in featured and latest sections
    if (elements.featuredArticle) {
        elements.featuredArticle.innerHTML = loadingHTML;
    }
    
    if (elements.latestNews) {
        elements.latestNews.innerHTML = loadingHTML;
    }
}

// Show error message
function showError(message) {
    const errorHTML = `
        <div class="error-state" style="text-align: center; padding: 40px; color: #e63946;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
            <h3>Something went wrong</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="background: #e63946; color: white; border: none; padding: 10px 20px; border-radius: 3px; cursor: pointer; margin-top: 20px;">
                Try Again
            </button>
        </div>
    `;
    
    if (elements.featuredArticle) {
        elements.featuredArticle.innerHTML = errorHTML;
    }
}

// Helper function to format time ago
function formatTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

// Helper function to get fallback images
function getFallbackImage(category, index = 0) {
    const fallbackImages = {
        technology: [
            'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        ],
        business: [
            'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        ],
        sports: [
            'https://images.unsplash.com/photo-1517466787929-bc90951d0974?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        ],
        health: [
            'https://images.unsplash.com/photo-1551601651-2a8555f1a136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        ],
        general: [
            'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        ]
    };
    
    const images = fallbackImages[category] || fallbackImages.general;
    return images[index % images.length];
}

// Helper function to get category from source
function getCategoryFromSource(sourceName) {
    if (!sourceName) return 'NEWS';
    
    const techSources = ['tech', 'wired', 'the verge', 'techcrunch'];
    const businessSources = ['business', 'bloomberg', 'financial times', 'economist'];
    const sportSources = ['espn', 'sports', 'bbc sport'];
    
    const lowerSource = sourceName.toLowerCase();
    
    if (techSources.some(s => lowerSource.includes(s))) return 'TECHNOLOGY';
    if (businessSources.some(s => lowerSource.includes(s))) return 'BUSINESS';
    if (sportSources.some(s => lowerSource.includes(s))) return 'SPORTS';
    
    return 'NEWS';
}

// Mock data for demo purposes when API fails
function getMockNewsData(category) {
    const mockData = {
        technology: [
            {
                title: "AI Breakthrough: New Algorithm Outperforms Humans in Creative Tasks",
                description: "Researchers have developed an AI system that can generate original artwork and music compositions.",
                urlToImage: getFallbackImage('technology', 0),
                url: "#",
                publishedAt: new Date().toISOString(),
                source: { name: "Tech News" },
                author: "Jane Smith",
                category: "Technology"
            },
            {
                title: "Quantum Computing Milestone Achieved by Research Team",
                description: "Scientists have successfully maintained quantum coherence for record-breaking duration.",
                urlToImage: getFallbackImage('technology', 1),
                url: "#",
                publishedAt: new Date(Date.now() - 3600000).toISOString(),
                source: { name: "Science Daily" },
                author: "Dr. Robert Chen",
                category: "Technology"
            }
        ],
        business: [
            {
                title: "Global Markets Surge as Economic Recovery Exceeds Expectations",
                description: "Stock indices worldwide hit new highs following positive economic indicators.",
                urlToImage: getFallbackImage('business', 0),
                url: "#",
                publishedAt: new Date(Date.now() - 7200000).toISOString(),
                source: { name: "Financial Times" },
                author: "Michael Johnson",
                category: "Business"
            }
        ]
    };
    
    return mockData[category] || mockData.technology;
}

// Export functions for global access if needed
window.NewsApp = {
    loadNews,
    searchNews,
    fetchNews,
    toggleMobileMenu
};