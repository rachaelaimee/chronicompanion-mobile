/**
 * 🔥 Firebase Firestore Integration
 * Handles user-specific health data storage
 */

class FirestoreService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.initialized = false;
    }

    /**
     * Initialize Firestore (call after Firebase Auth is ready)
     */
    async initialize() {
        try {
            console.log('🔥 Initializing Firestore...');
            
            // Wait for Firebase Auth to be available
            if (!window.firebase || !window.firebase.auth) {
                throw new Error('Firebase Auth not available');
            }

            // Get current user
            const user = window.firebase.auth().currentUser;
            if (!user) {
                console.log('⚠️ No user signed in - Firestore will initialize after login');
                return false;
            }

            // Initialize Firestore
            this.db = window.firebase.firestore();
            this.auth = window.firebase.auth();
            this.initialized = true;

            console.log('✅ Firestore initialized for user:', user.email);
            return true;

        } catch (error) {
            console.error('❌ Firestore initialization failed:', error);
            return false;
        }
    }

    /**
     * Get current user ID
     */
    getCurrentUserId() {
        const user = this.auth?.currentUser;
        return user ? user.uid : null;
    }

    /**
     * Save health entry to user's collection
     */
    async saveEntry(entryData) {
        if (!this.initialized) {
            await this.initialize();
        }

        const userId = this.getCurrentUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        try {
            console.log('💾 Saving entry to Firestore for user:', userId);
            
            // Add user ID and timestamp
            const firestoreEntry = {
                ...entryData,
                userId: userId,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Save to user's entries collection
            const docRef = await this.db
                .collection('users')
                .doc(userId)
                .collection('entries')
                .add(firestoreEntry);

            console.log('✅ Entry saved with ID:', docRef.id);
            return { id: docRef.id, ...firestoreEntry };

        } catch (error) {
            console.error('❌ Error saving entry:', error);
            throw error;
        }
    }

    /**
     * Get all entries for current user
     */
    async getEntries(limit = 50) {
        if (!this.initialized) {
            await this.initialize();
        }

        const userId = this.getCurrentUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        try {
            console.log('📖 Loading entries for user:', userId);

            const snapshot = await this.db
                .collection('users')
                .doc(userId)
                .collection('entries')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            const entries = [];
            snapshot.forEach(doc => {
                entries.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`✅ Loaded ${entries.length} entries`);
            return entries;

        } catch (error) {
            console.error('❌ Error loading entries:', error);
            throw error;
        }
    }

    /**
     * Update existing entry
     */
    async updateEntry(entryId, updateData) {
        if (!this.initialized) {
            await this.initialize();
        }

        const userId = this.getCurrentUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        try {
            await this.db
                .collection('users')
                .doc(userId)
                .collection('entries')
                .doc(entryId)
                .update({
                    ...updateData,
                    updatedAt: new Date()
                });

            console.log('✅ Entry updated:', entryId);
            return true;

        } catch (error) {
            console.error('❌ Error updating entry:', error);
            throw error;
        }
    }

    /**
     * Delete entry
     */
    async deleteEntry(entryId) {
        if (!this.initialized) {
            await this.initialize();
        }

        const userId = this.getCurrentUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        try {
            await this.db
                .collection('users')
                .doc(userId)
                .collection('entries')
                .doc(entryId)
                .delete();

            console.log('✅ Entry deleted:', entryId);
            return true;

        } catch (error) {
            console.error('❌ Error deleting entry:', error);
            throw error;
        }
    }

    /**
     * Import existing entries (for migration)
     */
    async importEntries(entriesArray) {
        if (!this.initialized) {
            await this.initialize();
        }

        const userId = this.getCurrentUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        try {
            console.log(`📥 Importing ${entriesArray.length} entries for user:`, userId);

            const batch = this.db.batch();
            const userEntriesRef = this.db.collection('users').doc(userId).collection('entries');

            entriesArray.forEach(entry => {
                const docRef = userEntriesRef.doc();
                batch.set(docRef, {
                    ...entry,
                    userId: userId,
                    importedAt: new Date(),
                    createdAt: entry.created_at ? new Date(entry.created_at) : new Date(),
                    updatedAt: entry.updated_at ? new Date(entry.updated_at) : new Date()
                });
            });

            await batch.commit();
            console.log('✅ Import completed');
            return true;

        } catch (error) {
            console.error('❌ Error importing entries:', error);
            throw error;
        }
    }

    /**
     * Set up real-time listener for user entries
     */
    onEntriesChange(callback) {
        if (!this.initialized) {
            console.log('⚠️ Firestore not initialized - cannot set up listener');
            return null;
        }

        const userId = this.getCurrentUserId();
        if (!userId) {
            console.log('⚠️ No user signed in - cannot set up listener');
            return null;
        }

        console.log('👂 Setting up real-time listener for user:', userId);

        return this.db
            .collection('users')
            .doc(userId)
            .collection('entries')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const entries = [];
                snapshot.forEach(doc => {
                    entries.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                console.log(`🔄 Real-time update: ${entries.length} entries received`);
                callback(entries);
            }, error => {
                console.error('❌ Real-time listener error:', error);
            });
    }

    /**
     * Check if user has any entries (for first-time setup)
     */
    async hasEntries() {
        if (!this.initialized) {
            await this.initialize();
        }

        const userId = this.getCurrentUserId();
        if (!userId) {
            return false;
        }

        try {
            const snapshot = await this.db
                .collection('users')
                .doc(userId)
                .collection('entries')
                .limit(1)
                .get();

            return !snapshot.empty;

        } catch (error) {
            console.error('❌ Error checking entries:', error);
            return false;
        }
    }
}

// Export global instance
window.firestoreService = new FirestoreService();