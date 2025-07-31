// ChroniCompanion Frontend JavaScript
class ChroniCompanion {
    constructor() {
        this.apiBase = 'https://chronicompanion-mobile-production.up.railway.app'; // Backend API URL (will fallback to offline mode)
        this.currentView = 'entry-form';
        this.db = null; // IndexedDB instance
        this.isOnline = navigator.onLine;
        this.isMobile = this.detectMobile();
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
        
        switch(type) {
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

        document.getElementById('export-btn').addEventListener('click', () => {
            console.log('🔥 EXPORT BUTTON CLICKED!');
            console.log('🔥 Current view:', this.currentView);
            
            // Show alert so user can see what's happening
            alert(`🔥 EXPORT BUTTON CLICKED!\nCurrent view: ${this.currentView}`);
            
            if (this.currentView === 'dashboard') {
                console.log('🔥 Calling exportDashboard...');
                alert('🔥 Calling exportDashboard...');
                this.exportDashboard();
            } else {
                console.log('🔥 Calling exportEntries...');
                alert('🔥 Calling exportEntries...');
            this.exportEntries();
            }
        });

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
    }

    closeSupportModal() {
        const modal = document.getElementById('support-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
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
        // Placeholder for ad integration (Google AdMob, etc.)
        this.showInfoMessage('Thank you for supporting ChroniCompanion! 💙');
        
        // In real implementation, integrate with ad networks:
        // - Google AdMob for mobile
        // - Google AdSense for web
        // - Unity Ads, etc.
        
        // For now, simulate ad completion
        setTimeout(() => {
            this.showSuccessMessage('Thank you for watching! Your support helps keep this app free.');
            this.closeSupportModal();
        }, 2000);
    }

    donate(amount) {
        // Placeholder for donation integration
        this.showInfoMessage(`Redirecting to donation page ($${amount})...`);
        
        // In real implementation, integrate with:
        // - Stripe for payments
        // - PayPal
        // - Buy Me a Coffee
        // - Ko-fi
        
        // For now, just show success
        setTimeout(() => {
            this.showSuccessMessage(`Thank you for your $${amount} donation! ❤️`);
            this.closeSupportModal();
        }, 1500);
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

    exportDashboard() {
        // Dashboard export is not implemented yet
        this.showInfoMessage('Dashboard export feature coming soon! Use "Export Data" from the entries page for your health report.');
    }

    // 📱 SIMPLE ANDROID-COMPATIBLE PDF EXPORT
    async exportEntries() {
        console.log('🚀 Starting simple PDF export...');
        alert('🚀 Starting simple PDF export...');
        
        try {
            // Show loading message
            this.showInfoMessage('Generating your health report PDF...');
            alert('📢 Showing loading message...');
            
            console.log('🌐 Making API request to:', `${this.apiBase}/api/export`);
            alert(`🌐 Making API request to: ${this.apiBase}/api/export`);
            
            const response = await fetch(`${this.apiBase}/api/export`, {
                method: 'GET',
            });

            console.log('📡 API Response status:', response.status, response.statusText);
            alert(`📡 API Response: ${response.status} ${response.statusText}`);

            if (response.ok) {
                console.log('✅ API Success - Getting blob...');
                alert('✅ API Success - Getting blob...');
                
                const blob = await response.blob();
                console.log('📦 Blob created, size:', blob.size, 'type:', blob.type);
                alert(`📦 Blob created! Size: ${blob.size} bytes, Type: ${blob.type}`);
                
                const filename = `ChroniCompanion_Report_${new Date().toISOString().split('T')[0]}.pdf`;
                console.log('📁 Filename:', filename);
                alert(`📁 Filename: ${filename}`);
                
                // 🎯 SIMPLE APPROACH: Direct blob download
                alert('🎯 About to call simpleDownloadPDF...');
                this.simpleDownloadPDF(blob, filename);
                
            } else {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ EXPORT FAILED:', error);
            alert(`❌ EXPORT FAILED: ${error.message}`);
            
            if (this.isOnline) {
                this.showErrorMessage(`Export failed: ${error.message}. Please try again.`);
            } else {
                this.showInfoMessage('Export requires internet connection. Please connect and try again.');
            }
        }
        console.log('🏁 EXPORT FUNCTION COMPLETED');
        alert('🏁 EXPORT FUNCTION COMPLETED');
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

    // 📱 SIMPLE PDF DOWNLOAD - ANDROID COMPATIBLE
    simpleDownloadPDF(blob, filename) {
        console.log('📱 Starting simple PDF download...');
        console.log('📦 Blob size:', blob.size, 'type:', blob.type);
        alert(`📱 Starting PDF download!\nBlob size: ${blob.size} bytes\nType: ${blob.type}`);
        
        try {
            // Create blob URL
            const url = URL.createObjectURL(blob); 
            console.log('🔗 Created blob URL');
            alert('🔗 Created blob URL successfully!');
            
            // Try direct download first
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            
            // Add to DOM and click
            document.body.appendChild(a);
            console.log('⬇️ Triggering download...');
            alert('⬇️ About to trigger download...');
            
            a.click();
            document.body.removeChild(a);
            alert('✅ Download click triggered!');
            
            // Clean up blob URL after a delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
                console.log('🧹 Blob URL cleaned up');
            }, 2000);
            
            console.log('✅ Download triggered successfully!');
            this.showSuccessMessage('PDF download started! Check your Downloads folder.');
            alert('✅ Download process completed! Check Downloads folder.');
            
        } catch (error) {
            console.error('❌ Direct download failed:', error);
            alert(`❌ Direct download failed: ${error.message}`);
            
            // Fallback: Open PDF in new tab for manual save
            try {
                const url = URL.createObjectURL(blob);
                const newTab = window.open(url, '_blank');
                
                if (newTab) {
                    console.log('📄 Opened PDF in new tab as fallback');
                    alert('📄 Opened PDF in new tab as fallback');
                    this.showInfoMessage('PDF opened in new tab. Use browser menu to save.');
                } else {
                    console.log('❌ Could not open new tab');
                    alert('❌ Could not open new tab - popups blocked?');
                    this.showErrorMessage('Download blocked. Please allow popups and try again.');
                }
                
                setTimeout(() => URL.revokeObjectURL(url), 5000);
                
            } catch (fallbackError) {
                console.error('❌ Fallback failed too:', fallbackError);
                alert(`❌ Fallback failed too: ${fallbackError.message}`);
                this.showErrorMessage('PDF generation failed. Please try again.');
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ChroniCompanion();
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
