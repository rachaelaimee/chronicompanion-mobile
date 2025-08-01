// ChroniCompanion Frontend JavaScript
class ChroniCompanion {
    constructor() {
        this.apiBase = 'https://chronicompanion-mobile-production.up.railway.app'; // Backend API URL (will fallback to offline mode)
        this.currentView = 'entry-form';
        this.db = null; // IndexedDB instance
        this.isOnline = navigator.onLine;
        this.isMobile = this.detectMobile();
        this.currentChart = null; // Chart.js instance for dashboard
        this.init();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768;
    }

    async init() {
        await this.initIndexedDB();
        this.setupEventListeners();
        this.setupMobileOptimizations();
        this.updateCurrentDate();
        this.initializeSliders();
        this.loadEntries(); // Load existing entries on startup
        this.restoreViewState(); // Restore the last viewed page
        this.setupOfflineHandling();
        this.checkBackendConnection(); // Check if backend is available
        this.checkPremiumStatus(); // Check premium subscription status
        this.updateAIButtonStates(); // Update AI button states based on premium status
        this.initializeAds(); // Initialize AdSense ads
        
        // Initialize Quick Insights with any existing entries
        setTimeout(() => {
            this.initializeQuickInsights();
        }, 1000);
    }

    async checkBackendConnection() {
        try {
            const response = await fetch(`${this.apiBase}/health`, {
                method: 'GET',
                timeout: 2000
            });
            if (response.ok) {
                this.isOnline = true; // Set online when API responds
                this.showNetworkStatus('Connected to server', 'success');
                this.syncPendingEntries(); // Sync any pending entries
            }
        } catch (error) {
            this.isOnline = false; // Set offline when API fails
            this.showNetworkStatus('Running in offline mode - entries saved locally', 'info');
        }
    }

    // IndexedDB setup for offline functionality
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ChroniCompanionDB', 2);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create entries store
                if (!db.objectStoreNames.contains('entries')) {
                    const entriesStore = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
                    entriesStore.createIndex('date', 'date', { unique: false });
                    entriesStore.createIndex('synced', 'synced', { unique: false });
                }

                // Create pending sync store
                if (!db.objectStoreNames.contains('pending_sync')) {
                    db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    setupMobileOptimizations() {
        if (this.isMobile) {
            // Add mobile-specific CSS classes
            document.body.classList.add('mobile-optimized');

            // Enhanced touch feedback for buttons
            this.addTouchFeedback();

            // Prevent zoom on input focus (iOS)
            const metaViewport = document.querySelector('meta[name="viewport"]');
            if (metaViewport) {
                metaViewport.setAttribute('content',
                    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            }

            // Add haptic feedback support
            this.setupHapticFeedback();
        }
    }

    addTouchFeedback() {
        const buttons = document.querySelectorAll('button, .slider');
        buttons.forEach(element => {
            element.addEventListener('touchstart', (e) => {
                element.classList.add('touch-active');
                // Haptic feedback for supported devices
                if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                }
            });

            element.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    element.classList.remove('touch-active');
                }, 150);
            });
        });
    }

    setupHapticFeedback() {
        // Add light haptic feedback for form interactions
        const formElements = document.querySelectorAll('input[type="range"], button');
        formElements.forEach(element => {
            element.addEventListener('change', () => {
                if ('vibrate' in navigator) {
                    navigator.vibrate(5); // Light vibration
                }
            });
        });
    }

    setupOfflineHandling() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNetworkStatus('Connected', 'success');
            this.syncPendingEntries();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNetworkStatus('Offline - Entries will sync when connected', 'warning');
        });
    }

    showNetworkStatus(message, type) {
        const statusEl = document.createElement('div');
        let bgColor, textColor;

        switch (type) {
            case 'success':
                bgColor = 'bg-green-100';
                textColor = 'text-green-800';
                break;
            case 'warning':
                bgColor = 'bg-yellow-100';
                textColor = 'text-yellow-800';
                break;
            case 'info':
                bgColor = 'bg-blue-100';
                textColor = 'text-blue-800';
                break;
            default:
                bgColor = 'bg-gray-100';
                textColor = 'text-gray-800';
        }

        statusEl.className = `fixed top-4 left-4 right-4 p-3 rounded-lg text-sm font-medium z-50 ${bgColor} ${textColor}`;
        statusEl.textContent = message;

        document.body.appendChild(statusEl);

        setTimeout(() => {
            statusEl.remove();
        }, 4000);
    }

    restoreViewState() {
        // Get the last viewed page from localStorage
        const savedView = localStorage.getItem('currentView');

        // If there's a saved view, show it; otherwise default to entry-form
        if (savedView && ['entry-form', 'entries-list', 'dashboard'].includes(savedView)) {
            this.showView(savedView);
        } else {
            this.showView('entry-form');
        }
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('new-entry-btn').addEventListener('click', () => {
            this.showView('entry-form');
        });

        document.getElementById('view-entries-btn').addEventListener('click', () => {
            this.showView('entries-list');
        });

        const exportBtn = document.getElementById('export-btn');
        console.log('🔍 Found export button:', exportBtn);

        if (exportBtn) {
            console.log('✅ Adding click listener to export button...');

            exportBtn.addEventListener('click', () => {
                console.log('🔥 EXPORT BUTTON CLICKED!');
                console.log('🔥 Current view:', this.currentView);

                if (this.currentView === 'dashboard') {
                    console.log('🔥 Calling exportDashboard...');
                    this.exportDashboard();
                } else {
                    console.log('🔥 Calling exportEntries...');
                    this.exportEntries();
                }
            });

            console.log('✅ Export button click listener added successfully');
        } else {
            console.error('❌ Export button not found!');
            alert('❌ Export button not found! Check if element exists.');
        }

        document.getElementById('dashboard-btn').addEventListener('click', () => {
            this.showView('dashboard');
        });

        // Premium and support buttons
        document.getElementById('premium-btn').addEventListener('click', () => {
            this.showPremiumModal();
        });

        document.getElementById('support-btn').addEventListener('click', () => {
            this.showSupportModal();
        });

        // Entry type radio buttons
        const entryTypeRadios = document.querySelectorAll('input[name="entry_type"]');
        entryTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleQuestions(e.target.value);
            });
        });

        // Enhanced slider event listeners for mobile
        const sliders = document.querySelectorAll('.slider');
        sliders.forEach(slider => {
            // Desktop events
            slider.addEventListener('input', (e) => {
                this.updateSliderValue(e.target);
            });

            // Mobile-optimized touch events
            if (this.isMobile) {
                slider.addEventListener('touchstart', (e) => {
                    slider.classList.add('slider-active');
                });

                slider.addEventListener('touchend', (e) => {
                    slider.classList.remove('slider-active');
                    // Trigger change event for haptic feedback
                    slider.dispatchEvent(new Event('change'));
                });

                slider.addEventListener('touchmove', (e) => {
                    // Update value in real-time during touch
                    this.updateSliderValue(slider);
                });
            }
        });

        // Form submission
        document.getElementById('daily-entry-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitEntry();
        });

        // Dashboard filter controls
        document.getElementById('chart-period').addEventListener('change', () => {
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        });

        document.getElementById('chart-metric').addEventListener('change', () => {
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        });

        // AI Insights event listeners
        document.getElementById('get-predictions-btn').addEventListener('click', () => {
            console.log('🎯 DEBUG: Get Predictions button clicked');
            this.loadPredictiveInsights();
        });

        document.getElementById('get-coping-btn').addEventListener('click', () => {
            console.log('🎯 DEBUG: Get Coping button clicked');
            this.loadCopingStrategies();
        });

        document.getElementById('crisis-check-btn').addEventListener('click', () => {
            console.log('🎯 DEBUG: Crisis Check button clicked');
            this.performCrisisCheck();
        });

        document.getElementById('get-coaching-btn').addEventListener('click', () => {
            console.log('🎯 DEBUG: Get Coaching button clicked');
            this.loadWeeklyCoaching();
        });
        
        // Dashboard dropdown change handlers
        document.getElementById('chart-period')?.addEventListener('change', () => {
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        });
        
        document.getElementById('chart-metric')?.addEventListener('change', () => {
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        });
    }

    updateCurrentDate() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);
    }

    initializeSliders() {
        const sliders = document.querySelectorAll('.slider');
        sliders.forEach(slider => {
            this.updateSliderValue(slider);

            // Enhanced mobile slider styling
            if (this.isMobile) {
                slider.style.height = '3rem'; // Larger touch target
                slider.style.borderRadius = '1.5rem';
            }
        });
    }

    updateSliderValue(slider) {
        const valueDisplay = document.getElementById(slider.name + '_value');
        if (valueDisplay) {
            valueDisplay.textContent = slider.value;

            // Add visual feedback for mobile
            if (this.isMobile) {
                valueDisplay.classList.add('value-updated');
                setTimeout(() => {
                    valueDisplay.classList.remove('value-updated');
                }, 200);
            }
        }
    }

    toggleQuestions(entryType) {
        const morningQuestions = document.getElementById('morning-questions');
        const eveningQuestions = document.getElementById('evening-questions');

        if (entryType === 'morning') {
            morningQuestions.classList.remove('hidden');
            eveningQuestions.classList.add('hidden');
        } else if (entryType === 'evening') {
            morningQuestions.classList.add('hidden');
            eveningQuestions.classList.remove('hidden');
        }
    }

    showView(viewId) {
        // Hide all views
        const views = ['entry-form', 'entries-list', 'dashboard'];
        views.forEach(view => {
            document.getElementById(view).classList.add('hidden');
        });

        // Show selected view
        document.getElementById(viewId).classList.remove('hidden');
        this.currentView = viewId;

        // Save current view to localStorage
        localStorage.setItem('currentView', viewId);

        // Update active nav button
        this.updateActiveNavButton(viewId);

        // Show/hide export button based on view
        this.updateExportButtonVisibility(viewId);

        // Load data specific to this view
        if (viewId === 'dashboard') {
            this.loadDashboard();
        } else if (viewId === 'entries-list') {
            this.loadEntries();
        }

        // Refresh ads for the new view
        setTimeout(() => this.refreshAds(), 500);
    }

    updateActiveNavButton(viewId) {
        // Remove active state from all buttons
        const navButtons = document.querySelectorAll('nav button');
        navButtons.forEach(btn => {
            btn.classList.remove('ring-2', 'ring-offset-2');
        });

        // Add active state to current button
        if (viewId === 'entry-form') {
            document.getElementById('new-entry-btn').classList.add('ring-2', 'ring-offset-2', 'ring-sage-300');
        } else if (viewId === 'entries-list') {
            document.getElementById('view-entries-btn').classList.add('ring-2', 'ring-offset-2', 'ring-lavender-300');
        } else if (viewId === 'dashboard') {
            document.getElementById('dashboard-btn').classList.add('ring-2', 'ring-offset-2', 'ring-emerald-300');
        }
    }

    updateExportButtonVisibility(viewId) {
        const exportBtn = document.getElementById('export-btn');
        if (viewId === 'entries-list') {
            // Show export button ONLY on entries page
            exportBtn.style.display = 'flex';
            exportBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Export Data';
        } else {
            // Hide export button on all other pages (dashboard, entry form, etc.)
            exportBtn.style.display = 'none';
        }
    }

    async submitEntry() {
        const form = document.getElementById('daily-entry-form');
        const formData = new FormData(form);

        // Convert FormData to regular object
        const entryData = {};
        for (let [key, value] of formData.entries()) {
            entryData[key] = value;
        }

        // Ensure entry_type is set (default to evening if not selected)
        if (!entryData.entry_type) {
            // Check which radio button is selected
            const morningRadio = document.querySelector('input[name="entry_type"][value="morning"]');
            const eveningRadio = document.querySelector('input[name="entry_type"][value="evening"]');

            if (morningRadio && morningRadio.checked) {
                entryData.entry_type = 'morning';
            } else if (eveningRadio && eveningRadio.checked) {
                entryData.entry_type = 'evening';
            } else {
                // Default to evening if nothing selected
                entryData.entry_type = 'evening';
            }
        }

        // Add timestamp and metadata
        entryData.timestamp = new Date().toISOString();
        entryData.date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        entryData.id = Date.now().toString();
        entryData.synced = false;

        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBase}/api/entries`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(entryData)
                });

                if (response.ok) {
                    entryData.synced = true;
                    try {
                        await this.saveToIndexedDB(entryData);
                    } catch (indexedDBError) {
                        console.error('IndexedDB save failed, using localStorage fallback:', indexedDBError);
                    }
                    
                    // ALWAYS save to localStorage as backup
                    this.saveToLocalStorage(entryData);
                    this.showSuccessMessage('Entry saved successfully!');
                    this.resetForm();
                    
                    // Check if AI cache should be refreshed (8+ hours old)
                    this.checkAICacheRefresh();
                    return;
                } else {
                    throw new Error('Failed to save entry');
                }
            } catch (error) {
                console.log('Failed to sync with server, saving locally');
                try {
                    await this.saveToIndexedDB(entryData);
                    await this.addToPendingSync(entryData);
                } catch (indexedDBError) {
                    console.error('IndexedDB save failed, using localStorage fallback:', indexedDBError);
                }
                
                // ALWAYS save to localStorage as backup
                this.saveToLocalStorage(entryData);
                this.showSuccessMessage('Entry saved offline - will sync when connected');
                this.resetForm();
                
                // Check if AI cache should be refreshed (8+ hours old)
                this.checkAICacheRefresh();
            }
        } else {
            // Offline - save to IndexedDB and localStorage as backup
            try {
                await this.saveToIndexedDB(entryData);
                await this.addToPendingSync(entryData);
            } catch (indexedDBError) {
                console.error('IndexedDB save failed, using localStorage fallback:', indexedDBError);
            }
            
            // ALWAYS save to localStorage as backup
            this.saveToLocalStorage(entryData);
            this.showSuccessMessage('Entry saved offline - will sync when connected');
            this.resetForm();
            
            // Check if AI cache should be refreshed (8+ hours old)
            this.checkAICacheRefresh();
        }
    }

    async saveToIndexedDB(entryData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readwrite');
            const store = transaction.objectStore('entries');
            const request = store.put(entryData);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async addToPendingSync(entryData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pending_sync'], 'readwrite');
            const store = transaction.objectStore('pending_sync');
            const request = store.add({
                data: entryData,
                timestamp: new Date().toISOString()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async syncPendingEntries() {
        if (!this.isOnline || !this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db.transaction(['pending_sync'], 'readwrite');
            const store = transaction.objectStore('pending_sync');
            const request = store.getAll();

            request.onsuccess = async () => {
                const pendingEntries = request.result;

                for (const pendingEntry of pendingEntries) {
                    try {
                        const response = await fetch(`${this.apiBase}/api/entries`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(pendingEntry.data)
                        });

                        if (response.ok) {
                            // Mark as synced in entries store
                            const entryTransaction = this.db.transaction(['entries'], 'readwrite');
                            const entryStore = entryTransaction.objectStore('entries');
                            pendingEntry.data.synced = true;
                            entryStore.put(pendingEntry.data);

                            // Remove from pending sync
                            const deleteTransaction = this.db.transaction(['pending_sync'], 'readwrite');
                            const deleteStore = deleteTransaction.objectStore('pending_sync');
                            deleteStore.delete(pendingEntry.id);
                        }
                    } catch (error) {
                        console.log('Sync failed for entry:', pendingEntry.id);
                    }
                }
                resolve();
            };
        });
    }

    saveToLocalStorage(entryData) {
        // Get existing entries or initialize empty array
        let entries = JSON.parse(localStorage.getItem('chroni_entries') || '[]');

        // Add new entry with unique ID
        entryData.id = Date.now().toString();
        entries.unshift(entryData); // Add to beginning of array

        // Save back to localStorage
        localStorage.setItem('chroni_entries', JSON.stringify(entries));
    }

    loadEntriesFromLocalStorage() {
        try {
            const entries = JSON.parse(localStorage.getItem('chroni_entries') || '[]');
            console.log('📦 DEBUG: Loaded', entries.length, 'entries from localStorage');
            return entries;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return [];
        }
    }

    async loadEntries() {
        // Always load from IndexedDB first for immediate display
        const localEntries = await this.loadEntriesFromIndexedDB();
        this.displayEntries(localEntries);

        // Try to sync with server in background if online
        if (this.isOnline) {
            try {
                const response = await fetch(`${this.apiBase}/api/entries`);
                if (response.ok) {
                    const serverEntries = await response.json();
                    // Merge and update local database
                    await this.mergeEntries(serverEntries);
                    // Reload display with merged data
                    const updatedEntries = await this.loadEntriesFromIndexedDB();
                    this.displayEntries(updatedEntries);
                }
            } catch (error) {
                console.log('Server sync failed, using local data');
            }
        }
    }

    async loadEntriesFromIndexedDB() {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['entries'], 'readonly');
            const store = transaction.objectStore('entries');
            const request = store.getAll();

            request.onsuccess = () => {
                const entries = request.result.sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                resolve(entries);
            };

            request.onerror = () => {
                console.log('Failed to load from IndexedDB, falling back to localStorage');
                const entries = this.loadEntriesFromLocalStorage();
                resolve(entries);
            };
        });
    }

    async mergeEntries(serverEntries) {
        // This function merges server entries with local ones
        for (const serverEntry of serverEntries) {
            serverEntry.synced = true;
            await this.saveToIndexedDB(serverEntry);
        }
    }

    displayEntries(entries) {
        const container = document.getElementById('entries-container');

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-sage-500">
                    <i class="fas fa-book-open text-4xl mb-4"></i>
                    <p class="text-lg">No entries yet. Start your journey by creating your first entry!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = entries.map(entry => this.createEntryCard(entry)).join('');
    }

    createEntryCard(entry) {
        const date = new Date(entry.timestamp || entry.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const entryTypeIcon = entry.entry_type === 'morning' ?
            '<i class="fas fa-sun text-yellow-500"></i>' :
            '<i class="fas fa-moon text-indigo-500"></i>';

        const entryTypeClass = entry.entry_type === 'morning' ? 'border-l-yellow-400' : 'border-l-indigo-400';

        // Get the main text content based on entry type
        let mainContent = '';
        if (entry.entry_type === 'morning') {
            mainContent = entry.morning_feeling || entry.morning_hopes || 'Morning entry';
        } else {
            mainContent = entry.evening_day_review || entry.evening_gratitude || 'Evening entry';
        }

        return `
            <div class="bg-white rounded-xl shadow-md border-l-4 ${entryTypeClass} p-6 hover:shadow-lg transition-shadow duration-200">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center space-x-2">
                        ${entryTypeIcon}
                        <span class="font-medium text-sage-700 capitalize">${entry.entry_type} Entry</span>
                    </div>
                    <div class="text-right text-sm text-sage-500">
                        <div>${formattedDate}</div>
                        <div>${formattedTime}</div>
                    </div>
                </div>
                
                <div class="text-sage-600 mb-4">
                    <p class="line-clamp-3">${this.truncateText(mainContent, 150)}</p>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-smile text-sage-500"></i>
                        <span>Mood: ${entry.mood_overall || 'N/A'}/10</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-battery-half text-sage-500"></i>
                        <span>Energy: ${entry.energy_level || 'N/A'}/10</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-thermometer-half text-lavender-500"></i>
                        <span>Pain: ${entry.pain_level || 'N/A'}/10</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-bed text-lavender-500"></i>
                        <span>Sleep: ${this.formatSleepQuality(entry.sleep_quality)}</span>
                    </div>
                </div>
                
                ${entry.additional_notes ? `
                    <div class="mt-4 pt-4 border-t border-sage-100">
                        <p class="text-sm text-sage-600 italic">"${this.truncateText(entry.additional_notes, 100)}"</p>
                    </div>
                ` : ''}
                
                <div class="mt-4 flex justify-end">
                    <button onclick="app.viewEntryDetails('${entry.id || entry.timestamp}')" class="text-sage-500 hover:text-sage-700 text-sm font-medium">
                        View Details →
                    </button>
                </div>
            </div>
        `;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatSleepQuality(quality) {
        const qualityMap = {
            'excellent': 'Excellent',
            'good': 'Good',
            'fair': 'Fair',
            'poor': 'Poor',
            'very_poor': 'Very Poor'
        };
        return qualityMap[quality] || 'N/A';
    }
    
    convertSleepQualityToNumber(quality) {
        // Convert text sleep quality to numeric values for charting (0-10 scale)
        const qualityToNumber = {
            'excellent': 10,
            'good': 8,
            'fair': 6,
            'poor': 4,
            'very_poor': 2
        };
        
        // Safety check for undefined/null values
        if (!quality) return 0;
        
        return qualityToNumber[quality] || 0;
    }

    async viewEntryDetails(entryId) {
        try {
            // Find the entry in our local data first
            let entry = null;

            // Try to get from IndexedDB first
            if (this.db) {
                const transaction = this.db.transaction(['entries'], 'readonly');
                const store = transaction.objectStore('entries');
                const request = store.get(entryId);

                request.onsuccess = (event) => {
                    entry = event.target.result;
                    if (entry) {
                        this.showEntryModal(entry);
                    }
                };
            }

            // If online, also try to get from API for most up-to-date data
            if (this.isOnline) {
                try {
                    const response = await fetch(`${this.apiBase}/api/entries`);
                    if (response.ok) {
                        const entries = await response.json();
                        entry = entries.find(e => e.id == entryId || e.timestamp === entryId);
                        if (entry) {
                            this.showEntryModal(entry);
                        }
                    }
                } catch (error) {
                    console.log('Could not fetch from API, using local data');
                }
            }

        } catch (error) {
            console.error('Error viewing entry details:', error);
            this.showErrorMessage('Could not load entry details');
        }
    }

    showEntryModal(entry) {
        const modal = document.getElementById('entry-details-modal');
        const title = document.getElementById('modal-title');
        const content = document.getElementById('modal-content');

        // Format date and time
        const date = new Date(entry.timestamp || entry.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        });

        // Set modal title
        const entryTypeIcon = entry.entry_type === 'morning' ?
            '<i class="fas fa-sun text-yellow-500"></i>' :
            '<i class="fas fa-moon text-indigo-500"></i>';
        title.innerHTML = `${entryTypeIcon} ${entry.entry_type ? entry.entry_type.charAt(0).toUpperCase() + entry.entry_type.slice(1) : 'Unknown'} Entry`;

        // Build detailed content
        let html = `
            <div class="mb-6">
                <div class="text-sage-600 text-sm mb-2">${formattedDate}</div>
                <div class="text-sage-500 text-sm">${formattedTime}</div>
            </div>
        `;

        // Show relevant questions based on entry type
        if (entry.entry_type === 'morning') {
            if (entry.morning_feeling) {
                html += `
                    <div class="mb-6">
                        <h4 class="text-lg font-medium text-sage-700 mb-2">How you felt starting the day</h4>
                        <p class="text-sage-600 bg-sage-50 p-4 rounded-lg">${entry.morning_feeling}</p>
                    </div>
                `;
            }
            if (entry.morning_hopes) {
                html += `
                    <div class="mb-6">
                        <h4 class="text-lg font-medium text-sage-700 mb-2">Hopes for the day</h4>
                        <p class="text-sage-600 bg-sage-50 p-4 rounded-lg">${entry.morning_hopes}</p>
                    </div>
                `;
            }
            if (entry.morning_symptoms) {
                html += `
                    <div class="mb-6">
                        <h4 class="text-lg font-medium text-sage-700 mb-2">Morning symptoms</h4>
                        <p class="text-sage-600 bg-sage-50 p-4 rounded-lg">${entry.morning_symptoms}</p>
                    </div>
                `;
            }
        } else {
            if (entry.evening_day_review) {
                html += `
                    <div class="mb-6">
                        <h4 class="text-lg font-medium text-sage-700 mb-2">Day review</h4>
                        <p class="text-sage-600 bg-sage-50 p-4 rounded-lg">${entry.evening_day_review}</p>
                    </div>
                `;
            }
            if (entry.evening_gratitude) {
                html += `
                    <div class="mb-6">
                        <h4 class="text-lg font-medium text-sage-700 mb-2">Gratitude</h4>
                        <p class="text-sage-600 bg-sage-50 p-4 rounded-lg">${entry.evening_gratitude}</p>
                    </div>
                `;
            }
            if (entry.evening_symptoms) {
                html += `
                    <div class="mb-6">
                        <h4 class="text-lg font-medium text-sage-700 mb-2">Evening symptoms</h4>
                        <p class="text-sage-600 bg-sage-50 p-4 rounded-lg">${entry.evening_symptoms}</p>
                    </div>
                `;
            }
        }

        // Wellness metrics
        html += `
            <div class="mb-6">
                <h4 class="text-lg font-medium text-sage-700 mb-4">Wellness Metrics</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-sage-50 p-4 rounded-lg">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-smile text-sage-500 mr-2"></i>
                            <span class="font-medium text-sage-700">Mood</span>
                        </div>
                        <div class="text-2xl font-bold text-sage-800">${entry.mood_overall || 'N/A'}/10</div>
                    </div>
                    <div class="bg-sage-50 p-4 rounded-lg">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-battery-half text-sage-500 mr-2"></i>
                            <span class="font-medium text-sage-700">Energy</span>
                        </div>
                        <div class="text-2xl font-bold text-sage-800">${entry.energy_level || 'N/A'}/10</div>
                    </div>
                    <div class="bg-sage-50 p-4 rounded-lg">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-thermometer-half text-lavender-500 mr-2"></i>
                            <span class="font-medium text-sage-700">Pain</span>
                        </div>
                        <div class="text-2xl font-bold text-sage-800">${entry.pain_level || 'N/A'}/10</div>
                    </div>
                    <div class="bg-sage-50 p-4 rounded-lg">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-bed text-indigo-500 mr-2"></i>
                            <span class="font-medium text-sage-700">Sleep</span>
                        </div>
                        <div class="text-lg font-bold text-sage-800">${this.formatSleepQuality(entry.sleep_quality)}</div>
                    </div>
                </div>
            </div>
        `;

        // Additional notes
        if (entry.additional_notes) {
            html += `
                <div class="mb-6">
                    <h4 class="text-lg font-medium text-sage-700 mb-2">Additional Notes</h4>
                    <p class="text-sage-600 bg-sage-50 p-4 rounded-lg italic">"${entry.additional_notes}"</p>
                </div>
            `;
        }

        // AI insights if available
        if (entry.ai_summary || entry.ai_insights) {
            html += `<div class="border-t border-sage-200 pt-6 mt-6">`;
            if (entry.ai_summary) {
                html += `
                    <div class="mb-4">
                        <h4 class="text-lg font-medium text-sage-700 mb-2 flex items-center">
                            <i class="fas fa-robot text-indigo-500 mr-2"></i>AI Summary
                        </h4>
                        <p class="text-sage-600 bg-indigo-50 p-4 rounded-lg">${entry.ai_summary}</p>
                    </div>
                `;
            }
            if (entry.ai_insights) {
                html += `
                    <div class="mb-4">
                        <h4 class="text-lg font-medium text-sage-700 mb-2 flex items-center">
                            <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>AI Insights
                        </h4>
                        <p class="text-sage-600 bg-yellow-50 p-4 rounded-lg">${entry.ai_insights}</p>
                    </div>
                `;
            }
            html += `</div>`;
        }

        content.innerHTML = html;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    closeEntryModal() {
        const modal = document.getElementById('entry-details-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Restore background scroll
    }

    // ✨ 2025 AI INSIGHTS - OFFLINE-FIRST with FREEMIUM MODEL (Netflix/Spotify Style)
    async loadPredictiveInsights() {
        console.log('🎯 2025 AI: Loading predictive insights with offline-first approach');
        
        const container = document.getElementById('predictions-content');
        if (!container) {
            console.error('❌ predictions-content container not found!');
            return;
        }
        
        // Get user's entries for analysis
        const entries = await this.loadEntriesFromIndexedDB() || this.loadEntriesFromLocalStorage();
        
        if (entries.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-chart-line text-4xl mb-4"></i>
                    <h4 class="font-medium mb-2">Start Your Health Journey</h4>
                    <p class="text-sm">Add some health entries to unlock personalized AI insights!</p>
                    <button onclick="app.showView('entry-form')" class="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                        Add First Entry
                    </button>
                </div>`;
            return;
        }
        
        // 🎯 FREEMIUM LOGIC: Progressive value unlock based on usage
        const userTier = this.getUserTier(entries.length);
        console.log('🎯 User tier determined:', userTier);
        
        if (userTier === 'free') {
            this.showFreeTierAIPreview(container, 'predictions', entries);
            return;
        }
        
        // ⚡ Check offline cache first (8-hour intervals)
        const cacheKey = this.getAICacheKey('predictions', entries);
        const cachedInsights = this.getAICache(cacheKey);
        
        if (cachedInsights) {
            console.log('✅ Using cached offline insights');
            container.innerHTML = cachedInsights;
            return;
        }
        
        // 🤖 Generate insights (online or offline)
        await this.generateSmartInsights(container, 'predictions', entries);
    }
    
    // 🎯 2025 USER TIER SYSTEM (Netflix Model)
    getUserTier(entryCount) {
        if (!this.isPremium && entryCount < 7) return 'free';
        if (!this.isPremium && entryCount < 14) return 'trial_eligible';
        return this.isPremium ? 'premium' : 'freemium';
    }
    
    // 🎁 FREE TIER PREVIEW (Spotify Model - Show Value First)
    showFreeTierAIPreview(container, type, entries) {
        const basicInsights = this.generateBasicOfflineInsights(entries);
        
        container.innerHTML = `
            <div class="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-medium text-blue-800 flex items-center">
                        <i class="fas fa-brain mr-2"></i>AI Health Insights
                    </h4>
                    <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">FREE PREVIEW</span>
                </div>
                
                <div class="space-y-3">
                    ${basicInsights}
                    
                    <div class="border-t border-blue-200 pt-3 mt-3">
                        <div class="bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-dashed border-blue-300">
                            <div class="flex items-center text-blue-600 mb-2">
                                <i class="fas fa-lock mr-2"></i>
                                <span class="font-medium text-sm">Premium AI Features</span>
                            </div>
                            <ul class="text-xs text-blue-700 space-y-1 ml-4">
                                <li>• Detailed pattern analysis</li>
                                <li>• Predictive health trends</li>
                                <li>• Personalized recommendations</li>
                                <li>• Weekly coaching insights</li>
                            </ul>
                            <button onclick="app.showSoftPaywall('insights')" class="mt-3 w-full bg-blue-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                                ✨ Unlock Full AI Analysis - 7 Days Free
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="text-xs text-blue-600 mt-3 flex items-center">
                    <i class="fas fa-offline mr-1"></i>
                    <span>Works offline • Based on ${entries.length} entries</span>
                </div>
            </div>`;
    }
    
    // 🧠 OFFLINE AI - SMART LOCAL INSIGHTS
    generateBasicOfflineInsights(entries) {
        const recentEntries = entries.slice(0, 7);
        const patterns = this.analyzeBasicPatterns(recentEntries);
        
        return `
            <div class="space-y-2 text-sm">
                <div class="flex items-center text-green-600">
                    <i class="fas fa-chart-up mr-2"></i>
                    <span><strong>Trend:</strong> ${patterns.trend}</span>
                </div>
                <div class="flex items-center text-blue-600">
                    <i class="fas fa-bullseye mr-2"></i>
                    <span><strong>Focus Area:</strong> ${patterns.focus}</span>
                </div>
                <div class="flex items-center text-purple-600">
                    <i class="fas fa-lightbulb mr-2"></i>
                    <span><strong>Quick Tip:</strong> ${patterns.tip}</span>
                </div>
            </div>`;
    }
    
    // 📊 SMART PATTERN ANALYSIS (Works Offline)
    analyzeBasicPatterns(entries) {
        if (entries.length === 0) return { trend: 'No data', focus: 'Start tracking', tip: 'Add your first entry' };
        
        const avgMood = this.calculateAverage(entries, 'mood_overall');
        const avgEnergy = this.calculateAverage(entries, 'energy_level');
        const avgPain = this.calculateAverage(entries, 'pain_level');
        
        let trend = avgMood >= 7 ? 'Positive mood patterns' : avgMood >= 5 ? 'Stable mood trends' : 'Focus on mood support needed';
        let focus = avgEnergy < 5 ? 'Energy management' : avgPain > 6 ? 'Pain management' : 'Overall wellness';
        let tip = avgEnergy < 5 ? 'Try gentle morning stretches' : avgMood < 5 ? 'Consider mindfulness breaks' : 'Keep up the great work!';
        
        return { trend, focus, tip };
    }
    
    // 🎯 2025 SOFT PAYWALL (Tinder/Duolingo Style)
    showSoftPaywall(feature) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
                <div class="text-center">
                    <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <i class="fas fa-brain text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">Unlock Your Full Health Potential</h3>
                    <p class="text-gray-600 mb-6">Get comprehensive AI insights, predictive analysis, and personalized recommendations.</p>
                    
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div class="font-medium text-green-800 mb-2">✨ 7-Day Free Trial</div>
                        <div class="text-sm text-green-700">Full access to all AI features • Cancel anytime</div>
                    </div>
                    
                    <button onclick="app.startPremiumTrial(); app.closeSoftPaywall()" class="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all">
                        Start Free Trial
                    </button>
                    
                    <button onclick="app.closeSoftPaywall()" class="w-full mt-3 text-gray-500 py-2 text-sm hover:text-gray-700">
                        Maybe Later
                    </button>
                </div>
            </div>`;
        
        document.body.appendChild(modal);
        modal.paywall = true;
    }
    
    closeSoftPaywall() {
        const modal = document.querySelector('[class*="fixed inset-0"]');
        if (modal && modal.paywall) {
            modal.remove();
        }
    }
    
    // 🤖 SMART INSIGHTS GENERATOR (Online + Offline Hybrid)
    async generateSmartInsights(container, type, entries) {
        container.innerHTML = '<div class="text-center py-4"><i class="fas fa-brain fa-spin mr-2 text-blue-500"></i>Analyzing your patterns...</div>';
        
        try {
            // Try online AI first
            const response = await fetch(`${this.apiBase}/api/ai/predictive-insights?days=7`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                const insights = result.insights || {};
                const prediction = insights.prediction || result.message || 'Unable to generate insights at this time.';
                
                const onlineContent = `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="font-medium text-blue-800 mb-2 flex items-center">
                            <i class="fas fa-crystal-ball mr-2"></i>AI Health Predictions
                        </h4>
                        <p class="text-blue-700 text-sm">${prediction}</p>
                        ${insights.suggestions && insights.suggestions.length > 0 ? `
                            <div class="mt-2 text-blue-600 text-xs">
                                <strong>Suggestions:</strong> ${insights.suggestions.join(', ')}
                            </div>
                        ` : ''}
                        <div class="text-xs text-blue-500 mt-3 flex items-center">
                            <i class="fas fa-cloud mr-1"></i>
                            <span>Powered by AI • Cached until next refresh (8hr intervals)</span>
                        </div>
                    </div>`;
                
                // Cache the successful response
                this.setAICache(this.getAICacheKey('predictions', entries), onlineContent);
                container.innerHTML = onlineContent;
                return;
            } else {
                throw new Error(`Server returned ${response.status}`);
            }
        } catch (error) {
            console.log('🔄 Online AI failed, using offline insights:', error.message);
            
            // Fallback to offline intelligent analysis
            const offlineInsights = this.generateAdvancedOfflineInsights(entries);
            const offlineContent = `
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 class="font-medium text-purple-800 mb-2 flex items-center">
                        <i class="fas fa-brain mr-2"></i>Smart Health Analysis
                    </h4>
                    ${offlineInsights}
                    <div class="text-xs text-purple-500 mt-3 flex items-center">
                        <i class="fas fa-offline mr-1"></i>
                        <span>Offline AI • Based on your ${entries.length} health entries</span>
                    </div>
                </div>`;
            
            container.innerHTML = offlineContent;
        }
    }
    
    // 🧠 ADVANCED OFFLINE AI (When Backend is Down)
    generateAdvancedOfflineInsights(entries) {
        const analysis = this.performDeepPatternAnalysis(entries);
        
        return `
            <div class="space-y-3 text-sm">
                <div class="bg-white/70 rounded-lg p-3">
                    <div class="font-medium text-purple-700 mb-2 flex items-center">
                        <i class="fas fa-chart-trending-up mr-2"></i>Pattern Analysis
                    </div>
                    <p class="text-purple-600">${analysis.patterns}</p>
                </div>
                
                <div class="bg-white/70 rounded-lg p-3">
                    <div class="font-medium text-purple-700 mb-2 flex items-center">
                        <i class="fas fa-target mr-2"></i>Recommendations
                    </div>
                    <ul class="text-purple-600 space-y-1">
                        ${analysis.recommendations.map(rec => `<li>• ${rec}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="bg-white/70 rounded-lg p-3">
                    <div class="font-medium text-purple-700 mb-2 flex items-center">
                        <i class="fas fa-crystal-ball mr-2"></i>Prediction
                    </div>
                    <p class="text-purple-600">${analysis.prediction}</p>
                </div>
            </div>`;
    }
    
    // 🔬 DEEP PATTERN ANALYSIS (Advanced Offline AI)
    performDeepPatternAnalysis(entries) {
        const recent = entries.slice(0, 14); // Last 2 weeks
        const older = entries.slice(14, 28); // Previous 2 weeks
        
        const recentAvgs = {
            mood: this.calculateAverage(recent, 'mood_overall'),
            energy: this.calculateAverage(recent, 'energy_level'),
            pain: this.calculateAverage(recent, 'pain_level'),
            anxiety: this.calculateAverage(recent, 'anxiety_level'),
            fatigue: this.calculateAverage(recent, 'fatigue_level')
        };
        
        const olderAvgs = older.length > 0 ? {
            mood: this.calculateAverage(older, 'mood_overall'),
            energy: this.calculateAverage(older, 'energy_level'),
            pain: this.calculateAverage(older, 'pain_level'),
            anxiety: this.calculateAverage(older, 'anxiety_level'),
            fatigue: this.calculateAverage(older, 'fatigue_level')
        } : recentAvgs;
        
        // Trend analysis
        const moodTrend = recentAvgs.mood > olderAvgs.mood ? 'improving' : recentAvgs.mood < olderAvgs.mood ? 'declining' : 'stable';
        const energyTrend = recentAvgs.energy > olderAvgs.energy ? 'increasing' : recentAvgs.energy < olderAvgs.energy ? 'decreasing' : 'stable';
        
        // Generate insights
        let patterns = `Your mood is ${moodTrend} (${recentAvgs.mood.toFixed(1)}/10) and energy levels are ${energyTrend} (${recentAvgs.energy.toFixed(1)}/10).`;
        
        if (recentAvgs.pain > 6) {
            patterns += ` Pain levels are elevated (${recentAvgs.pain.toFixed(1)}/10), which may be impacting other areas.`;
        }
        
        // Recommendations based on patterns
        const recommendations = [];
        if (recentAvgs.mood < 6) recommendations.push('Focus on mood-boosting activities like gentle exercise or social connection');
        if (recentAvgs.energy < 5) recommendations.push('Consider sleep optimization and energy management techniques');
        if (recentAvgs.pain > 6) recommendations.push('Explore pain management strategies and discuss with healthcare provider');
        if (recentAvgs.anxiety > 6) recommendations.push('Practice stress reduction techniques like deep breathing or meditation');
        if (recommendations.length === 0) recommendations.push('Continue your current wellness practices - you\'re doing great!');
        
        // Prediction
        let prediction = '';
        if (moodTrend === 'improving' && energyTrend === 'increasing') {
            prediction = 'Based on current trends, you may continue to see improvements in overall wellbeing.';
        } else if (moodTrend === 'declining' || energyTrend === 'decreasing') {
            prediction = 'Consider focusing on the recommended areas to help reverse current trends.';
        } else {
            prediction = 'Your health patterns show stability. Small consistent changes can lead to improvements.';
        }
        
        return { patterns, recommendations: recommendations.slice(0, 3), prediction };
    }
    
    // 📊 UTILITY: Calculate averages safely
    calculateAverage(entries, field) {
        if (!entries || entries.length === 0) return 0;
        const values = entries.map(entry => parseFloat(entry[field])).filter(val => !isNaN(val));
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
                                <strong>Suggestions:</strong> ${insights.suggestions.join(', ')}
                            </div>
                        ` : ''}
                        ${result.based_on_entries ? `<div class="text-blue-600 text-xs mt-2">Based on ${result.based_on_entries} recent entries</div>` : ''}
                        <div class="text-blue-500 text-xs mt-2">💾 Cached until next refresh (8hr intervals)</div>
                    </div>
                `;
                
                container.innerHTML = htmlContent;
                
                // Cache the response
                this.setAICache('predictive-insights', htmlContent);
            } else {
                throw new Error('AI service unavailable');
            }
        } catch (error) {
            container.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-700 text-sm">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        AI predictions temporarily unavailable. Please try again later.
                    </p>
                </div>
            `;
        }
    }

    async loadCopingStrategies() {
        // TEMPORARILY DISABLED: Remove paywall until Play Store integration is complete
        // if (!this.isPremium) {
        //     this.showPremiumModal();
        //     return;
        // }

        const container = document.getElementById('coping-content');
        console.log('🔍 DEBUG: coping-content container found:', !!container);
        
        if (!container) {
            console.error('❌ coping-content container not found!');
            return;
        }
        
        // Check for cached response first
        const cachedResponse = this.getAICache('coping-strategies');
        if (cachedResponse) {
            console.log('✅ Using cached coping strategies');
            container.innerHTML = cachedResponse;
            return;
        }
        
        container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Finding personalized strategies...</div>';

        try {
            // Get recent entries to assess current symptoms
            const recentEntries = await this.loadEntriesFromIndexedDB();
            const latestEntry = recentEntries[0] || {};
            
            const currentSymptoms = {
                mood: latestEntry.mood_overall || 5,
                energy: latestEntry.energy_level || 5,
                pain: latestEntry.pain_level || 0,
                anxiety: latestEntry.anxiety_level || 0,
                fatigue: latestEntry.fatigue_level || 0
            };

            const response = await fetch(`${this.apiBase}/api/ai/coping-strategies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_symptoms: currentSymptoms })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('🔍 DEBUG: Coping strategies response:', result);
                
                const strategies = result.strategies || {};
                let strategyHtml = '';
                
                if (strategies.immediate_strategies && strategies.immediate_strategies.length > 0) {
                    strategyHtml += `<div class="mb-3"><strong>Immediate strategies:</strong><br>• ${strategies.immediate_strategies.join('<br>• ')}</div>`;
                }
                if (strategies.energy_management && strategies.energy_management.length > 0) {
                    strategyHtml += `<div class="mb-3"><strong>Energy management:</strong><br>• ${strategies.energy_management.join('<br>• ')}</div>`;
                }
                if (strategies.self_care && strategies.self_care.length > 0) {
                    strategyHtml += `<div class="mb-3"><strong>Self-care:</strong><br>• ${strategies.self_care.join('<br>• ')}</div>`;
                }
                if (strategies.mood_support && strategies.mood_support.length > 0) {
                    strategyHtml += `<div class="mb-3"><strong>Mood support:</strong><br>• ${strategies.mood_support.join('<br>• ')}</div>`;
                }
                
                const htmlContent = `
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 class="font-medium text-green-800 mb-2 flex items-center">
                            <i class="fas fa-heart mr-2"></i>Personalized Coping Strategies
                        </h4>
                        <div class="text-green-700 text-sm">${strategyHtml || 'Take gentle breaths and be kind to yourself.'}</div>
                        <div class="text-green-500 text-xs mt-2">💾 Cached until next refresh (8hr intervals)</div>
                    </div>
                `;
                
                container.innerHTML = htmlContent;
                
                // Cache the response
                this.setAICache('coping-strategies', htmlContent);
            } else {
                throw new Error('AI service unavailable');
            }
        } catch (error) {
            container.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-700 text-sm">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Coping strategies temporarily unavailable. Please try again later.
                    </p>
                </div>
            `;
        }
    }

    async performCrisisCheck() {
        const container = document.getElementById('crisis-content');
        console.log('🔍 DEBUG: crisis-content container found:', !!container);
        
        if (!container) {
            console.error('❌ crisis-content container not found!');
            return;
        }
        
        container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Performing wellness check...</div>';

        // This is always free - crisis intervention should never be paywalled
        try {
            const response = await fetch(`${this.apiBase}/api/ai/crisis-check`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                console.log('🔍 DEBUG: Crisis check response:', result);
                
                // Handle nested response structure
                const analysis = result.analysis || result;
                const alertLevel = analysis.risk_level || result.risk_level || 'low';
                const message = analysis.supportive_message || analysis.message || result.message || 'You\'re taking good care of yourself by tracking your health.';
                const colorClass = alertLevel === 'high' ? 'red' : alertLevel === 'medium' ? 'yellow' : 'green';
                
                container.innerHTML = `
                    <div class="bg-${colorClass}-50 border border-${colorClass}-200 rounded-lg p-4">
                        <h4 class="font-medium text-${colorClass}-800 mb-2 flex items-center">
                            <i class="fas fa-shield-heart mr-2"></i>Wellness Check
                        </h4>
                        <p class="text-${colorClass}-700 text-sm">${message}</p>
                        ${result.analyzed_entries ? `<div class="mt-2 text-${colorClass}-600 text-xs">Based on ${result.analyzed_entries} recent entries</div>` : ''}
                    </div>
                `;
            } else {
                throw new Error('Crisis check unavailable');
            }
        } catch (error) {
            container.innerHTML = `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 class="font-medium text-blue-800 mb-2 flex items-center">
                        <i class="fas fa-shield-heart mr-2"></i>Wellness Resources
                    </h4>
                    <p class="text-blue-700 text-sm">
                        If you're in crisis, please reach out:<br>
                        • National Suicide Prevention Lifeline: 988<br>
                        • Crisis Text Line: Text HOME to 741741<br>
                        • Emergency Services: 911
                    </p>
                </div>
            `;
        }
    }

    async loadWeeklyCoaching() {
        // TEMPORARILY DISABLED: Remove paywall until Play Store integration is complete
        // if (!this.isPremium) {
        //     this.showPremiumModal();
        //     return;
        // }

        const container = document.getElementById('coaching-content');
        console.log('🔍 DEBUG: coaching-content container found:', !!container);
        
        if (!container) {
            console.error('❌ coaching-content container not found!');
            return;
        }
        
        container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Preparing your weekly reflection...</div>';

        try {
            const response = await fetch(`${this.apiBase}/api/ai/weekly-reflection`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                console.log('🔍 DEBUG: Weekly coaching response:', result);
                
                const reflection = result.reflection || result.message || 'Great work tracking your health this week!';
                
                container.innerHTML = `
                    <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 class="font-medium text-purple-800 mb-2 flex items-center">
                            <i class="fas fa-graduation-cap mr-2"></i>Weekly Reflection
                        </h4>
                        <p class="text-purple-700 text-sm">${reflection}</p>
                        ${result.entries_count ? `<div class="text-purple-600 text-xs mt-2">Based on ${result.entries_count} entries</div>` : ''}
                    </div>
                `;
            } else {
                throw new Error('Reflection service unavailable');
            }
        } catch (error) {
            container.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-700 text-sm">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Weekly reflection temporarily unavailable. Please try again later.
                    </p>
                </div>
            `;
        }
    }

    // AdSense Integration
    initializeAds() {
        try {
            // Initialize AdSense ads after page load
            if (typeof window.adsbygoogle !== 'undefined') {
                // Push ads to queue for loading
                const ads = document.querySelectorAll('.adsbygoogle');
                ads.forEach(ad => {
                    if (!ad.dataset.adsbygoogleStatus) {
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
                    }
                });
            } else {
                // AdSense script not loaded yet, try again in 1 second
                setTimeout(() => this.initializeAds(), 1000);
            }
        } catch (error) {
            console.log('AdSense initialization failed:', error);
        }
    }

    refreshAds() {
        // Refresh ads when switching views
        try {
            if (typeof window.adsbygoogle !== 'undefined') {
                const ads = document.querySelectorAll('.adsbygoogle');
                ads.forEach(ad => {
                    // Only refresh ads that haven't been loaded yet
                    if (!ad.dataset.adsbygoogleStatus) {
                        (window.adsbygoogle = window.adsbygoogle || []).push({});
                    }
                });
            }
        } catch (error) {
            console.log('Ad refresh failed:', error);
        }
    }

    // Premium & Monetization Functions
    showPremiumModal() {
        const modal = document.getElementById('premium-modal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closePremiumModal() {
        const modal = document.getElementById('premium-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    showSupportModal() {
        const modal = document.getElementById('support-modal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Refresh ads when support modal opens
        setTimeout(() => this.refreshAds(), 300);
    }

    closeSupportModal() {
        const modal = document.getElementById('support-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        // Hide ads when modal closes (reset for next time)
        const ad1 = document.getElementById('support-ad-1');
        const ad2 = document.getElementById('support-ad-2');
        if (ad1) ad1.classList.add('hidden');
        if (ad2) ad2.classList.add('hidden');
    }

    startPremiumTrial() {
        console.log('🔥 DEBUG: startPremiumTrial() called');
        
        // Store trial start date
        const trialStart = new Date().toISOString();
        localStorage.setItem('premium_trial_start', trialStart);
        localStorage.setItem('premium_status', 'trial');
        
        console.log('🔥 DEBUG: Set premium_trial_start:', trialStart);
        console.log('🔥 DEBUG: Set premium_status:', 'trial');

        // Enable premium features IMMEDIATELY
        this.isPremium = true;
        this.updateUIForPremium();
        
        console.log('🔥 DEBUG: Set isPremium to:', this.isPremium);

        this.showSuccessMessage('7-day premium trial started! Enjoy AI-powered insights!');
        this.closePremiumModal();
        
        // Force UI updates immediately without checking premium status again
        setTimeout(() => {
            console.log('🔥 DEBUG: Post-trial UI update...');
            
            // Force update the AI button states immediately
            this.updateAIButtonStates();
            this.updateAIStatusIndicator();
            
            // Test if AI functions work now
            console.log('🔥 DEBUG: Testing AI access - isPremium:', this.isPremium);
            console.log('🔥 DEBUG: localStorage check - premium_status:', localStorage.getItem('premium_status'));
        }, 100);
    }

    watchSupportAd() {
        // Show the ads when user clicks "Watch a Short Ad"
        this.showInfoMessage('Loading ads... Thank you for supporting ChroniCompanion! 💙');

        // Show both ad containers
        const ad1 = document.getElementById('support-ad-1');
        const ad2 = document.getElementById('support-ad-2');
        
        if (ad1) ad1.classList.remove('hidden');
        if (ad2) ad2.classList.remove('hidden');

        // Refresh/load the ads
        setTimeout(() => {
            this.refreshAds();
        }, 500);

        // Simulate ad completion
        setTimeout(() => {
            this.showSuccessMessage('Thank you for watching! Your support helps keep this app free.');
        }, 3000);
    }

    donate(amount) {
        // Real Ko-fi integration
        this.showInfoMessage(`Redirecting to Ko-fi for $${amount} donation...`);

        // Redirect to Ko-fi with specific amount
        const kofiUrl = `https://ko-fi.com/chronicompanion?amount=${amount}`;
        
        // Open Ko-fi in new tab/window
        setTimeout(() => {
            window.open(kofiUrl, '_blank');
            this.closeSupportModal();
            this.showSuccessMessage('Thank you for supporting ChroniCompanion! ❤️');
        }, 1000);
    }

    openKofi() {
        // Open Ko-fi page for custom donations
        this.showInfoMessage('Opening Ko-fi page for custom donations...');
        
        setTimeout(() => {
            window.open('https://ko-fi.com/chronicompanion', '_blank');
            this.closeSupportModal();
            this.showSuccessMessage('Thank you for considering supporting ChroniCompanion! ❤️');
        }, 1000);
    }

    updateUIForPremium() {
        // Add premium indicator to UI
        const premiumBtn = document.getElementById('premium-btn');
        if (this.isPremium) {
            premiumBtn.innerHTML = '<i class="fas fa-crown mr-2"></i>Premium';
            premiumBtn.classList.add('ring-2', 'ring-yellow-300');
        }
        
        // Update AI button states
        this.updateAIButtonStates();
    }
    
    updateAIButtonStates() {
        // Update premium-required AI buttons
        const aiButtons = [
            { id: 'get-predictions-btn', text: 'Get Insights' },
            { id: 'get-coping-btn', text: 'Get Help' },
            { id: 'get-coaching-btn', text: 'Get Coached' }
        ];
        
        aiButtons.forEach(buttonInfo => {
            const button = document.getElementById(buttonInfo.id);
            if (button) {
                if (this.isPremium) {
                    // Remove lock, make it look available
                    button.innerHTML = `<i class="fas fa-check mr-1 text-xs"></i>${buttonInfo.text}`;
                    button.title = 'AI feature available with your premium subscription';
                } else {
                    // Show lock and make it clear it's premium
                    button.innerHTML = `<i class="fas fa-lock mr-1 text-xs"></i>${buttonInfo.text} (Premium)`;
                    button.title = 'Unlock with 7-day free trial';
                }
            }
        });
        
        // Crisis check is always free
        const crisisBtn = document.getElementById('crisis-check-btn');
        if (crisisBtn) {
            crisisBtn.innerHTML = '<i class="fas fa-heart mr-1 text-xs"></i>Check In (Free)';
            crisisBtn.title = 'Always free - your safety matters';
        }
        
        // Update AI status indicator
        this.updateAIStatusIndicator();
    }
    
    updateAIStatusIndicator() {
        const indicator = document.getElementById('ai-status-indicator');
        if (!indicator) return;
        
        let statusHTML;
        
        if (this.isPremium) {
            // Premium active - AI available
            statusHTML = `
                <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center text-green-600">
                        <div class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        <span class="font-medium">AI Health Companion Active</span>
                    </div>
                    <div class="text-purple-500">
                        <i class="fas fa-robot mr-1"></i>
                        Premium unlocked
                    </div>
                </div>
            `;
        } else {
            // Free user - show upgrade path
            statusHTML = `
                <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center text-orange-600">
                        <div class="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                        <span>AI Companion Locked</span>
                    </div>
                    <button onclick="app.showPremiumModal()" class="text-purple-600 hover:text-purple-800 font-medium flex items-center">
                        <i class="fas fa-unlock mr-1"></i>
                        Get 7-Day Free Trial
                    </button>
                </div>
                <div class="mt-2 text-xs text-gray-600">
                    Unlock AI predictions, coping strategies, and personalized coaching
                </div>
            `;
        }
        
        indicator.innerHTML = statusHTML;
    }
    
    async initializeQuickInsights() {
        console.log('🔍 Initializing Quick Insights...');
        try {
            // Load entries for Quick Insights
            const entries = await this.loadEntriesFromIndexedDB();
            console.log('🔍 Loaded', entries.length, 'entries for Quick Insights');
            
            if (entries.length === 0) {
                // Try localStorage fallback
                const localEntries = this.loadEntriesFromLocalStorage();
                console.log('🔍 Fallback: Found', localEntries.length, 'entries in localStorage');
                
                if (localEntries.length > 0) {
                    this.updateQuickInsights(localEntries);
                } else {
                    this.updateQuickInsights([]);
                }
            } else {
                this.updateQuickInsights(entries);
            }
        } catch (error) {
            console.error('Failed to initialize Quick Insights:', error);
            this.updateQuickInsights([]);
        }
    }

    checkPremiumStatus() {
        const trialStart = localStorage.getItem('premium_trial_start');
        const premiumStatus = localStorage.getItem('premium_status');
        
        console.log('🔍 DEBUG: Premium Status Check called');
        console.log('🔍 DEBUG: Trial Start:', trialStart);
        console.log('🔍 DEBUG: Premium Status:', premiumStatus);
        console.log('🔍 DEBUG: Current isPremium before check:', this.isPremium);
        
        // If premium is already true and status is trial, don't override it
        if (this.isPremium && premiumStatus === 'trial') {
            console.log('🔍 DEBUG: Premium already active from trial, skipping override');
            this.updateAIButtonStates();
            this.updateAIStatusIndicator();
            return;
        }

        if (trialStart && premiumStatus === 'trial') {
            const trialStartDate = new Date(trialStart);
            const now = new Date();
            const daysSinceStart = (now - trialStartDate) / (1000 * 60 * 60 * 24);
            
            console.log('🔍 DEBUG: Days since trial start:', daysSinceStart);

            if (daysSinceStart < 7) {
                this.isPremium = true;
                this.updateUIForPremium();
                console.log('✅ DEBUG: Trial active - Premium enabled');
            } else {
                // Trial expired
                localStorage.setItem('premium_status', 'expired');
                this.isPremium = false;
                console.log('⚠️ DEBUG: Trial expired - Premium disabled');
            }
        } else if (premiumStatus === 'active') {
            this.isPremium = true;
            this.updateUIForPremium();
            console.log('✅ DEBUG: Premium subscription active');
        } else {
            this.isPremium = false;
            console.log('❌ DEBUG: No premium status - Free user');
        }
        
        console.log('🔍 DEBUG: Final isPremium status:', this.isPremium);
        console.log('🔍 DEBUG: localStorage premium_trial_start:', localStorage.getItem('premium_trial_start'));
        console.log('🔍 DEBUG: localStorage premium_status:', localStorage.getItem('premium_status'));
        
        // Update UI elements when premium status changes
        this.updateAIButtonStates();
        this.updateAIStatusIndicator();
    }
    
    // DEBUG: Helper function to check premium status from console
    debugPremiumStatus() {
        console.log('🔍 DEBUG HELPER: Current Premium Status');
        console.log('🔍 isPremium:', this.isPremium);
        console.log('🔍 premium_trial_start:', localStorage.getItem('premium_trial_start'));
        console.log('🔍 premium_status:', localStorage.getItem('premium_status'));
        
        const trialStart = localStorage.getItem('premium_trial_start');
        if (trialStart) {
            const trialStartDate = new Date(trialStart);
            const now = new Date();
            const daysSinceStart = (now - trialStartDate) / (1000 * 60 * 60 * 24);
            console.log('🔍 Days since trial start:', daysSinceStart);
        }
        
        return {
            isPremium: this.isPremium,
            trialStart: localStorage.getItem('premium_trial_start'),
            premiumStatus: localStorage.getItem('premium_status')
        };
    }
    
    // DEBUG: Test AI access manually
    testAIAccess() {
        console.log('🧪 TESTING AI ACCESS:');
        console.log('🧪 isPremium:', this.isPremium);
        console.log('🧪 localStorage premium_status:', localStorage.getItem('premium_status'));
        console.log('🧪 localStorage premium_trial_start:', localStorage.getItem('premium_trial_start'));
        
        // Try to call an AI function
        console.log('🧪 Attempting to call loadPredictiveInsights...');
        this.loadPredictiveInsights();
        
        return 'Check console for results';
    }

    // AI Debug Panel Functions
    async toggleAIDebug() {
        const panel = document.getElementById('ai-debug-panel');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            await this.loadAIDebugInfo();
        } else {
            panel.classList.add('hidden');
        }
    }

    async loadAIDebugInfo() {
        const content = document.getElementById('ai-debug-content');
        content.innerHTML = '<div class="text-blue-600">Loading debug info...</div>';

        try {
            // Get backend AI debug status
            const response = await fetch(`${this.apiBase}/api/ai/debug`);
            const debugInfo = await response.json();

            // Get frontend AI status
            const frontendInfo = {
                isPremium: this.isPremium,
                premiumStatus: localStorage.getItem('premium_status'),
                trialStart: localStorage.getItem('premium_trial_start'),
                cacheKeys: Object.keys(localStorage).filter(key => key.startsWith('ai_cache_'))
            };

            content.innerHTML = `
                <div class="space-y-2">
                    <div><strong>Backend Status:</strong></div>
                    <div class="ml-2">
                        <div>🔑 OpenAI Enabled: <span class="${debugInfo.openai_enabled ? 'text-green-600' : 'text-red-600'}">${debugInfo.openai_enabled}</span></div>
                        <div>🗝️ Has API Key: <span class="${debugInfo.has_api_key ? 'text-green-600' : 'text-red-600'}">${debugInfo.has_api_key}</span></div>
                        <div>🎯 Model: ${debugInfo.model || 'None'}</div>
                        <div>⚡ Client Ready: <span class="${debugInfo.client_initialized ? 'text-green-600' : 'text-red-600'}">${debugInfo.client_initialized}</span></div>
                        ${debugInfo.api_key_preview ? `<div>🔐 Key Preview: ${debugInfo.api_key_preview}</div>` : ''}
                    </div>
                    
                    <div class="pt-2"><strong>Frontend Status:</strong></div>
                    <div class="ml-2">
                        <div>💎 Premium Status: <span class="${frontendInfo.isPremium ? 'text-green-600' : 'text-orange-600'}">${frontendInfo.isPremium}</span></div>
                        <div>📅 Trial Start: ${frontendInfo.trialStart || 'None'}</div>
                        <div>💾 Cache Entries: ${frontendInfo.cacheKeys.length}</div>
                    </div>
                    
                    <div class="pt-2"><strong>Last Updated:</strong> ${new Date().toLocaleTimeString()}</div>
                </div>
            `;
        } catch (error) {
            content.innerHTML = `<div class="text-red-600">Error loading debug info: ${error.message}</div>`;
        }
    }

    async testOpenAIConnection() {
        const content = document.getElementById('ai-debug-content');
        const originalContent = content.innerHTML;
        content.innerHTML = '<div class="text-blue-600">🧪 Testing OpenAI connection...</div>';

        try {
            // Test with a simple predictive insights call
            const response = await fetch(`${this.apiBase}/api/ai/predictive-insights?days=7`);
            const result = await response.json();
            
            content.innerHTML = `
                ${originalContent}
                <div class="pt-2 border-t border-gray-300">
                    <strong>🧪 OpenAI Test Result:</strong>
                    <div class="ml-2 mt-1 p-2 bg-white rounded text-xs">
                        <div>Status: <span class="${response.ok ? 'text-green-600' : 'text-red-600'}">${response.status}</span></div>
                        <div>Response: ${JSON.stringify(result, null, 2)}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            content.innerHTML = `
                ${originalContent}
                <div class="pt-2 border-t border-gray-300">
                    <strong>🧪 OpenAI Test Failed:</strong>
                    <div class="ml-2 mt-1 p-2 bg-red-50 rounded text-xs text-red-700">
                        ${error.message}
                    </div>
                </div>
            `;
        }
    }

    clearAICache() {
        const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('ai_cache_'));
        cacheKeys.forEach(key => localStorage.removeItem(key));
        this.showInfoMessage(`Cleared ${cacheKeys.length} AI cache entries`);
        this.loadAIDebugInfo(); // Refresh debug info
    }

    showMobileDownloadModal(url, filename, blob) {
        // Create mobile download modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.id = 'pdf-download-modal';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                <div class="text-center mb-6">
                    <i class="fas fa-file-pdf text-red-500 text-4xl mb-3"></i>
                    <h3 class="text-xl font-bold text-gray-800">Your Health Report is Ready!</h3>
                    <p class="text-gray-600 text-sm mt-2">PDF format • ${filename}</p>
                </div>
                
                <div class="space-y-3">
                    <button id="mobile-download-btn" 
                       class="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center">
                        <i class="fas fa-download mr-2"></i>Download PDF
                    </button>
                    
                    <button id="share-pdf-btn" 
                       class="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center">
                        <i class="fas fa-share mr-2"></i>Share PDF
                    </button>
                    
                    <button onclick="app.closePdfModal()" 
                            class="w-full text-gray-600 py-2 hover:text-gray-800">
                        Close
                    </button>
                </div>
                
                <div class="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p class="text-xs text-blue-700">
                        <i class="fas fa-info-circle mr-1"></i>
                        Try "Share PDF" if download doesn't work. This will let you save to Files, email, or other apps.
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Add event listeners for the buttons
        const downloadBtn = modal.querySelector('#mobile-download-btn');
        const shareBtn = modal.querySelector('#share-pdf-btn');

        downloadBtn.addEventListener('click', () => {
            this.tryMobileDownload(url, filename, blob);
        });

        shareBtn.addEventListener('click', () => {
            this.tryMobileShare(filename, blob);
        });

        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                this.closePdfModal();
            }
        }, 30000);
    }

    async tryMobileDownload(url, filename, blob) {
        try {
            // Method 1: Try direct blob download with user interaction
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            a.target = '_blank';

            // Add to DOM, click, and remove
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Give user feedback
            this.showSuccessMessage('Download started! Check your Downloads folder or notification bar.');
            this.closePdfModal();

        } catch (error) {
            console.error('Direct download failed:', error);
            this.showErrorMessage('Download failed. Please try the Share option instead.');
        }
    }

    async tryMobileShare(filename, blob) {
        try {
            // Method 2: Use Web Share API if available
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], filename, { type: 'application/pdf' });

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'ChroniCompanion Health Report',
                        text: 'Your personal health tracking report',
                        files: [file]
                    });

                    this.showSuccessMessage('PDF shared successfully!');
                    this.closePdfModal();
                    return;
                }
            }

            // Fallback: Open in new tab (user can then save)
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            this.showInfoMessage('PDF opened in new tab. Use your browser menu to download or share it.');
            this.closePdfModal();

        } catch (error) {
            console.error('Share failed:', error);
            this.showErrorMessage('Share failed. PDF opened in new tab instead.');
            // Still try to open in new tab as fallback
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            this.closePdfModal();
        }
    }

    closePdfModal() {
        const modal = document.getElementById('pdf-download-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    }

    async loadDashboard() {
        console.log('🔄 Loading dashboard...');
        
        // Ensure database is initialized
        if (!this.db) {
            console.log('🔄 Database not initialized, initializing...');
            await this.initIndexedDB();
        }
        
        // Show loading state
        const chartContainer = document.getElementById('trendsChart').parentElement;
        const loadingDiv = document.getElementById('chart-loading');
        
        if (loadingDiv) loadingDiv.classList.remove('hidden');
        
        try {
            // Get entries data
            let entries = await this.loadEntriesFromIndexedDB();
            console.log('📊 DEBUG: Loaded entries from IndexedDB:', entries.length, 'entries');
            if (entries.length > 0) {
                console.log('📊 DEBUG: Sample entry structure:', Object.keys(entries[0]));
                console.log('📊 DEBUG: Sample entry data:', entries[0]);
            }
            
            if (entries.length === 0) {
                console.log('⚠️ DEBUG: No entries found in IndexedDB, checking localStorage...');
                
                // Fallback to localStorage if IndexedDB is empty
                const localStorageEntries = this.loadEntriesFromLocalStorage();
                console.log('📊 DEBUG: Found', localStorageEntries.length, 'entries in localStorage');
                
                if (localStorageEntries.length > 0) {
                    console.log('📊 DEBUG: Using localStorage entries for dashboard');
                    entries = localStorageEntries;
                } else {
                    console.log('⚠️ DEBUG: No entries found anywhere, showing empty dashboard');
                    this.showEmptyDashboard();
                    return;
                }
            }
            
            // Get filter settings
            const period = parseInt(document.getElementById('chart-period').value) || 30;
            const metric = document.getElementById('chart-metric').value || 'all';
            
            // Filter entries by period
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - period);
            
            const filteredEntries = entries.filter(entry => {
                const entryDate = new Date(entry.timestamp || entry.date);
                return entryDate >= cutoffDate;
            }).sort((a, b) => new Date(a.timestamp || a.date) - new Date(b.timestamp || b.date));
            
            // Create chart
            this.createHealthTrendsChart(filteredEntries, metric);
            
            // Calculate and display averages
            console.log('📊 DEBUG: About to calculate averages for', filteredEntries.length, 'filtered entries');
            this.updateDashboardAverages(filteredEntries);
            
            // Update total entries count
            this.updateTotalEntriesCount(filteredEntries.length);
            
            // Update Quick Insights (FREE feature)
            try {
                this.updateQuickInsights(filteredEntries);
            } catch (error) {
                console.warn('Quick Insights update failed:', error);
            }
            
            // Manual test removed - was interfering with real data display
            
        } catch (error) {
            console.error('🚨 CRITICAL: Dashboard loading error:', error);
            console.error('🚨 Error stack:', error.stack);
            
            // Try to show what we can despite the error
            try {
                // Attempt basic functionality
                const basicEntries = this.loadEntriesFromLocalStorage();
                console.log('🔧 FALLBACK: Attempting with localStorage entries:', basicEntries.length);
                
                if (basicEntries.length > 0) {
                    // Try the functions individually with error handling
                    try {
                        this.createHealthTrendsChart(basicEntries, 'all');
                        console.log('✅ Chart created with fallback');
                    } catch (chartError) {
                        console.error('Chart creation failed:', chartError);
                    }
                    
                    try {
                        this.updateDashboardAverages(basicEntries);
                        console.log('✅ Averages updated with fallback');
                    } catch (avgError) {
                        console.error('Averages update failed:', avgError);
                    }
                    
                    try {
                        this.updateTotalEntriesCount(basicEntries.length);
                        console.log('✅ Total count updated with fallback');
                    } catch (countError) {
                        console.error('Total count update failed:', countError);
                    }
                } else {
                    this.showEmptyDashboard();
                }
            } catch (fallbackError) {
                console.error('🚨 Fallback also failed:', fallbackError);
                this.showDashboardError();
            }
        } finally {
            if (loadingDiv) loadingDiv.classList.add('hidden');
        }
    }
    
    showEmptyDashboard() {
        const canvas = document.getElementById('trendsChart');
        const container = canvas.parentElement;
        
        container.innerHTML = `
            <div class="text-center py-12 text-sage-500">
                <i class="fas fa-chart-line text-4xl mb-4 opacity-50"></i>
                <h3 class="text-lg font-medium mb-2">No Health Data Yet</h3>
                <p class="text-sm">Start tracking your daily wellness to see trends over time!</p>
                <button onclick="app.showView('entry-form')" class="mt-4 bg-sage-500 text-white px-4 py-2 rounded-lg hover:bg-sage-600 transition-colors">
                    Add First Entry
                </button>
            </div>
        `;
    }
    
    showDashboardError() {
        const canvas = document.getElementById('trendsChart');
        const container = canvas.parentElement;
        
        container.innerHTML = `
            <div class="text-center py-12 text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <h3 class="text-lg font-medium mb-2">Dashboard Error</h3>
                <p class="text-sm">Unable to load health trends. Please try again.</p>
                <button onclick="app.loadDashboard()" class="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                    Retry
                </button>
            </div>
        `;
    }
    
    createHealthTrendsChart(entries, metric) {
        const canvas = document.getElementById('trendsChart');
        
        // Destroy existing chart if it exists
        if (this.currentChart) {
            this.currentChart.destroy();
        }
        
        // Prepare data
        const labels = entries.map(entry => {
            const date = new Date(entry.timestamp || entry.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        const datasets = [];
        
        // Add datasets based on metric filter
        if (metric === 'all' || metric === 'mood') {
            datasets.push({
                label: 'Mood',
                data: entries.map(entry => entry.mood_overall || 0),
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4
            });
        }
        
        if (metric === 'all' || metric === 'energy') {
            datasets.push({
                label: 'Energy',
                data: entries.map(entry => entry.energy_level || 0),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            });
        }
        
        if (metric === 'all' || metric === 'pain') {
            datasets.push({
                label: 'Pain Level',
                data: entries.map(entry => entry.pain_level || 0),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4
            });
        }
        
        if (metric === 'all' || metric === 'sleep') {
            const sleepData = entries.map(entry => {
                const sleepValue = this.convertSleepQualityToNumber(entry.sleep_quality);
                console.log(`🛌 DEBUG: Sleep quality "${entry.sleep_quality}" -> ${sleepValue}`);
                return sleepValue;
            });
            
            console.log('🛌 DEBUG: Sleep data array:', sleepData);
            
            datasets.push({
                label: 'Sleep Quality',
                data: sleepData,
                borderColor: 'rgb(147, 51, 234)',
                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                tension: 0.4
            });
        }
        
        // Create chart
        this.currentChart = new Chart(canvas, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Health Trends Over Time'
                    },
                    legend: {
                        display: datasets.length > 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        title: {
                            display: true,
                            text: 'Rating (0-10)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
        
        console.log('✅ Dashboard chart created successfully');
    }
    
    updateDashboardAverages(entries) {
        console.log('📊 Updating dashboard averages with', entries.length, 'entries');
        
        if (entries.length === 0) {
            this.clearAverages();
            return;
        }
        
        // DEBUG: Check first entry structure
        if (entries.length > 0) {
            const firstEntry = entries[0];
            console.log('🔍 DEBUG: First entry for averages:', firstEntry);
            console.log('🔍 DEBUG: Field values - mood:', firstEntry.mood_overall, 'energy:', firstEntry.energy_level, 'pain:', firstEntry.pain_level);
        }
        
        // Calculate averages
        const totals = entries.reduce((acc, entry) => {
            const moodVal = parseFloat(entry.mood_overall) || 0;
            const energyVal = parseFloat(entry.energy_level) || 0;
            const painVal = parseFloat(entry.pain_level) || 0;
            const sleepVal = parseFloat(entry.sleep_quality) || 0;
            const anxietyVal = parseFloat(entry.anxiety_level) || 0;
            const fatigueVal = parseFloat(entry.fatigue_level) || 0;
            
            console.log('🔍 DEBUG: Entry values - mood:', moodVal, 'energy:', energyVal, 'pain:', painVal);
            
            acc.mood += moodVal;
            acc.energy += energyVal;
            acc.pain += painVal;
            acc.sleep += sleepVal;
            acc.anxiety += anxietyVal;
            acc.fatigue += fatigueVal;
            return acc;
        }, { mood: 0, energy: 0, pain: 0, sleep: 0, anxiety: 0, fatigue: 0 });
        
        const averages = {
            mood: (totals.mood / entries.length).toFixed(1),
            energy: (totals.energy / entries.length).toFixed(1),
            pain: (totals.pain / entries.length).toFixed(1),
            sleep: (totals.sleep / entries.length).toFixed(1),
            anxiety: (totals.anxiety / entries.length).toFixed(1),
            fatigue: (totals.fatigue / entries.length).toFixed(1)
        };
        
        console.log('📊 Calculated averages:', averages);
        
        // Update DOM elements using correct IDs
        this.updateAverageDisplay('mood', averages.mood);
        this.updateAverageDisplay('energy', averages.energy);
        this.updateAverageDisplay('pain', averages.pain);
    }
    
    updateAverageDisplay(metric, value) {
        // Use the exact IDs from the HTML
        const elementId = `avg-${metric}`;
        const element = document.getElementById(elementId);
        
        console.log(`🔍 DEBUG: Looking for element with ID: ${elementId}`);
        console.log(`🔍 DEBUG: Element found:`, element);
        console.log(`🔍 DEBUG: Updating ${metric} with value: ${value}`);
        
        if (element) {
            element.textContent = `${value}`;
            console.log(`✅ Updated ${metric} average: ${value}`);
        } else {
            console.log(`⚠️ Could not find element with ID: ${elementId}`);
        }
    }
    
    clearAverages() {
        // Clear the specific average elements
        const avgElements = ['avg-mood', 'avg-energy', 'avg-pain'];
        avgElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '--';
            }
        });
    }
    
    updateTotalEntriesCount(count) {
        const totalEntriesElement = document.getElementById('total-entries');
        if (totalEntriesElement) {
            totalEntriesElement.textContent = count.toString();
            console.log(`✅ Updated total entries count: ${count}`);
        } else {
            console.log('⚠️ Could not find total-entries element');
        }
    }
    
    // AI Caching System - Prevents different advice on same day
    getAICacheKey(functionName) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return `ai_cache_${functionName}_${today}`;
    }
    
    getAICache(functionName) {
        const cacheKey = this.getAICacheKey(functionName);
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            const cacheData = JSON.parse(cached);
            const now = new Date().getTime();
            const cacheTime = new Date(cacheData.timestamp).getTime();
            const hoursSinceCached = (now - cacheTime) / (1000 * 60 * 60);
            
            console.log(`🔄 DEBUG: AI Cache for ${functionName} - Hours since cached: ${hoursSinceCached.toFixed(1)}`);
            
            // Return cached data if less than 8 hours old
            if (hoursSinceCached < 8) {
                console.log(`✅ DEBUG: Using cached AI response for ${functionName}`);
                return cacheData.response;
            } else {
                console.log(`⏰ DEBUG: AI cache expired for ${functionName}, will fetch new`);
                localStorage.removeItem(cacheKey);
            }
        }
        
        return null;
    }
    
    setAICache(functionName, response) {
        const cacheKey = this.getAICacheKey(functionName);
        const cacheData = {
            response: response,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`💾 DEBUG: Cached AI response for ${functionName}`);
    }
    
    checkAICacheRefresh() {
        // Check if any AI cache is older than 8 hours and should be refreshed
        const aiFunctions = ['predictive-insights', 'coping-strategies'];
        let shouldRefresh = false;
        
        aiFunctions.forEach(functionName => {
            const cacheKey = this.getAICacheKey(functionName);
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                const cacheData = JSON.parse(cached);
                const now = new Date().getTime();
                const cacheTime = new Date(cacheData.timestamp).getTime();
                const hoursSinceCached = (now - cacheTime) / (1000 * 60 * 60);
                
                if (hoursSinceCached >= 8) {
                    console.log(`🔄 DEBUG: AI cache for ${functionName} is ${hoursSinceCached.toFixed(1)} hours old - ready for refresh`);
                    localStorage.removeItem(cacheKey);
                    shouldRefresh = true;
                }
            }
        });
        
        if (shouldRefresh) {
            console.log('🔄 DEBUG: New entry submitted - AI advice ready for fresh insights based on latest data');
        }
    }
    
    updateQuickInsights(entries) {
        const container = document.getElementById('insights-container');
        
        // Safety check - if container doesn't exist, skip this function
        if (!container) {
            console.log('⚠️ insights-container not found, skipping Quick Insights update');
            return;
        }
        
        if (entries.length === 0) {
            container.innerHTML = `
                <div class="text-sage-600">
                    <i class="fas fa-info-circle mr-2"></i>
                    Add your first health entry to see personalized insights about your patterns.
                </div>
            `;
            return;
        }
        
        try {
            const insights = this.generateBasicInsights(entries);
            
            container.innerHTML = insights.map(insight => `
            <div class="flex items-start p-3 bg-gradient-to-r from-sage-50 to-emerald-50 rounded-lg border-l-4 border-sage-400">
                <i class="${insight.icon} text-sage-600 mr-3 mt-1"></i>
                <div>
                    <p class="text-sage-800 font-medium">${insight.title}</p>
                    <p class="text-sage-600 text-sm">${insight.description}</p>
                </div>
            </div>
        `).join('');
        } catch (error) {
            console.error('Error generating Quick Insights:', error);
            container.innerHTML = `
                <div class="text-sage-600">
                    <i class="fas fa-info-circle mr-2"></i>
                    Health insights will appear here as you track more entries.
                </div>
            `;
        }
    }
    
    generateBasicInsights(entries) {
        const insights = [];
        
        // Calculate basic stats
        const avgMood = entries.reduce((sum, entry) => sum + (parseFloat(entry.mood_overall) || 0), 0) / entries.length;
        const avgEnergy = entries.reduce((sum, entry) => sum + (parseFloat(entry.energy_level) || 0), 0) / entries.length;
        const avgPain = entries.reduce((sum, entry) => sum + (parseFloat(entry.pain_level) || 0), 0) / entries.length;
        
        // Recent vs older comparison (if enough entries)
        if (entries.length >= 7) {
            const recentEntries = entries.slice(0, Math.ceil(entries.length / 3));
            const recentMood = recentEntries.reduce((sum, entry) => sum + (parseFloat(entry.mood_overall) || 0), 0) / recentEntries.length;
            
            if (recentMood > avgMood + 0.5) {
                insights.push({
                    icon: 'fas fa-trending-up',
                    title: 'Mood Improving',
                    description: `Your recent mood scores are trending upward compared to your overall average.`
                });
            } else if (recentMood < avgMood - 0.5) {
                insights.push({
                    icon: 'fas fa-heart',
                    title: 'Self-Care Reminder',
                    description: `Your mood has been lower recently. Remember to be gentle with yourself.`
                });
            }
        }
        
        // Entry consistency
        if (entries.length >= 5) {
            const daysSinceFirst = Math.ceil((new Date() - new Date(entries[entries.length - 1].timestamp || entries[entries.length - 1].date)) / (1000 * 60 * 60 * 24));
            const entriesPerDay = entries.length / daysSinceFirst;
            
            if (entriesPerDay > 0.7) {
                insights.push({
                    icon: 'fas fa-calendar-check',
                    title: 'Great Tracking Habit',
                    description: `You've been consistently tracking your health - keep up the excellent work!`
                });
            }
        }
        
        // Basic health patterns
        if (avgPain > 6) {
            insights.push({
                icon: 'fas fa-thermometer-half',
                title: 'Pain Management Focus',
                description: `Your pain levels have been elevated. Consider discussing pain management strategies with your healthcare provider.`
            });
        }
        
        if (avgEnergy < 4) {
            insights.push({
                icon: 'fas fa-battery-quarter',
                title: 'Energy Levels',
                description: `Your energy has been lower than average. Focus on rest, nutrition, and gentle activity.`
            });
        }
        
        // Default insight if no specific patterns
        if (insights.length === 0) {
            insights.push({
                icon: 'fas fa-chart-line',
                title: 'Building Your Health Story',
                description: `You've logged ${entries.length} entries. Keep tracking to discover more patterns in your health journey.`
            });
        }
        
        return insights.slice(0, 3); // Show max 3 insights
    }

    exportDashboard() {
        // Dashboard export is not implemented yet
        this.showInfoMessage('Dashboard export feature coming soon! Use "Export Data" from the entries page for your health report.');
    }

    // 📱 SIMPLE ANDROID-COMPATIBLE PDF EXPORT
    async exportEntries() {
        console.log('🚀 Starting simple PDF export...');

        try {
            // Show loading message (this was the function that was missing!)
            this.showInfoMessage('Generating your health report PDF...');

            console.log('🌐 Making API request to:', `${this.apiBase}/api/export`);
            const response = await fetch(`${this.apiBase}/api/export`, {
                method: 'GET',
            });

            console.log('📡 API Response status:', response.status, response.statusText);

            if (response.ok) {
                console.log('✅ API Success - Getting blob...');
                const blob = await response.blob();
                console.log('📦 Blob created, size:', blob.size, 'type:', blob.type);

                const filename = `ChroniCompanion_Report_${new Date().toISOString().split('T')[0]}.pdf`;
                console.log('📁 Filename:', filename);

                // 🎯 SIMPLE APPROACH: Direct blob download
                this.simpleDownloadPDF(blob, filename);

            } else {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ EXPORT FAILED:', error);

            if (this.isOnline) {
                this.showErrorMessage(`Export failed: ${error.message}. Please try again.`);
            } else {
                this.showInfoMessage('Export requires internet connection. Please connect and try again.');
            }
        }
        console.log('🏁 EXPORT FUNCTION COMPLETED');
    }

    // 📢 MESSAGE UTILITY FUNCTIONS (THESE WERE MISSING!)
    showInfoMessage(message) {
        console.log('ℹ️ INFO:', message);
        alert(`ℹ️ ${message}`);

        // You can also add a toast notification here in the future
        // For now, we'll just use alerts to ensure it works
    }

    showSuccessMessage(message) {
        console.log('✅ SUCCESS:', message);
        alert(`✅ ${message}`);
    }

    showErrorMessage(message) {
        console.error('❌ ERROR:', message);
        alert(`❌ ${message}`);
    }

    // 🧪 SIMPLE TEST FUNCTION - CALL FROM BROWSER CONSOLE
    async testBackendAPI() {
        console.log('🧪 TESTING BACKEND API...');
        console.log('🌐 API Base:', this.apiBase);

        try {
            const response = await fetch(`${this.apiBase}/api/export`);
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                const blob = await response.blob();
                console.log('📦 Blob size:', blob.size, 'type:', blob.type);
                alert(`✅ API works! Got ${blob.size} bytes of ${blob.type}`);
            } else {
                console.error('❌ API failed:', response.status, response.statusText);
                alert(`❌ API failed: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Network error:', error);
            alert(`❌ Network error: ${error.message}`);
        }
    }

    // 📱 ANDROID-COMPATIBLE PDF DOWNLOAD USING CAPACITOR FILESYSTEM
    async simpleDownloadPDF(blob, filename) {
        console.log('📱 Starting Android-compatible PDF download...');
        console.log('📦 Blob size:', blob.size, 'type:', blob.type);

        // Check if we're in a Capacitor environment
        if (this.isMobile && window.Capacitor) {
            console.log('📱 Using Capacitor Filesystem for Android...');
            await this.saveWithCapacitorFilesystem(blob, filename);
        } else {
            console.log('💻 Using standard download for web/desktop...');
            this.standardWebDownload(blob, filename);
        }
    }

    // 🚀 DEAD SIMPLE: SAVE FILE + OPEN IN NATIVE PDF APP
    async saveWithCapacitorFilesystem(blob, filename) {
        try {
            console.log('🚀 DEAD SIMPLE approach: Save file + open in native PDF app');

            // Debug: Check what's available
            console.log('🔍 Capacitor object:', window.Capacitor);
            console.log('🔍 Capacitor.Plugins:', window.Capacitor?.Plugins);
            console.log('🔍 Available plugins:', Object.keys(window.Capacitor?.Plugins || {}));

            // Convert blob to base64 for Capacitor
            const base64Data = await this.blobToBase64(blob);

            console.log('💾 Saving PDF file...');

            // Save to app's cache directory (no permissions needed)
            const savedFile = await window.Capacitor.Plugins.Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: 'CACHE'
            });

            console.log('✅ PDF saved to:', savedFile.uri);

            // Open the file in native PDF app using file-opener plugin
            console.log('📱 Opening PDF in native app...');

            // Use the file opener plugin
            await window.Capacitor.Plugins.FileOpener.open({
                filePath: savedFile.uri,
                contentType: 'application/pdf'
            });

            console.log('🎉 PDF opened in native app successfully!');
            this.showSuccessMessage('📄 PDF opened! Your device chose the best app to view it.');

        } catch (error) {
            console.error('❌ Failed to open PDF:', error);

            // If file opener fails, fall back to Web Share API
            console.log('🔄 File opener failed, trying Web Share API fallback...');

            if (navigator.share) {
                try {
                    const file = new File([blob], filename, { type: 'application/pdf' });

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: 'ChroniCompanion Health Report',
                            text: 'Choose an app to open your PDF',
                            files: [file]
                        });

                        console.log('✅ Fallback share successful');
                        this.showSuccessMessage('📤 Choose an app to open your PDF!');
                        return;
                    }
                } catch (shareError) {
                    console.warn('❌ Share fallback also failed:', shareError);
                }
            }

            // Final fallback: show error
            this.showErrorMessage(`Unable to open PDF: ${error.message}`);
        }
    }

    // 💻 STANDARD WEB DOWNLOAD (DESKTOP/BROWSER)
    standardWebDownload(blob, filename) {
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(url), 2000);

            this.showSuccessMessage('PDF download started! Check your Downloads folder.');

        } catch (error) {
            console.error('❌ Standard download failed:', error);
            this.showErrorMessage('Download failed. Please try again.');
        }
    }

    // 🎉 PDF SUCCESS MODAL WITH SHARE OPTION
    showPDFSuccessModal(filename, fileUri, directoryDesc = 'storage') {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.id = 'pdf-success-modal';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                <div class="text-center mb-6">
                    <i class="fas fa-check-circle text-green-500 text-4xl mb-3"></i>
                    <h3 class="text-xl font-bold text-gray-800">🎉 PDF Saved!</h3>
                    <p class="text-gray-600 text-sm mt-2">Your health report is ready</p>
                    <p class="text-gray-500 text-xs mt-1 font-mono break-all">${filename}</p>
                </div>
                
                <div class="space-y-3">
                    <button onclick="app.sharePDF('${fileUri}', '${filename}')" 
                            class="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                        <i class="fas fa-share mr-2"></i>Share PDF
                    </button>
                    <button onclick="app.closePDFModal()" 
                            class="w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-600 transition-colors">
                        <i class="fas fa-check mr-2"></i>Done
                    </button>
                </div>
                
                <div class="mt-4 p-3 bg-green-50 rounded-lg">
                    <p class="text-xs text-green-700">
                        <i class="fas fa-info-circle mr-1"></i>
                        PDF saved to ${directoryDesc.toLowerCase()}. Use "Share PDF" to send it to other apps.
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }

    // 📤 SHARE PDF USING CAPACITOR SHARE
    async sharePDF(fileUri, filename) {
        try {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
                await window.Capacitor.Plugins.Share.share({
                    title: 'ChroniCompanion Health Report',
                    text: 'My health tracking report from ChroniCompanion',
                    url: fileUri,
                    dialogTitle: 'Share your health report'
                });
                console.log('✅ PDF shared successfully');
            } else {
                throw new Error('Share plugin not available');
            }
        } catch (error) {
            console.error('❌ Share failed:', error);
            this.showErrorMessage(`Share failed: ${error.message}`);
        }
    }

    // 📋 PDF DOWNLOAD INSTRUCTIONS MODAL
    showPDFInstructionsModal(filename) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.id = 'pdf-instructions-modal';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div class="text-center mb-6">
                    <i class="fas fa-download text-green-500 text-4xl mb-3"></i>
                    <h3 class="text-xl font-bold text-gray-800">📱 PDF Download Started!</h3>
                    <p class="text-gray-600 text-sm mt-2">Your health report is being downloaded</p>
                    <p class="text-gray-500 text-xs mt-1 font-mono break-all">${filename}</p>
                </div>
                
                <div class="space-y-4 mb-6">
                    <div class="p-4 bg-blue-50 rounded-lg">
                        <h4 class="font-semibold text-blue-800 mb-2">📂 Where to find your PDF:</h4>
                        <ul class="text-sm text-blue-700 space-y-1">
                            <li>• Check your <strong>Downloads</strong> folder</li>
                            <li>• Look in your <strong>notification bar</strong></li>
                            <li>• Try your <strong>Files</strong> app</li>
                        </ul>
                    </div>
                    
                    <div class="p-4 bg-green-50 rounded-lg">
                        <h4 class="font-semibold text-green-800 mb-2">💡 Pro tip:</h4>
                        <p class="text-sm text-green-700">
                            If you can't find it, try the share button next time - it lets you choose exactly where to save!
                        </p>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <button onclick="app.closePDFInstructionsModal()" 
                            class="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                        <i class="fas fa-check mr-2"></i>Got it!
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }

    // 🚪 CLOSE PDF INSTRUCTIONS MODAL
    closePDFInstructionsModal() {
        const modal = document.getElementById('pdf-instructions-modal');
        if (modal) {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        }
    }

    // 👁️ PDF VIEWER MODAL (NEW APPROACH)
    showPDFViewerModal(filename, blobUrl) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.id = 'pdf-viewer-modal';

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div class="text-center mb-6">
                    <i class="fas fa-file-pdf text-red-500 text-4xl mb-3"></i>
                    <h3 class="text-xl font-bold text-gray-800">📄 PDF Ready to View!</h3>
                    <p class="text-gray-600 text-sm mt-2">Your health report is now accessible</p>
                    <p class="text-gray-500 text-xs mt-1 font-mono break-all">${filename}</p>
                </div>
                
                <div class="space-y-4 mb-6">
                    <div class="p-4 bg-blue-50 rounded-lg">
                        <h4 class="font-semibold text-blue-800 mb-2">📱 What happens next:</h4>
                        <ul class="text-sm text-blue-700 space-y-1">
                            <li>• PDF opens in Android's built-in viewer</li>
                            <li>• Tap the <strong>download/save icon</strong> in the PDF viewer</li>
                            <li>• Choose where to save (Downloads, Drive, etc.)</li>
                        </ul>
                    </div>
                    
                    <div class="p-4 bg-green-50 rounded-lg">
                        <h4 class="font-semibold text-green-800 mb-2">💡 Pro tip:</h4>
                        <p class="text-sm text-green-700">
                            Android's PDF viewer has a share/download button at the top. Use that to save your report!
                        </p>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <button onclick="app.retryPDFOpen('${blobUrl}')" 
                            class="w-full bg-red-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-600 transition-colors">
                        <i class="fas fa-external-link-alt mr-2"></i>Open PDF Again
                    </button>
                    <button onclick="app.closePDFViewerModal()" 
                            class="w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-600 transition-colors">
                        <i class="fas fa-check mr-2"></i>Got it!
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }

    // 🚪 CLOSE PDF VIEWER MODAL
    closePDFViewerModal() {
        const modal = document.getElementById('pdf-viewer-modal');
        if (modal) {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        }
    }

    // 🗑️ REMOVED ALL MODALS - KEEPING IT DEAD SIMPLE!

    // ❌ CLOSE PDF MODAL
    closePDFModal() {
        const modal = document.getElementById('pdf-success-modal');
        if (modal) {
            document.body.removeChild(modal);
            document.body.style.overflow = 'auto';
        }
    }

    // 🔧 CONVERT BLOB TO BASE64
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result.split(',')[1]; // Remove data:type;base64, prefix
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM LOADED - Creating app...');

    try {
        window.app = new ChroniCompanion();
        console.log('✅ App created successfully');
    } catch (error) {
        console.error('❌ Failed to create app:', error);
        alert(`❌ Failed to create app: ${error.message}`);
    }
});

// Add some custom CSS for slider styling
const style = document.createElement('style');
style.textContent = `
    .slider::-webkit-slider-thumb {
        appearance: none;
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: #5a6e5a;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .slider::-webkit-slider-thumb:hover {
        background: #4a5a4a;
        transform: scale(1.1);
    }
    
    .slider::-moz-range-thumb {
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: #5a6e5a;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;
document.head.appendChild(style); 
