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
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('new-entry-btn').addEventListener('click', () => {
            this.showView('entry-form');
        });

        document.getElementById('view-entries-btn').addEventListener('click', () => {
            this.showView('entries-list');
            this.loadEntries();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportEntries();
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
        const views = ['entry-form', 'entries-list'];
        views.forEach(view => {
            document.getElementById(view).classList.add('hidden');
        });

        // Show selected view
        document.getElementById(viewId).classList.remove('hidden');
        this.currentView = viewId;

        // Update active nav button
        this.updateActiveNavButton(viewId);
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