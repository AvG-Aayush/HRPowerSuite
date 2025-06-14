// Client-side cache manager for better performance
class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = 100; // Maximum cache entries

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Delete keys matching pattern
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  size(): number {
    return this.cache.size;
  }

  // Preload critical data
  preloadCriticalData(): void {
    const criticalEndpoints = [
      '/api/user',
      '/api/dashboard/metrics'
    ];

    criticalEndpoints.forEach(endpoint => {
      if (!this.has(endpoint)) {
        fetch(endpoint, { credentials: 'include' })
          .then(res => res.json())
          .then(data => this.set(endpoint, data))
          .catch(() => {}); // Silent fail for preloading
      }
    });
  }
}

export const cacheManager = new CacheManager();

// Initialize cache on app start
if (typeof window !== 'undefined') {
  cacheManager.preloadCriticalData();
}