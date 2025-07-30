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
            if (this.currentView === 'dashboard') {
                this.exportDashboard();
            } else {
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
            // Show export button on entries page
            exportBtn.style.display = 'flex';
            exportBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Export Data';
        } else if (viewId === 'dashboard') {
            // Show different export on dashboard
            exportBtn.style.display = 'flex';
            exportBtn.innerHTML = '<i class="fas fa-chart-bar mr-2"></i>Export Charts';
        } else {
            // Hide export button on entry form
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
        // For now, show that dashboard export is not available
        this.showInfoMessage('Dashboard export feature coming soon! Use "Export Data" from the entries page for your health report.');
        
        // Future: Implement dashboard chart export as image or PDF
        // Could export chart images, statistics summary, etc.
    }

    async exportEntries() {
        try {
            // Show loading message
            this.showInfoMessage('Generating your health report PDF...');
            
            const response = await fetch(`${this.apiBase}/api/export`, {
                method: 'GET',
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const filename = `ChroniCompanion_Report_${new Date().toISOString().split('T')[0]}.pdf`;
                
                // For mobile devices, try the share API first
                if (this.isMobile && navigator.share && navigator.canShare) {
                    try {
                        const file = new File([blob], filename, { type: 'application/pdf' });
                        if (navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                title: 'ChroniCompanion Health Report',
                                text: 'Your personal health tracking report',
                                files: [file]
                            });
                            this.showSuccessMessage('Report shared successfully!');
                            window.URL.revokeObjectURL(url);
                            return;
                        }
                    } catch (shareError) {
                        console.log('Share API failed, falling back to download:', shareError);
                    }
                }
                
                // Fallback to download
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                
                // For mobile, add explicit user interaction
                if (this.isMobile) {
                    // Show modal with download link for mobile
                    this.showMobileDownloadModal(url, filename, blob);
                } else {
                    // Desktop: automatic download
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    this.showSuccessMessage('Report exported successfully!');
                }
                
                window.URL.revokeObjectURL(url);
            } else {
                throw new Error('Failed to export entries');
            }
        } catch (error) {
            console.log('Backend not available, showing export placeholder');
            if (this.isOnline) {
                this.showErrorMessage('Export failed. Please check your internet connection and try again.');
            } else {
                this.showInfoMessage('Export requires internet connection. Please connect and try again.');
            }
        }
    }

    resetForm() {
        const form = document.getElementById('daily-entry-form');
        form.reset();
        
        // Reset sliders to default values
        this.initializeSliders();
        
        // Hide all question sections
        document.getElementById('morning-questions').classList.add('hidden');
        document.getElementById('evening-questions').classList.add('hidden');
    }

    showSuccessMessage(message) {
        const successMessage = document.getElementById('success-message');
        // Update the entire innerHTML to preserve the icon and update the message
        successMessage.innerHTML = `<i class="fas fa-check mr-2"></i>${message}`;
        
        // Show the message
        successMessage.classList.remove('translate-x-full');
        
        // Hide after 3 seconds
        setTimeout(() => {
            successMessage.classList.add('translate-x-full');
        }, 3000);
    }

    showErrorMessage(message) {
        // Create error message element if it doesn't exist
        let errorMessage = document.getElementById('error-message');
        if (!errorMessage) {
            errorMessage = document.createElement('div');
            errorMessage.id = 'error-message';
            errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50';
            document.body.appendChild(errorMessage);
        }
        
        errorMessage.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>${message}`;
        errorMessage.classList.remove('translate-x-full');
        
        setTimeout(() => {
            errorMessage.classList.add('translate-x-full');
        }, 4000);
    }

    showInfoMessage(message) {
        // Create info message element if it doesn't exist
        let infoMessage = document.getElementById('info-message');
        if (!infoMessage) {
            infoMessage = document.createElement('div');
            infoMessage.id = 'info-message';
            infoMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50';
            document.body.appendChild(infoMessage);
        }
        
        infoMessage.innerHTML = `<i class="fas fa-info-circle mr-2"></i>${message}`;
        infoMessage.classList.remove('translate-x-full');
        
        setTimeout(() => {
            infoMessage.classList.add('translate-x-full');
        }, 3000);
    }

    // Dashboard Methods
    async loadDashboard() {
        const loadingEl = document.getElementById('chart-loading');
        const period = document.getElementById('chart-period').value;
        const metric = document.getElementById('chart-metric').value;
        
        try {
            loadingEl.classList.remove('hidden');
            
            // Load chart data
            const response = await fetch(`${this.apiBase}/api/analytics/chart-data?days=${period}&metric=${metric}`);
            
            if (response.ok) {
                const chartData = await response.json();
                this.renderChart(chartData);
                this.updateStatistics(chartData);
                this.generateInsights(chartData);
                // Load any saved AI insights
                this.loadAllSavedInsights();
            } else {
                console.log('Backend not available, loading sample data');
                this.loadSampleDashboard();
            }
        } catch (error) {
            console.log('Backend not available, loading sample data');
            this.loadSampleDashboard();
        } finally {
            loadingEl.classList.add('hidden');
        }
    }

    loadSampleDashboard() {
        // Create sample data for demonstration
        const sampleData = {
            labels: this.generateSampleDates(7),
            datasets: [
                {
                    label: 'Mood',
                    data: [6, 7, 5, 8, 6, 7, 8],
                    borderColor: '#5a6e5a',
                    backgroundColor: 'rgba(90, 110, 90, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Energy',
                    data: [5, 6, 4, 7, 5, 6, 7],
                    borderColor: '#a593c2',
                    backgroundColor: 'rgba(165, 147, 194, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Pain',
                    data: [3, 4, 6, 2, 4, 3, 2],
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        };
        
        this.renderChart(sampleData);
        this.updateSampleStatistics();
        this.generateSampleInsights();
        // Load any saved AI insights
        this.loadAllSavedInsights();
    }

    generateSampleDates(days) {
        const dates = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    }

    renderChart(chartData) {
        const ctx = document.getElementById('trendsChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.trendsChart) {
            this.trendsChart.destroy();
        }
        
        this.trendsChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#5a6e5a',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                if (value === null) return null;
                                
                                if (label === 'Pain' || label === 'Fatigue') {
                                    return `${label}: ${value}/10`;
                                } else {
                                    return `${label}: ${value}/10`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#374151'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Rating (0-10)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#374151'
                        },
                        min: 0,
                        max: 10,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 4,
                        hoverRadius: 6,
                        borderWidth: 2
                    },
                    line: {
                        borderWidth: 3
                    }
                }
            }
        });
    }

    updateStatistics(chartData) {
        if (!chartData.datasets || chartData.datasets.length === 0) {
            this.updateSampleStatistics();
            return;
        }
        
        // Calculate averages for each metric
        const stats = {};
        chartData.datasets.forEach(dataset => {
            const label = dataset.label.toLowerCase();
            const validData = dataset.data.filter(val => val !== null && val !== undefined);
            if (validData.length > 0) {
                stats[label] = (validData.reduce((a, b) => a + b, 0) / validData.length).toFixed(1);
            }
        });
        
        // Update DOM elements
        document.getElementById('avg-mood').textContent = stats.mood || '--';
        document.getElementById('avg-energy').textContent = stats.energy || '--';
        document.getElementById('avg-pain').textContent = stats.pain || '--';
        document.getElementById('total-entries').textContent = chartData.total_entries || '--';
    }

    updateSampleStatistics() {
        document.getElementById('avg-mood').textContent = '6.7';
        document.getElementById('avg-energy').textContent = '5.9';
        document.getElementById('avg-pain').textContent = '3.4';
        document.getElementById('total-entries').textContent = '12';
    }

    generateInsights(chartData) {
        const container = document.getElementById('insights-container');
        const insights = [];
        
        if (!chartData.datasets || chartData.datasets.length === 0) {
            this.generateSampleInsights();
            return;
        }
        
        // Analyze trends for insights
        chartData.datasets.forEach(dataset => {
            const label = dataset.label;
            const validData = dataset.data.filter(val => val !== null && val !== undefined);
            
            if (validData.length >= 3) {
                const recent = validData.slice(-3);
                const earlier = validData.slice(0, -3);
                
                if (recent.length > 0 && earlier.length > 0) {
                    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
                    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
                    const diff = recentAvg - earlierAvg;
                    
                    if (Math.abs(diff) > 0.5) {
                        if (label === 'Pain' || label === 'Fatigue' || label === 'Anxiety') {
                            if (diff > 0) {
                                insights.push(`Your ${label.toLowerCase()} has increased recently. Consider discussing this with your healthcare provider.`);
                            } else {
                                insights.push(`Great news! Your ${label.toLowerCase()} levels have been improving recently.`);
                            }
                        } else {
                            if (diff > 0) {
                                insights.push(`Your ${label.toLowerCase()} has been improving lately - keep up the good work!`);
                            } else {
                                insights.push(`Your ${label.toLowerCase()} has been lower recently. Remember to be gentle with yourself.`);
                            }
                        }
                    }
                }
            }
        });
        
        if (insights.length === 0) {
            insights.push('Your health patterns are stable. Keep tracking to identify trends over time.');
        }
        
        // Update insights container
        container.innerHTML = insights.map(insight => 
            `<div class="text-sage-600 flex items-start">
                <i class="fas fa-lightbulb mr-2 text-yellow-500 mt-1 flex-shrink-0"></i>
                <span>${insight}</span>
            </div>`
        ).join('');
    }

    generateSampleInsights() {
        const container = document.getElementById('insights-container');
        const sampleInsights = [
            'Your mood has been relatively stable this week - that\'s wonderful!',
            'Your energy levels show a slight upward trend. Great progress!',
            'Your pain levels have been manageable. Keep up your current self-care routine.'
        ];
        
        container.innerHTML = sampleInsights.map(insight => 
            `<div class="text-sage-600 flex items-start">
                <i class="fas fa-lightbulb mr-2 text-yellow-500 mt-1 flex-shrink-0"></i>
                <span>${insight}</span>
            </div>`
        ).join('');
    }

    // AI Persistence Methods
    saveAIInsight(type, data) {
        const timestamp = new Date().toISOString();
        const insight = { ...data, timestamp, type };
        localStorage.setItem(`ai_${type}`, JSON.stringify(insight));
    }

    loadSavedAIInsight(type) {
        try {
            const saved = localStorage.getItem(`ai_${type}`);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.log('Error loading saved AI insight:', error);
            return null;
        }
    }

    loadAllSavedInsights() {
        // Load predictions
        const savedPredictions = this.loadSavedAIInsight('predictions');
        if (savedPredictions) {
            this.displayPredictiveInsights(savedPredictions, savedPredictions.timestamp);
            document.getElementById('get-predictions-btn').textContent = 'Refresh';
        }

        // Load coping strategies
        const savedCoping = this.loadSavedAIInsight('coping');
        if (savedCoping) {
            this.displayCopingStrategies(savedCoping, savedCoping.timestamp);
            document.getElementById('get-coping-btn').textContent = 'Refresh';
        }

        // Load crisis check
        const savedCrisis = this.loadSavedAIInsight('crisis');
        if (savedCrisis) {
            this.displayCrisisSupport(savedCrisis, savedCrisis.timestamp);
            document.getElementById('crisis-check-btn').textContent = 'Refresh';
        }

        // Load coaching
        const savedCoaching = this.loadSavedAIInsight('coaching');
        if (savedCoaching) {
            this.displayWeeklyCoaching(savedCoaching, savedCoaching.timestamp);
            document.getElementById('get-coaching-btn').textContent = 'Refresh';
        }
    }

    // Advanced AI Methods
    async loadPredictiveInsights() {
        const btn = document.getElementById('get-predictions-btn');
        const content = document.getElementById('predictions-content');
        
        try {
            btn.textContent = 'Loading...';
            btn.disabled = true;
            
            const response = await fetch(`${this.apiBase}/api/ai/predictive-insights?days=7`);
            
            if (response.ok) {
                const data = await response.json();
                this.saveAIInsight('predictions', data.insights);
                this.displayPredictiveInsights(data.insights);
            } else {
                this.displayAISampleContent('predictions');
            }
        } catch (error) {
            console.log('Backend not available, showing sample predictions');
            this.displayAISampleContent('predictions');
        } finally {
            btn.textContent = 'Refresh';
            btn.disabled = false;
        }
    }

    async loadCopingStrategies() {
        const btn = document.getElementById('get-coping-btn');
        const content = document.getElementById('coping-content');
        
        try {
            btn.textContent = 'Loading...';
            btn.disabled = true;
            
            // Get current symptoms from latest entry or use defaults
            const currentSymptoms = {
                mood: 5,
                energy: 4,
                pain: 6,
                anxiety: 7,
                fatigue: 6
            };
            
            const response = await fetch(`${this.apiBase}/api/ai/coping-strategies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(currentSymptoms)
            });
            
            if (response.ok) {
                const data = await response.json();
                this.saveAIInsight('coping', data.strategies);
                this.displayCopingStrategies(data.strategies);
            } else {
                this.displayAISampleContent('coping');
            }
        } catch (error) {
            console.log('Backend not available, showing sample coping strategies');
            this.displayAISampleContent('coping');
        } finally {
            btn.textContent = 'Refresh';
            btn.disabled = false;
        }
    }

    async performCrisisCheck() {
        const btn = document.getElementById('crisis-check-btn');
        const content = document.getElementById('crisis-content');
        
        try {
            btn.textContent = 'Checking...';
            btn.disabled = true;
            
            const response = await fetch(`${this.apiBase}/api/ai/crisis-check`);
            
            if (response.ok) {
                const data = await response.json();
                this.saveAIInsight('crisis', data.analysis);
                this.displayCrisisSupport(data.analysis);
            } else {
                this.displayAISampleContent('crisis');
            }
        } catch (error) {
            console.log('Backend not available, showing sample crisis support');
            this.displayAISampleContent('crisis');
        } finally {
            btn.textContent = 'Refresh';
            btn.disabled = false;
        }
    }

    async loadWeeklyCoaching() {
        const btn = document.getElementById('get-coaching-btn');
        const content = document.getElementById('coaching-content');
        
        try {
            btn.textContent = 'Loading...';
            btn.disabled = true;
            
            const response = await fetch(`${this.apiBase}/api/ai/weekly-coaching`);
            
            if (response.ok) {
                const data = await response.json();
                this.saveAIInsight('coaching', data.coaching);
                this.displayWeeklyCoaching(data.coaching);
            } else {
                this.displayAISampleContent('coaching');
            }
        } catch (error) {
            console.log('Backend not available, showing sample coaching');
            this.displayAISampleContent('coaching');
        } finally {
            btn.textContent = 'Refresh';
            btn.disabled = false;
        }
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    displayPredictiveInsights(insights, timestamp = null) {
        const content = document.getElementById('predictions-content');
        
        if (!insights || !insights.prediction) {
            content.innerHTML = '<p class="text-gray-500">No predictions available at this time.</p>';
            return;
        }
        
        let html = `
            <div class="space-y-3">
                <div class="p-3 bg-blue-50 rounded-lg">
                    <p class="font-medium text-blue-800">${insights.prediction}</p>
                    <p class="text-xs text-blue-600 mt-1">Confidence: ${insights.confidence}</p>
                </div>
        `;
        
        if (insights.suggestions && insights.suggestions.length > 0) {
            html += `
                <div>
                    <p class="font-medium text-gray-700 mb-2">💡 Suggestions:</p>
                    <ul class="text-sm text-gray-600 space-y-1">
                        ${insights.suggestions.map(s => `<li>• ${s}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (insights.positive_trends && insights.positive_trends.length > 0) {
            html += `
                <div>
                    <p class="font-medium text-green-700 mb-2">✨ Positive Trends:</p>
                    <ul class="text-sm text-green-600 space-y-1">
                        ${insights.positive_trends.map(t => `<li>• ${t}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Add timestamp if provided
        if (timestamp) {
            const timeAgo = this.getTimeAgo(timestamp);
            html += `
                <div class="pt-2 mt-3 border-t border-blue-200">
                    <p class="text-xs text-blue-500">
                        <i class="fas fa-clock mr-1"></i>
                        Last updated ${timeAgo}
                    </p>
                </div>
            `;
        }
        
        html += '</div>';
        content.innerHTML = html;
    }

    displayCopingStrategies(strategies, timestamp = null) {
        const content = document.getElementById('coping-content');
        
        if (!strategies) {
            content.innerHTML = '<p class="text-gray-500">No coping strategies available at this time.</p>';
            return;
        }
        
        let html = '<div class="space-y-3">';
        
        if (strategies.immediate_strategies && strategies.immediate_strategies.length > 0) {
            html += `
                <div>
                    <p class="font-medium text-green-700 mb-2">🚨 Right Now:</p>
                    <ul class="text-sm text-gray-600 space-y-1">
                        ${strategies.immediate_strategies.map(s => `<li>• ${s}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (strategies.self_care && strategies.self_care.length > 0) {
            html += `
                <div>
                    <p class="font-medium text-purple-700 mb-2">💜 Self-Care:</p>
                    <ul class="text-sm text-gray-600 space-y-1">
                        ${strategies.self_care.map(s => `<li>• ${s}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (strategies.when_to_seek_help) {
            html += `
                <div class="p-3 bg-yellow-50 rounded-lg">
                    <p class="text-sm text-yellow-800">${strategies.when_to_seek_help}</p>
                </div>
            `;
        }
        
        // Add timestamp if provided
        if (timestamp) {
            const timeAgo = this.getTimeAgo(timestamp);
            html += `
                <div class="pt-2 mt-3 border-t border-green-200">
                    <p class="text-xs text-green-500">
                        <i class="fas fa-clock mr-1"></i>
                        Last updated ${timeAgo}
                    </p>
                </div>
            `;
        }
        
        html += '</div>';
        content.innerHTML = html;
    }

    displayCrisisSupport(analysis, timestamp = null) {
        const content = document.getElementById('crisis-content');
        
        if (!analysis) {
            content.innerHTML = '<p class="text-gray-500">Unable to perform wellness check at this time.</p>';
            return;
        }
        
        const riskColors = {
            none: 'green',
            low: 'yellow',
            medium: 'orange',
            high: 'red'
        };
        
        const color = riskColors[analysis.risk_level] || 'green';
        
        let html = `
            <div class="space-y-3">
                <div class="p-3 bg-${color}-50 rounded-lg border border-${color}-200">
                    <p class="font-medium text-${color}-800">${analysis.supportive_message}</p>
                </div>
        `;
        
        if (analysis.gentle_suggestions && analysis.gentle_suggestions.length > 0) {
            html += `
                <div>
                    <p class="font-medium text-gray-700 mb-2">💝 Gentle Suggestions:</p>
                    <ul class="text-sm text-gray-600 space-y-1">
                        ${analysis.gentle_suggestions.map(s => `<li>• ${s}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (analysis.resources && analysis.resources.length > 0) {
            html += `
                <div>
                    <p class="font-medium text-blue-700 mb-2">🔗 Resources:</p>
                    <ul class="text-sm text-blue-600 space-y-1">
                        ${analysis.resources.map(r => `<li>• ${r}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Add timestamp if provided
        if (timestamp) {
            const timeAgo = this.getTimeAgo(timestamp);
            html += `
                <div class="pt-2 mt-3 border-t border-red-200">
                    <p class="text-xs text-red-500">
                        <i class="fas fa-clock mr-1"></i>
                        Last updated ${timeAgo}
                    </p>
                </div>
            `;
        }
        
        html += '</div>';
        content.innerHTML = html;
    }

    displayWeeklyCoaching(coaching, timestamp = null) {
        const content = document.getElementById('coaching-content');
        
        if (!coaching) {
            content.innerHTML = '<p class="text-gray-500">No coaching available at this time.</p>';
            return;
        }
        
        let html = `
            <div class="space-y-3">
                <div class="p-3 bg-yellow-50 rounded-lg">
                    <p class="font-medium text-yellow-800">${coaching.weekly_summary}</p>
                </div>
        `;
        
        if (coaching.achievements && coaching.achievements.length > 0) {
            html += `
                <div>
                    <p class="font-medium text-green-700 mb-2">🏆 This Week's Wins:</p>
                    <ul class="text-sm text-green-600 space-y-1">
                        ${coaching.achievements.map(a => `<li>• ${a}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (coaching.specific_goals && coaching.specific_goals.length > 0) {
            html += `
                <div>
                    <p class="font-medium text-blue-700 mb-2">🎯 Next Week's Focus:</p>
                    <ul class="text-sm text-blue-600 space-y-1">
                        ${coaching.specific_goals.map(g => `<li>• ${g}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (coaching.motivational_message) {
            html += `
                <div class="p-3 bg-purple-50 rounded-lg">
                    <p class="text-sm text-purple-800 italic">"${coaching.motivational_message}"</p>
                </div>
            `;
        }
        
        // Add timestamp if provided
        if (timestamp) {
            const timeAgo = this.getTimeAgo(timestamp);
            html += `
                <div class="pt-2 mt-3 border-t border-yellow-200">
                    <p class="text-xs text-yellow-600">
                        <i class="fas fa-clock mr-1"></i>
                        Last updated ${timeAgo}
                    </p>
                </div>
            `;
        }
        
        html += '</div>';
        content.innerHTML = html;
    }

    displayAISampleContent(type) {
        const sampleContent = {
            predictions: {
                prediction: "Based on your recent patterns, you might experience some fatigue tomorrow, but your mood has been improving steadily.",
                confidence: "medium",
                suggestions: ["Plan lighter activities for tomorrow", "Prioritize rest and hydration", "Continue your current self-care routine"],
                positive_trends: ["Your mood has improved by 20% this week", "Energy levels are more stable"]
            },
            coping: {
                immediate_strategies: ["Take 5 deep breaths", "Find a comfortable position to rest", "Reach out to a trusted friend"],
                self_care: ["Gentle stretching", "Listen to calming music", "Take a warm bath"],
                when_to_seek_help: "If symptoms persist or worsen, consider reaching out to your healthcare provider."
            },
            crisis: {
                risk_level: "low",
                supportive_message: "You're showing incredible strength by tracking your health and seeking support.",
                gentle_suggestions: ["Practice your favorite grounding technique", "Connect with someone who cares about you"],
                resources: ["Crisis Text Line: Text HOME to 741741", "Your local support network"]
            },
            coaching: {
                weekly_summary: "This week you've shown remarkable resilience despite some challenging days.",
                achievements: ["Continued daily tracking", "Reached out for support when needed", "Maintained your self-care routine"],
                specific_goals: ["Focus on gentle movement", "Practice gratitude daily", "Maintain consistent sleep schedule"],
                motivational_message: "You are stronger than you know, and every small step forward matters."
            }
        };
        
        const sample = sampleContent[type];
        if (!sample) return;
        
        switch (type) {
            case 'predictions':
                this.displayPredictiveInsights(sample);
                break;
            case 'coping':
                this.displayCopingStrategies(sample);
                break;
            case 'crisis':
                this.displayCrisisSupport(sample);
                break;
            case 'coaching':
                this.displayWeeklyCoaching(sample);
                break;
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