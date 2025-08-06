/**
 * Mobile-aware storage implementation for Supabase Auth
 * Uses Capacitor Preferences for mobile and localStorage for web
 * Based on Supabase official documentation recommendations
 */

class MobileAwareStorage {
    constructor() {
        this.isMobile = window.Capacitor && window.Capacitor.getPlatform() !== 'web';
        console.log('🔧 MobileAwareStorage initialized for:', this.isMobile ? 'mobile' : 'web');
        
        if (this.isMobile) {
            // Import Capacitor Preferences for mobile
            this.Preferences = window.Capacitor.Plugins.Preferences;
        }
    }

    async getItem(key) {
        try {
            if (this.isMobile) {
                const result = await this.Preferences.get({ key });
                console.log('📱 Mobile storage GET:', key, result.value ? 'found' : 'not found');
                return result.value || null;
            } else {
                const value = localStorage.getItem(key);
                console.log('🌐 Web storage GET:', key, value ? 'found' : 'not found');
                return value;
            }
        } catch (error) {
            console.error('❌ Storage GET error:', error);
            return null;
        }
    }

    async setItem(key, value) {
        try {
            if (this.isMobile) {
                await this.Preferences.set({ key, value });
                console.log('📱 Mobile storage SET:', key, 'success');
            } else {
                localStorage.setItem(key, value);
                console.log('🌐 Web storage SET:', key, 'success');
            }
        } catch (error) {
            console.error('❌ Storage SET error:', error);
            throw error;
        }
    }

    async removeItem(key) {
        try {
            if (this.isMobile) {
                await this.Preferences.remove({ key });
                console.log('📱 Mobile storage REMOVE:', key, 'success');
            } else {
                localStorage.removeItem(key);
                console.log('🌐 Web storage REMOVE:', key, 'success');
            }
        } catch (error) {
            console.error('❌ Storage REMOVE error:', error);
            throw error;
        }
    }

    async clear() {
        try {
            if (this.isMobile) {
                await this.Preferences.clear();
                console.log('📱 Mobile storage CLEAR: success');
            } else {
                localStorage.clear();
                console.log('🌐 Web storage CLEAR: success');
            }
        } catch (error) {
            console.error('❌ Storage CLEAR error:', error);
            throw error;
        }
    }

    // Additional method to check storage health
    async checkStorageHealth() {
        try {
            const testKey = 'supabase_storage_test';
            const testValue = 'test_' + Date.now();
            
            await this.setItem(testKey, testValue);
            const retrieved = await this.getItem(testKey);
            await this.removeItem(testKey);
            
            const isHealthy = retrieved === testValue;
            console.log('🔍 Storage health check:', isHealthy ? '✅ HEALTHY' : '❌ FAILED');
            return isHealthy;
        } catch (error) {
            console.error('❌ Storage health check failed:', error);
            return false;
        }
    }
}

// Create global storage instance
window.mobileStorage = new MobileAwareStorage();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileAwareStorage;
}