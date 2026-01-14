// Notifications Module - Handles scheduled notifications and permissions

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.scheduledNotifications = new Map();
        this._checkPermission();
    }

    async _checkPermission() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    async showNotification(title, options = {}) {
        if (this.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return null;
        }

        // For service worker notifications (works better on mobile)
        if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
            const registration = await navigator.serviceWorker.ready;
            return registration.showNotification(title, {
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                ...options
            });
        } else {
            // Fallback to regular notification
            return new Notification(title, {
                icon: '/icon-192.png',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                ...options
            });
        }
    }

    scheduleWorkoutNotification(time, days) {
        // Clear existing scheduled notifications
        this.clearScheduledNotifications();

        // Calculate next notification time
        const nextTime = this._getNextNotificationTime(time, days);
        
        if (nextTime) {
            const timeUntilNotification = nextTime - Date.now();
            
            if (timeUntilNotification > 0) {
                const timeoutId = setTimeout(() => {
                    this.showNotification('💪 Workout Time!', {
                        body: 'Time to get moving. Open the app and let\'s do this.',
                        tag: 'workout-reminder',
                        data: { type: 'workout' }
                    });

                    // Schedule follow-up notification (1 hour later)
                    this.scheduleFollowUpNotification();

                    // Reschedule for next workout
                    this.scheduleWorkoutNotification(time, days);
                }, timeUntilNotification);

                this.scheduledNotifications.set('workout', timeoutId);
                
                return nextTime;
            }
        }

        return null;
    }

    scheduleFollowUpNotification() {
        const followUpDelay = 60 * 60 * 1000; // 1 hour

        const timeoutId = setTimeout(() => {
            this.showNotification('Check-in Time', {
                body: 'Hey, did you end up doing anything? Let me know.',
                tag: 'workout-followup',
                data: { type: 'followup' }
            });
        }, followUpDelay);

        this.scheduledNotifications.set('followup', timeoutId);
    }

    _getNextNotificationTime(time, activeDays) {
        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);

        // Check today first
        const today = new Date();
        today.setHours(hours, minutes, 0, 0);

        if (activeDays.includes(today.getDay()) && today > now) {
            return today;
        }

        // Check next 7 days
        for (let i = 1; i <= 7; i++) {
            const nextDay = new Date(now);
            nextDay.setDate(nextDay.getDate() + i);
            nextDay.setHours(hours, minutes, 0, 0);

            if (activeDays.includes(nextDay.getDay())) {
                return nextDay;
            }
        }

        return null;
    }

    getNextWorkoutTime(time, activeDays) {
        const nextTime = this._getNextNotificationTime(time, activeDays);
        return nextTime ? nextTime.toISOString() : null;
    }

    clearScheduledNotifications() {
        this.scheduledNotifications.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        this.scheduledNotifications.clear();
    }

    // Format next workout time for display
    formatNextWorkoutTime(time, activeDays) {
        const nextTime = this._getNextNotificationTime(time, activeDays);
        
        if (!nextTime) {
            return 'No workouts scheduled';
        }

        const now = new Date();
        const diff = nextTime - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = dayNames[nextTime.getDay()];
        
        const timeStr = nextTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });

        if (hours < 24) {
            if (hours < 1) {
                return `Today at ${timeStr} (in ${minutes}m)`;
            }
            return `Today at ${timeStr} (in ${hours}h ${minutes}m)`;
        } else if (hours < 48) {
            return `Tomorrow at ${timeStr}`;
        } else {
            return `${day} at ${timeStr}`;
        }
    }

    // Check if it's currently workout time
    isWorkoutTime(time, activeDays) {
        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        
        const workoutTime = new Date();
        workoutTime.setHours(hours, minutes, 0, 0);

        // Check if today is an active day
        if (!activeDays.includes(now.getDay())) {
            return false;
        }

        // Check if current time is within 2 hours of workout time
        const diff = now - workoutTime;
        const twoHours = 2 * 60 * 60 * 1000;

        return diff >= 0 && diff < twoHours;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
