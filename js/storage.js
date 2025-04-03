/**
 * storage.js - Shared storage API for MyDebugger Tools Platform
 * Provides a consistent interface for local storage with fallback
 */

// Storage Manager for browser storage with fallback
const StorageManager = (function() {
    // In-memory storage as fallback
    let inMemoryData = {};
    
    // Check if storage is available
    function isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // Storage interface
    return {
        // Get data with optional namespace for tool isolation
        get: function(key, defaultValue, namespace = null) {
            try {
                const storageKey = namespace ? `${namespace}_${key}` : key;
                
                if (isStorageAvailable()) {
                    const item = localStorage.getItem(storageKey);
                    return item ? JSON.parse(item) : defaultValue;
                } else {
                    return inMemoryData[storageKey] || defaultValue;
                }
            } catch (e) {
                if (window.myDebugger && window.myDebugger.logger) {
                    window.myDebugger.logger.error("Error getting data from storage:", e);
                } else {
                    console.error("Error getting data from storage:", e);
                }
                return defaultValue;
            }
        },
        
        // Set data with optional namespace for tool isolation
        set: function(key, value, namespace = null) {
            try {
                const storageKey = namespace ? `${namespace}_${key}` : key;
                
                if (isStorageAvailable()) {
                    localStorage.setItem(storageKey, JSON.stringify(value));
                } else {
                    inMemoryData[storageKey] = value;
                }
                return true;
            } catch (e) {
                if (window.myDebugger && window.myDebugger.logger) {
                    window.myDebugger.logger.error("Error saving data to storage:", e);
                } else {
                    console.error("Error saving data to storage:", e);
                }
                return false;
            }
        },
        
        // Remove a key with optional namespace
        remove: function(key, namespace = null) {
            try {
                const storageKey = namespace ? `${namespace}_${key}` : key;
                
                if (isStorageAvailable()) {
                    localStorage.removeItem(storageKey);
                } else {
                    delete inMemoryData[storageKey];
                }
                return true;
            } catch (e) {
                if (window.myDebugger && window.myDebugger.logger) {
                    window.myDebugger.logger.error("Error removing data from storage:", e);
                } else {
                    console.error("Error removing data from storage:", e);
                }
                return false;
            }
        },
        
        // Clear all keys for a specific namespace
        clearNamespace: function(namespace) {
            try {
                if (!namespace) return false;
                
                if (isStorageAvailable()) {
                    // Get all keys in localStorage
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key.startsWith(`${namespace}_`)) {
                            keysToRemove.push(key);
                        }
                    }
                    
                    // Remove all keys in the namespace
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                } else {
                    // For in-memory storage
                    Object.keys(inMemoryData).forEach(key => {
                        if (key.startsWith(`${namespace}_`)) {
                            delete inMemoryData[key];
                        }
                    });
                }
                return true;
            } catch (e) {
                if (window.myDebugger && window.myDebugger.logger) {
                    window.myDebugger.logger.error("Error clearing namespace from storage:", e);
                } else {
                    console.error("Error clearing namespace from storage:", e);
                }
                return false;
            }
        },
        
        // Check if a key exists
        exists: function(key, namespace = null) {
            try {
                const storageKey = namespace ? `${namespace}_${key}` : key;
                
                if (isStorageAvailable()) {
                    return localStorage.getItem(storageKey) !== null;
                } else {
                    return storageKey in inMemoryData;
                }
            } catch (e) {
                if (window.myDebugger && window.myDebugger.logger) {
                    window.myDebugger.logger.error("Error checking if key exists in storage:", e);
                } else {
                    console.error("Error checking if key exists in storage:", e);
                }
                return false;
            }
        }
    };
})();

// Export the storage manager
window.StorageManager = StorageManager;

// Tool-specific storage interface
window.toolStorage = {
    get: function(toolId, key, defaultValue) {
        return StorageManager.get(key, defaultValue, `tool_${toolId}`);
    },
    
    set: function(toolId, key, value) {
        return StorageManager.set(key, value, `tool_${toolId}`);
    },
    
    remove: function(toolId, key) {
        return StorageManager.remove(key, `tool_${toolId}`);
    },
    
    clearAll: function(toolId) {
        return StorageManager.clearNamespace(`tool_${toolId}`);
    },
    
    exists: function(toolId, key) {
        return StorageManager.exists(key, `tool_${toolId}`);
    }
};

// Analytics helper (simplified version)
window.toolAnalytics = {
    recordToolUsage: function(toolId, action) {
        try {
            const timestamp = new Date().toISOString();
            const analyticsData = StorageManager.get('usage', [], 'analytics');
            
            analyticsData.push({
                toolId,
                action,
                timestamp
            });
            
            // Keep only last 100 entries
            if (analyticsData.length > 100) {
                analyticsData.shift();
            }
            
            StorageManager.set('usage', analyticsData, 'analytics');
            
            // Log analytics event
            if (window.myDebugger && window.myDebugger.logger) {
                window.myDebugger.logger.log(`Analytics: ${toolId} - ${action}`);
            }
        } catch (e) {
            if (window.myDebugger && window.myDebugger.logger) {
                window.myDebugger.logger.error("Analytics error:", e);
            } else {
                console.error("Analytics error:", e);
            }
        }
    },
    
    getToolStats: function() {
        const analyticsData = StorageManager.get('usage', [], 'analytics');
        const stats = {};
        
        analyticsData.forEach(entry => {
            if (!stats[entry.toolId]) {
                stats[entry.toolId] = 0;
            }
            stats[entry.toolId]++;
        });
        
        return stats;
    },
    
    getMostUsedTools: function(limit = 5) {
        const stats = this.getToolStats();
        
        return Object.entries(stats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => ({ toolId: entry[0], count: entry[1] }));
    }
};