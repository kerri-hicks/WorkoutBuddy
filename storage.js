// Storage Module - Handles all data persistence using localStorage and IndexedDB

class WorkoutStorage {
    constructor() {
        this.storageKey = 'workoutBuddy';
        this.dbName = 'WorkoutBuddyDB';
        this.dbVersion = 1;
        this.db = null;
        this._initDB();
    }

    async _initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('workouts')) {
                    const workoutStore = db.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true });
                    workoutStore.createIndex('date', 'date', { unique: false });
                    workoutStore.createIndex('status', 'status', { unique: false });
                }

                if (!db.objectStoreNames.contains('messages')) {
                    const messageStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // Settings Management (localStorage)
    getSettings() {
        const defaultSettings = {
            workoutTime: '12:00',
            activeDays: [0, 1, 4, 6], // Sunday, Monday, Thursday, Saturday
            messageProvider: 'scripted',
            apiKey: '',
            notificationsEnabled: false
        };

        const stored = localStorage.getItem(this.storageKey + '_settings');
        return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    }

    saveSettings(settings) {
        localStorage.setItem(this.storageKey + '_settings', JSON.stringify(settings));
    }

    // Workout History (IndexedDB)
    async addWorkout(workout) {
        await this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workouts'], 'readwrite');
            const store = transaction.objectStore('workouts');
            
            const workoutData = {
                date: workout.date || new Date().toISOString(),
                scheduledTime: workout.scheduledTime,
                completedTime: workout.completedTime || null,
                status: workout.status, // 'completed', 'skipped', 'missed'
                notes: workout.notes || '',
                activity: workout.activity || ''
            };

            const request = store.add(workoutData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getWorkouts(limit = 30) {
        await this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workouts'], 'readonly');
            const store = transaction.objectStore('workouts');
            const index = store.index('date');
            
            const request = index.openCursor(null, 'prev'); // Newest first
            const results = [];
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    results.push({ id: cursor.primaryKey, ...cursor.value });
                    count++;
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getWorkoutsByDateRange(startDate, endDate) {
        await this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workouts'], 'readonly');
            const store = transaction.objectStore('workouts');
            const index = store.index('date');
            
            const range = IDBKeyRange.bound(startDate.toISOString(), endDate.toISOString());
            const request = index.getAll(range);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getLastWorkout() {
        const workouts = await this.getWorkouts(1);
        return workouts.length > 0 ? workouts[0] : null;
    }

    // Message History (IndexedDB)
    async addMessage(message) {
        await this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            
            const messageData = {
                timestamp: message.timestamp || new Date().toISOString(),
                sender: message.sender, // 'user', 'assistant', 'system'
                content: message.content,
                context: message.context || {}
            };

            const request = store.add(messageData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getMessages(limit = 50) {
        await this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('timestamp');
            
            const request = index.openCursor(null, 'prev');
            const results = [];
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    results.push({ id: cursor.primaryKey, ...cursor.value });
                    count++;
                    cursor.continue();
                } else {
                    resolve(results.reverse()); // Return in chronological order
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Streak Calculation
    async getCurrentStreak() {
        const workouts = await this.getWorkouts(100); // Get enough to calculate streak
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Only count completed workouts
        const completedWorkouts = workouts.filter(w => w.status === 'completed');
        
        if (completedWorkouts.length === 0) return 0;

        // Check if most recent workout was today or yesterday
        const lastWorkout = new Date(completedWorkouts[0].date);
        lastWorkout.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today - lastWorkout) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 1) return 0; // Streak broken

        // Count consecutive days with completed workouts
        for (let i = 0; i < completedWorkouts.length; i++) {
            const workoutDate = new Date(completedWorkouts[i].date);
            workoutDate.setHours(0, 0, 0, 0);
            
            if (i === 0) {
                streak = 1;
            } else {
                const prevDate = new Date(completedWorkouts[i - 1].date);
                prevDate.setHours(0, 0, 0, 0);
                
                const diff = Math.floor((prevDate - workoutDate) / (1000 * 60 * 60 * 24));
                
                if (diff <= 1) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        return streak;
    }

    async getDaysSinceLastWorkout() {
        const lastWorkout = await this.getLastWorkout();
        if (!lastWorkout) return 999;

        const today = new Date();
        const lastDate = new Date(lastWorkout.date);
        return Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    }

    // Stats
    async getStats() {
        const workouts = await this.getWorkouts(30); // Last 30 workouts
        
        const completed = workouts.filter(w => w.status === 'completed').length;
        const skipped = workouts.filter(w => w.status === 'skipped').length;
        const missed = workouts.filter(w => w.status === 'missed').length;
        const total = workouts.length;
        
        return {
            completed,
            skipped,
            missed,
            total,
            completionRate: total > 0 ? (completed / total * 100).toFixed(1) : 0
        };
    }

    // Clear all data
    async clearAllData() {
        localStorage.removeItem(this.storageKey + '_settings');
        
        await this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workouts', 'messages'], 'readwrite');
            
            transaction.objectStore('workouts').clear();
            transaction.objectStore('messages').clear();
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async _ensureDB() {
        if (!this.db) {
            await this._initDB();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkoutStorage;
}
