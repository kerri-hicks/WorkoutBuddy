// Main Application Logic

class WorkoutBuddyApp {
    constructor() {
        this.storage = new WorkoutStorage();
        this.notifications = new NotificationManager();
        this.messageProvider = null;
        
        this.settings = null;
        this.currentStreak = 0;
        this.daysSinceLast = 0;
        
        this.init();
    }

    async init() {
        // Load settings
        this.settings = this.storage.getSettings();
        
        // Initialize message provider
        this.messageProvider = MessageProviderFactory.createProvider(
            this.settings.messageProvider,
            this.settings.apiKey
        );

        // Load UI state
        await this.loadStreak();
        await this.loadMessages();
        this.updateNextWorkoutDisplay();
        this.updateBackgroundColor();

        // Set up event listeners
        this.setupEventListeners();

        // Request notification permission if not already granted
        if (this.settings.notificationsEnabled) {
            await this.enableNotifications();
        }

        // Check if it's workout time
        this.checkWorkoutTime();

        // Send welcome message if it's workout time or if this is first load
        const messages = await this.storage.getMessages(1);
        if (messages.length === 0 || this.notifications.isWorkoutTime(this.settings.workoutTime, this.settings.activeDays)) {
            await this.sendMessage('assistant', 'welcome');
        }
    }

    setupEventListeners() {
        // Mark Done button
        document.getElementById('markDoneBtn').addEventListener('click', () => {
            this.handleWorkoutComplete();
        });

        // Skip button
        document.getElementById('skipBtn').addEventListener('click', () => {
            this.handleWorkoutSkipped();
        });

        // Settings toggle
        document.getElementById('settingsToggle').addEventListener('click', () => {
            document.getElementById('settingsPanel').classList.toggle('open');
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            document.getElementById('settingsPanel').classList.remove('open');
        });

        // History toggle
        document.getElementById('historyToggle').addEventListener('click', async () => {
            await this.loadHistory();
            document.getElementById('historyPanel').classList.toggle('open');
        });

        document.getElementById('closeHistory').addEventListener('click', () => {
            document.getElementById('historyPanel').classList.remove('open');
        });

        // Settings changes
        document.getElementById('workoutTime').addEventListener('change', (e) => {
            this.settings.workoutTime = e.target.value;
            this.saveSettings();
        });

        // Day toggles
        document.querySelectorAll('.day-toggle input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateActiveDays();
            });
        });

        // Message provider change
        document.getElementById('messageProvider').addEventListener('change', (e) => {
            const apiSection = document.getElementById('apiKeySection');
            if (e.target.value === 'api') {
                apiSection.style.display = 'block';
            } else {
                apiSection.style.display = 'none';
            }
            this.settings.messageProvider = e.target.value;
            this.saveSettings();
        });

        // API key change
        document.getElementById('apiKey').addEventListener('change', (e) => {
            this.settings.apiKey = e.target.value;
            this.saveSettings();
        });

        // Clear data
        document.getElementById('clearDataBtn').addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                await this.storage.clearAllData();
                location.reload();
            }
        });

        // Load current settings into UI
        this.loadSettingsUI();
    }

    loadSettingsUI() {
        document.getElementById('workoutTime').value = this.settings.workoutTime;
        document.getElementById('messageProvider').value = this.settings.messageProvider;
        
        if (this.settings.apiKey) {
            document.getElementById('apiKey').value = this.settings.apiKey;
        }

        if (this.settings.messageProvider === 'api') {
            document.getElementById('apiKeySection').style.display = 'block';
        }

        // Set day toggles
        document.querySelectorAll('.day-toggle input').forEach(checkbox => {
            const day = parseInt(checkbox.dataset.day);
            checkbox.checked = this.settings.activeDays.includes(day);
        });
    }

    updateActiveDays() {
        const activeDays = [];
        document.querySelectorAll('.day-toggle input:checked').forEach(checkbox => {
            activeDays.push(parseInt(checkbox.dataset.day));
        });
        this.settings.activeDays = activeDays;
        this.saveSettings();
    }

    saveSettings() {
        this.storage.saveSettings(this.settings);
        
        // Reinitialize message provider if changed
        this.messageProvider = MessageProviderFactory.createProvider(
            this.settings.messageProvider,
            this.settings.apiKey
        );

        // Update notifications
        if (this.settings.notificationsEnabled) {
            this.notifications.scheduleWorkoutNotification(
                this.settings.workoutTime,
                this.settings.activeDays
            );
        }

        this.updateNextWorkoutDisplay();
    }

    async enableNotifications() {
        const granted = await this.notifications.requestPermission();
        if (granted) {
            this.settings.notificationsEnabled = true;
            this.storage.saveSettings(this.settings);
            this.notifications.scheduleWorkoutNotification(
                this.settings.workoutTime,
                this.settings.activeDays
            );
        }
    }

    async loadStreak() {
        this.currentStreak = await this.storage.getCurrentStreak();
        this.daysSinceLast = await this.storage.getDaysSinceLastWorkout();
        
        document.querySelector('.streak-count').textContent = this.currentStreak;
        
        // Update streak label
        const label = this.currentStreak === 1 ? 'day streak' : 'day streak';
        document.querySelector('.streak-label').textContent = label;
    }

    updateBackgroundColor() {
        const body = document.body;
        body.className = ''; // Clear existing classes

        if (this.currentStreak >= 14) {
            body.classList.add('streak-amazing');
        } else if (this.currentStreak >= 7) {
            body.classList.add('streak-great');
        } else if (this.currentStreak >= 3) {
            body.classList.add('streak-good');
        } else if (this.daysSinceLast > 3) {
            body.classList.add('streak-danger');
        } else if (this.daysSinceLast > 1) {
            body.classList.add('streak-warning');
        }
    }

    async loadMessages() {
        const messages = await this.storage.getMessages();
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';

        messages.forEach(msg => {
            this.displayMessage(msg.sender, msg.content, new Date(msg.timestamp));
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    displayMessage(sender, content, timestamp = new Date()) {
        const container = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const timeStr = timestamp.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            ${content}
            <span class="message-time">${timeStr}</span>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage(sender, type, data = {}) {
        const context = {
            type,
            streak: this.currentStreak,
            daysSinceLast: this.daysSinceLast,
            data
        };

        let content;
        if (sender === 'assistant') {
            content = await this.messageProvider.getMessage(context);
        } else {
            content = data.content || '';
        }

        // Store message
        await this.storage.addMessage({
            sender,
            content,
            context
        });

        // Display message
        this.displayMessage(sender, content);
    }

    async handleWorkoutComplete() {
        // Record workout
        await this.storage.addWorkout({
            status: 'completed',
            scheduledTime: this.settings.workoutTime,
            completedTime: new Date().toISOString()
        });

        // Update streak
        await this.loadStreak();
        this.updateBackgroundColor();

        // Send completion message
        await this.sendMessage('user', 'completed', { content: 'I did it!' });
        await this.sendMessage('assistant', 'completed');

        // Update next workout
        this.updateNextWorkoutDisplay();
    }

    async handleWorkoutSkipped() {
        // Record skip
        await this.storage.addWorkout({
            status: 'skipped',
            scheduledTime: this.settings.workoutTime
        });

        // Update streak
        await this.loadStreak();
        this.updateBackgroundColor();

        // Send skip message
        await this.sendMessage('user', 'skipped', { content: 'Skipping today' });
        await this.sendMessage('assistant', 'skipped');

        // Update next workout
        this.updateNextWorkoutDisplay();
    }

    checkWorkoutTime() {
        if (this.notifications.isWorkoutTime(this.settings.workoutTime, this.settings.activeDays)) {
            // Highlight quick actions
            document.getElementById('markDoneBtn').style.boxShadow = '0 0 20px rgba(92, 184, 92, 0.5)';
        }
    }

    updateNextWorkoutDisplay() {
        const nextWorkoutEl = document.getElementById('nextWorkoutTime');
        const formatted = this.notifications.formatNextWorkoutTime(
            this.settings.workoutTime,
            this.settings.activeDays
        );
        nextWorkoutEl.textContent = formatted;
    }

    async loadHistory() {
        const workouts = await this.storage.getWorkouts(30);
        const container = document.getElementById('historyContent');
        
        if (workouts.length === 0) {
            container.innerHTML = '<div class="empty-state">No workout history yet. Get started!</div>';
            return;
        }

        container.innerHTML = '';
        
        workouts.forEach(workout => {
            const div = document.createElement('div');
            div.className = `history-item ${workout.status}`;
            
            const date = new Date(workout.date);
            const dateStr = date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            
            const statusText = {
                'completed': '✓ Completed',
                'skipped': '○ Skipped',
                'missed': '✗ Missed'
            }[workout.status] || workout.status;
            
            div.innerHTML = `
                <div class="history-item-date">${dateStr}</div>
                <div class="history-item-status">${statusText}</div>
                ${workout.notes ? `<div class="history-item-note">${workout.notes}</div>` : ''}
            `;
            
            container.appendChild(div);
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WorkoutBuddyApp();
});

// Handle notification clicks
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'notification-click') {
            // Handle different notification types
            if (event.data.notificationType === 'workout') {
                // Focus on the app
                window.focus();
            } else if (event.data.notificationType === 'followup') {
                // Send follow-up message
                if (window.app) {
                    window.app.sendMessage('assistant', 'reminderFollowUp');
                }
            }
        }
    });
}
