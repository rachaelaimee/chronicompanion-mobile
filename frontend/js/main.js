// ChroniCompanion Frontend JavaScript
class ChroniCompanion {
    constructor() {
        this.apiBase = 'http://localhost:8000'; // Backend API URL
        this.currentView = 'entry-form';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateCurrentDate();
        this.initializeSliders();
        this.loadEntries(); // Load existing entries on startup
        this.restoreViewState(); // Restore the last viewed page
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
            this.exportEntries();
        });

        document.getElementById('dashboard-btn').addEventListener('click', () => {
            this.showView('dashboard');
        });

        // Entry type radio buttons
        const entryTypeRadios = document.querySelectorAll('input[name="entry_type"]');
        entryTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleQuestions(e.target.value);
            });
        });

        // Form submission
        document.getElementById('daily-entry-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitEntry();
        });

        // Slider updates
        const sliders = document.querySelectorAll('.slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.updateSliderValue(e.target);
            });
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
        });
    }

    updateSliderValue(slider) {
        const valueDisplay = document.getElementById(slider.name + '_value');
        if (valueDisplay) {
            valueDisplay.textContent = slider.value;
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

    async submitEntry() {
        const form = document.getElementById('daily-entry-form');
        const formData = new FormData(form);
        
        // Convert FormData to regular object
        const entryData = {};
        for (let [key, value] of formData.entries()) {
            entryData[key] = value;
        }

        // Add timestamp
        entryData.timestamp = new Date().toISOString();
        entryData.date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        try {
            const response = await fetch(`${this.apiBase}/api/entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(entryData)
            });

            if (response.ok) {
                this.showSuccessMessage('Entry saved successfully!');
                this.resetForm();
                // If we're in a development environment without backend, save to localStorage
            } else {
                throw new Error('Failed to save entry');
            }
        } catch (error) {
            console.log('Backend not available, saving to localStorage for development');
            this.saveToLocalStorage(entryData);
            this.showSuccessMessage('Entry saved locally!');
            this.resetForm();
        }
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
        try {
            const response = await fetch(`${this.apiBase}/api/entries`);
            if (response.ok) {
                const entries = await response.json();
                this.displayEntries(entries);
            } else {
                throw new Error('Failed to load entries');
            }
        } catch (error) {
            console.log('Backend not available, loading from localStorage');
            const entries = this.loadEntriesFromLocalStorage();
            this.displayEntries(entries);
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

    viewEntryDetails(entryId) {
        // This would open a modal or navigate to a detailed view
        console.log('Viewing entry details for:', entryId);
        // For now, just show an alert
        alert('Entry details view would open here. This will be implemented in the next phase!');
    }

    async exportEntries() {
        try {
            const response = await fetch(`${this.apiBase}/api/export`, {
                method: 'GET',
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `chroni_companion_export_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.showSuccessMessage('Entries exported successfully!');
            } else {
                throw new Error('Failed to export entries');
            }
        } catch (error) {
            console.log('Backend not available, showing export placeholder');
            alert('Export functionality will be available once the backend is connected. For now, your entries are safely stored locally!');
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