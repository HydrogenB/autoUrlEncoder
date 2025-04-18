/**
 * tools-registry.js - Tool registration system for MyDebugger Tools Platform
 * Manages available tools and provides UI rendering capabilities
 */

// Tool registry containing all available tools
const toolRegistry = [
  {
    id: "url-encoder",
    name: "URL Parameter Encoder",
    description:
      "Encode URL parameters for deep links, marketing campaigns, and secure data sharing. Generate QR codes and save links for future use.",
    icon: "link",
    category: "url-tools",
    categoryName: "URL Tools",
    path: "tools/url-encoder.html",
    canonicalUrl: "https://mydebugger.vercel.app/tools/url-encoder.html",
    tags: [
      "url encoder",
      "parameter encoding",
      "url builder",
      "qr code generator",
      "deep linking",
      "utm parameters",
    ],
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder & Validator",
    description:
      "Decode and verify JSON Web Tokens (JWT). Inspect token content, validate signatures, and debug authentication issues.",
    icon: "shield-alt",
    category: "security-tools",
    categoryName: "Security Tools",
    path: "tools/jwt-decoder.html",
    canonicalUrl: "https://mydebugger.vercel.app/tools/jwt-decoder.html",
    tags: [
      "jwt decoder",
      "token validator",
      "authentication debugging",
      "oidc tokens",
      "security tools",
    ],
  },
  {
    id: "dynamic-link-tracer",
    name: "Dynamic Link Tracer",
    description:
      "Track and analyze Firebase Dynamic Links, AppsFlyer OneLinks, and other mobile attribution URLs. Debug redirect chains and marketing links.",
    icon: "share-alt",
    category: "url-tools",
    categoryName: "URL Tools",
    path: "tools/dynamic-link-tracer.html",
    canonicalUrl:
      "https://mydebugger.vercel.app/tools/dynamic-link-tracer.html",
    tags: [
      "firebase dynamic links",
      "appsflyer onelink",
      "deep link tracker",
      "redirect analyzer",
      "mobile attribution",
    ],
  },
  {
    id: "base64-converter",
    name: "Base64 Converter",
    description:
      "Convert text to and from Base64 encoding. Simple, fast, and works entirely in your browser.",
    icon: "exchange-alt",
    category: "data-transformation",
    categoryName: "Data Transformation",
    path: "tools/base64-tool.html",
    canonicalUrl: "https://mydebugger.vercel.app/tools/base64-converter.html",
    tags: [
      "base64 encoder",
      "base64 decoder",
      "text converter",
      "data conversion",
    ],
  },
  {
    id: "json-formatter",
    name: "JSON Formatter & Validator",
    description:
      "Format, validate and beautify JSON data with syntax highlighting. Debug JSON data, fix formatting errors and make JSON readable.",
    icon: "code",
    category: "data-transformation",
    categoryName: "Data Transformation", 
    path: "tools/json-formatter.html",
    canonicalUrl: "https://mydebugger.vercel.app/tools/json-formatter.html",
    tags: [
      "json formatter",
      "json validator",
      "beautifier",
      "syntax highlight",
      "api tools",
    ],
    comingSoon: true,
  }
];

// Function to get tool by ID
function getToolById(toolId) {
  return toolRegistry.find((tool) => tool.id === toolId);
}

// Function to get tools by category
function getToolsByCategory(category = null) {
  if (category) {
    return toolRegistry.filter((tool) => tool.category === category);
  }
  return toolRegistry;
}

// Function to get all categories
function getAllCategories() {
  const categories = [];
  const categoryMap = {};

  toolRegistry.forEach((tool) => {
    if (!categoryMap[tool.category]) {
      categoryMap[tool.category] = true;
      categories.push({
        id: tool.category,
        name: tool.categoryName,
      });
    }
  });

  return categories;
}

// Function to search tools by query
function searchTools(query) {
  if (!query) return toolRegistry;

  const normalizedQuery = query.toLowerCase();

  return toolRegistry.filter(
    (tool) =>
      tool.name.toLowerCase().includes(normalizedQuery) ||
      tool.description.toLowerCase().includes(normalizedQuery) ||
      tool.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
  );
}

// Renders tools grid on homepage
function renderTools(
  containerId = "tools-container",
  filterCategory = null,
  searchQuery = null
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Clear existing content
  container.innerHTML = "";

  // Get tools based on filters
  let toolsToRender = toolRegistry;

  if (filterCategory) {
    toolsToRender = getToolsByCategory(filterCategory);
  }

  if (searchQuery) {
    toolsToRender = searchTools(searchQuery);
  }

  // Group tools by category
  const categories = {};
  toolsToRender.forEach((tool) => {
    if (!categories[tool.category]) {
      categories[tool.category] = {
        name: tool.categoryName,
        tools: [],
      };
    }
    categories[tool.category].tools.push(tool);
  });

  // Check if we have any tools after filtering
  if (Object.keys(categories).length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>No tools found matching your criteria</p>
      </div>
    `;
    return;
  }

  // Generate HTML for each category
  Object.entries(categories).forEach(([categoryId, category]) => {
    // Create category section
    const section = document.createElement("section");
    section.id = `category-${categoryId}`;
    section.innerHTML = `<h2>${category.name}</h2>`;

    // Create tool cards
    const grid = document.createElement("div");
    grid.className = "tools-grid";

    category.tools.forEach((tool) => {
      const comingSoonClass = tool.comingSoon ? "coming-soon" : "";
      const comingSoonBadge = tool.comingSoon
        ? '<span class="badge badge-warning">Coming Soon</span>'
        : "";

      grid.innerHTML += `
        <div class="tool-card ${comingSoonClass}" data-tool-id="${
        tool.id
      }">
          <i class="fas fa-${tool.icon}"></i>
          <h3>${tool.name} ${comingSoonBadge}</h3>
          <p>${tool.description}</p>
          ${
            !tool.comingSoon
              ? `<a href="${tool.path}" class="btn btn-primary">Open Tool</a>`
              : `<button class="btn" disabled>Stay Tuned</button>`
          }
        </div>
      `;
    });

    section.appendChild(grid);
    container.appendChild(section);
  });

  // Add SEO metadata when rendering tools
  if (document.querySelector('meta[name="description"]')) {
    const metaDesc = `Free online developer tools for URL encoding, JSON formatting, JWT debugging and more. ${
      filterCategory
        ? `${categories[filterCategory]?.name} tools available.`
        : "All tools available."
    }`;
    document
      .querySelector('meta[name="description"]')
      .setAttribute("content", metaDesc);
  }

  // Log that tools were rendered
  if (window.myDebugger && window.myDebugger.logger) {
    window.myDebugger.logger.log("Tools rendered", {
      count: toolsToRender.length,
      filterCategory,
      searchQuery,
    });
  }
}

// Initialize tool registry functionality
document.addEventListener("DOMContentLoaded", function () {
  // Render tools if container exists
  const toolsContainer = document.getElementById("tools-container");
  if (toolsContainer) {
    renderTools("tools-container");
  }

  // Set up category filter if it exists
  const categoryFilter = document.getElementById("category-filter");
  if (categoryFilter) {
    // Get all categories
    const categories = getAllCategories();

    // Create options
    let options = '<option value="">All Categories</option>';
    categories.forEach((category) => {
      options += `<option value="${category.id}">${category.name}</option>`;
    });

    categoryFilter.innerHTML = options;

    // Add change event listener
    categoryFilter.addEventListener("change", function () {
      const selectedCategory = this.value;
      const searchInput = document.getElementById("search-tools");
      const searchQuery = searchInput ? searchInput.value : "";

      renderTools("tools-container", selectedCategory, searchQuery);
    });
  }

  // Set up search if it exists
  const searchInput = document.getElementById("search-tools");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const searchQuery = this.value;
      const categoryFilter = document.getElementById("category-filter");
      const selectedCategory = categoryFilter ? categoryFilter.value : "";

      renderTools("tools-container", selectedCategory, searchQuery);
    });
  }

  // Record analytics for homepage visit
  if (window.toolAnalytics) {
    window.toolAnalytics.recordToolUsage("homepage", "view");
  }
});

// Expose registry functions globally
window.toolRegistry = {
  getToolById,
  getToolsByCategory,
  getAllCategories,
  searchTools,
  renderTools,
};
