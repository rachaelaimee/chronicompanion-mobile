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
        this.initializeAds(); // Initialize AdSense ads
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
            this.loadPredictiveInsights();
        });

        document.getElementById('get-coping-btn').addEventListener('click', () => {
            this.loadCopingStrategies();
        });

        document.getElementById('crisis-check-btn').addEventListener('click', () => {
            this.performCrisisCheck();
        });

        document.getElementById('get-coaching-btn').addEventListener('click', () => {
            this.loadWeeklyCoaching();
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
                    await this.saveToIndexedDB(entryData);
                    this.showSuccessMessage('Entry saved successfully!');
                    this.resetForm();
                    return;
                } else {
                    throw new Error('Failed to save entry');
                }
            } catch (error) {
                console.log('Failed to sync with server, saving locally');
                await this.saveToIndexedDB(entryData);
                await this.addToPendingSync(entryData);
                this.showSuccessMessage('Entry saved offline - will sync when connected');
                this.resetForm();
            }
        } else {
            // Offline - save to IndexedDB and queue for sync
            await this.saveToIndexedDB(entryData);
            await this.addToPendingSync(entryData);
            this.showSuccessMessage('Entry saved offline - will sync when connected');
            this.resetForm();
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
        return JSON.parse(localStorage.getItem('chroni_entries') || '[]');
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

    // AI Insights Functions
    async loadPredictiveInsights() {
        if (!this.isPremium) {
            this.showPremiumModal();
            return;
        }

        const container = document.getElementById('predictions-container');
        container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Analyzing your patterns...</div>';

        try {
            const response = await fetch(`${this.apiBase}/api/ai/predictive-insights?days=7`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                container.innerHTML = `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="font-medium text-blue-800 mb-2 flex items-center">
                            <i class="fas fa-crystal-ball mr-2"></i>Health Predictions
                        </h4>
                        <p class="text-blue-700 text-sm">${result.insights?.prediction || result.message}</p>
                        ${result.based_on_entries ? `<div class="text-blue-600 text-xs mt-2">Based on ${result.based_on_entries} recent entries</div>` : ''}
                    </div>
                `;
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
        if (!this.isPremium) {
            this.showPremiumModal();
            return;
        }

        const container = document.getElementById('coping-container');
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
                const strategies = result.strategies;
                let strategyHtml = '';
                
                if (strategies.immediate_strategies) {
                    strategyHtml += `<div class="mb-3"><strong>Immediate strategies:</strong><br>• ${strategies.immediate_strategies.join('<br>• ')}</div>`;
                }
                if (strategies.self_care) {
                    strategyHtml += `<div class="mb-3"><strong>Self-care:</strong><br>• ${strategies.self_care.join('<br>• ')}</div>`;
                }
                
                container.innerHTML = `
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 class="font-medium text-green-800 mb-2 flex items-center">
                            <i class="fas fa-heart mr-2"></i>Personalized Coping Strategies
                        </h4>
                        <div class="text-green-700 text-sm">${strategyHtml || 'Take gentle breaths and be kind to yourself.'}</div>
                    </div>
                `;
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
        const container = document.getElementById('crisis-container');
        container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Performing wellness check...</div>';

        // This is always free - crisis intervention should never be paywalled
        try {
            const response = await fetch(`${this.apiBase}/api/ai/crisis-check`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                const alertLevel = result.risk_level || 'low';
                const colorClass = alertLevel === 'high' ? 'red' : alertLevel === 'medium' ? 'yellow' : 'green';
                
                container.innerHTML = `
                    <div class="bg-${colorClass}-50 border border-${colorClass}-200 rounded-lg p-4">
                        <h4 class="font-medium text-${colorClass}-800 mb-2 flex items-center">
                            <i class="fas fa-shield-heart mr-2"></i>Wellness Check
                        </h4>
                        <p class="text-${colorClass}-700 text-sm">${result.message}</p>
                        ${result.resources ? `<div class="mt-2 text-${colorClass}-600 text-xs">${result.resources}</div>` : ''}
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
        if (!this.isPremium) {
            this.showPremiumModal();
            return;
        }

        const container = document.getElementById('coaching-container');
        container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Preparing your weekly reflection...</div>';

        try {
            const response = await fetch(`${this.apiBase}/api/ai/weekly-reflection`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result = await response.json();
                container.innerHTML = `
                    <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 class="font-medium text-purple-800 mb-2 flex items-center">
                            <i class="fas fa-graduation-cap mr-2"></i>Weekly Reflection
                        </h4>
                        <p class="text-purple-700 text-sm">${result.reflection || result.message}</p>
                        ${result.based_on_entries ? `<div class="text-purple-600 text-xs mt-2">Based on ${result.based_on_entries} entries</div>` : ''}
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
        // Store trial start date
        localStorage.setItem('premium_trial_start', new Date().toISOString());
        localStorage.setItem('premium_status', 'trial');

        this.showSuccessMessage('7-day premium trial started! Enjoy AI-powered insights!');
        this.closePremiumModal();

        // Enable premium features
        this.isPremium = true;
        this.updateUIForPremium();
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
    }

    checkPremiumStatus() {
        const trialStart = localStorage.getItem('premium_trial_start');
        const premiumStatus = localStorage.getItem('premium_status');

        if (trialStart && premiumStatus === 'trial') {
            const trialStartDate = new Date(trialStart);
            const now = new Date();
            const daysSinceStart = (now - trialStartDate) / (1000 * 60 * 60 * 24);

            if (daysSinceStart < 7) {
                this.isPremium = true;
                this.updateUIForPremium();
            } else {
                // Trial expired
                localStorage.setItem('premium_status', 'expired');
                this.isPremium = false;
            }
        } else if (premiumStatus === 'active') {
            this.isPremium = true;
            this.updateUIForPremium();
        }
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
        
        // Show loading state
        const chartContainer = document.getElementById('trendsChart').parentElement;
        const loadingDiv = document.getElementById('chart-loading');
        
        if (loadingDiv) loadingDiv.classList.remove('hidden');
        
        try {
            // Get entries data
            const entries = await this.loadEntriesFromIndexedDB();
            
            if (entries.length === 0) {
                this.showEmptyDashboard();
                return;
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
            this.updateDashboardAverages(filteredEntries);
            
        } catch (error) {
            console.error('Dashboard loading error:', error);
            this.showDashboardError();
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
            datasets.push({
                label: 'Sleep Quality',
                data: entries.map(entry => entry.sleep_quality || 0),
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
        
        // Calculate averages
        const totals = entries.reduce((acc, entry) => {
            acc.mood += parseFloat(entry.mood_overall) || 0;
            acc.energy += parseFloat(entry.energy_level) || 0;
            acc.pain += parseFloat(entry.pain_level) || 0;
            acc.sleep += parseFloat(entry.sleep_quality) || 0;
            acc.anxiety += parseFloat(entry.anxiety_level) || 0;
            acc.fatigue += parseFloat(entry.fatigue_level) || 0;
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
        
        // Update DOM elements - look for average containers
        this.updateAverageDisplay('mood', averages.mood, '😊');
        this.updateAverageDisplay('energy', averages.energy, '🔋');
        this.updateAverageDisplay('pain', averages.pain, '🌡️');
        this.updateAverageDisplay('sleep', averages.sleep, '😴');
        this.updateAverageDisplay('anxiety', averages.anxiety, '😰');
        this.updateAverageDisplay('fatigue', averages.fatigue, '😴');
    }
    
    updateAverageDisplay(metric, value, emoji) {
        // Try to find average display elements by various possible IDs/classes
        const possibleSelectors = [
            `#average-${metric}`,
            `#${metric}-average`,
            `.average-${metric}`,
            `[data-metric="${metric}"]`
        ];
        
        let element = null;
        for (const selector of possibleSelectors) {
            element = document.querySelector(selector);
            if (element) break;
        }
        
        // If no specific element found, try to find by text content
        if (!element) {
            const averageElements = document.querySelectorAll('.dashboard-average, .metric-average');
            for (const el of averageElements) {
                if (el.textContent.toLowerCase().includes(metric.toLowerCase())) {
                    element = el;
                    break;
                }
            }
        }
        
        if (element) {
            // Update the value
            const valueElement = element.querySelector('.value, .average-value') || element;
            if (valueElement) {
                valueElement.textContent = `${value}/10 ${emoji}`;
            }
            console.log(`✅ Updated ${metric} average: ${value}`);
        } else {
            console.log(`⚠️ Could not find element for ${metric} average`);
        }
    }
    
    clearAverages() {
        const averageElements = document.querySelectorAll('.dashboard-average .value, .metric-average .value');
        averageElements.forEach(el => {
            el.textContent = '--/10';
        });
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
