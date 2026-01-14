# Workout Buddy - Personal Accountability PWA

A progressive web app designed to help you stay accountable to your workout routine with scheduled notifications, streak tracking, and optional AI-powered messaging.

## Features

- **Scheduled Notifications**: Get reminded at your workout time on specific days
- **Follow-up Check-ins**: Automatic follow-up 1 hour later to track what you actually did
- **Streak Tracking**: Visual feedback on your consistency with dynamic background colors
- **Modular Messaging**: Choose between scripted messages or live AI responses via Anthropic API
- **Workout History**: Track completed, skipped, and missed workouts
- **Offline Support**: Works offline as a PWA
- **Installable**: Add to home screen on mobile devices

## Setup

### Basic Setup (Scripted Messages - Free)

1. **Serve the files**: You need to serve these files from a web server (not just opening index.html)
   
   Quick option using Python:
   ```bash
   python3 -m http.server 8000
   ```
   
   Then open: http://localhost:8000

2. **Install as PWA** (optional but recommended):
   - On mobile: Open in browser, tap "Add to Home Screen"
   - On desktop Chrome: Click install icon in address bar

3. **Configure your schedule**:
   - Tap the settings icon (⚙️)
   - Set your workout time (default is 12:00 PM)
   - Select which days you want to work out
   - The app will calculate and show your next workout time

4. **Enable notifications**:
   - First time you interact with the app, you'll be prompted for notification permissions
   - Grant permission to receive workout reminders

### Advanced Setup (Live AI Messages - Requires API Key)

1. **Get an Anthropic API key**:
   - Sign up at https://console.anthropic.com
   - Generate an API key
   - Note: This will cost money per message (~$0.003 per interaction with Sonnet 4)

2. **Configure API**:
   - Go to Settings in the app
   - Change "Message Provider" to "Live AI"
   - Enter your API key
   - Save

3. **Costs**:
   - Typical usage: ~10-20 messages per week
   - Estimated cost: ~$0.25-0.50 per month
   - You can always switch back to scripted messages

## How It Works

### Notification Flow

1. **Scheduled Time**: At your configured workout time on active days:
   - You receive a notification: "💪 Workout Time!"
   - Opening the app shows a motivational message from your buddy

2. **Follow-up (1 hour later)**:
   - Second notification: "Check-in Time"
   - App asks what you actually did

3. **Actions**:
   - **"I Did It!"**: Marks workout complete, updates streak, celebrates with you
   - **"Skip Today"**: Records as skipped, resets streak, acknowledges without judgment
   - **No action**: Eventually recorded as "missed"

### Streak System

- **Completed workouts**: Build your streak
- **Skipped/Missed**: Resets streak to 0
- **Background colors change** based on performance:
  - Green gradient: Good streak (3-6 days)
  - Deeper green: Great streak (7-13 days)
  - Richest green: Amazing streak (14+ days)
  - Yellow: Warning (2-3 days since last workout)
  - Red: Danger (4+ days since last workout)

### Message Personality

The buddy is designed to be:
- Direct and no-nonsense
- Supportive without coddling
- Realistic about the struggle
- Celebratory of wins without being over-the-top
- Understanding about the mental barrier vs. physical capability

## Architecture

### Modular Design

The app is built with swappable components:

1. **MessageProvider** (`messageProvider.js`):
   - Interface: `getMessage(context)`
   - Implementations:
     - `ScriptedMessageProvider`: Pre-written contextual messages
     - `AnthropicAPIProvider`: Live AI via Anthropic API
   - Easy to swap via settings

2. **Storage** (`storage.js`):
   - IndexedDB for workout history and messages
   - localStorage for settings
   - Methods for streak calculation, stats, history

3. **Notifications** (`notifications.js`):
   - Handles permission requests
   - Schedules notifications based on settings
   - Calculates next workout time
   - Manages follow-up reminders

4. **App** (`app.js`):
   - Main orchestration
   - UI updates
   - Event handling
   - Ties all modules together

### Adding New Features

The modular architecture makes it easy to extend:

- **New message types**: Add to `ScriptedMessageProvider.messages` object
- **New data tracking**: Extend `storage.js` schemas
- **New notification patterns**: Add methods to `notifications.js`
- **Different AI providers**: Implement `MessageProvider` interface

## Technical Requirements

- Modern browser with:
  - Service Workers
  - IndexedDB
  - Notification API
  - localStorage
- HTTPS (required for service workers in production)

## Files

- `index.html`: Main UI structure
- `styles.css`: Responsive styling with dynamic colors
- `app.js`: Main application logic
- `messageProvider.js`: Modular messaging system
- `storage.js`: Data persistence layer
- `notifications.js`: Notification scheduling
- `sw.js`: Service worker for PWA
- `manifest.json`: PWA configuration

## Deployment

For production deployment:

1. Host on HTTPS (required for service workers)
2. Add real icon files (192x192 and 512x512)
3. Update `manifest.json` with production URLs
4. Test on actual mobile devices
5. Consider backend for API key storage (don't expose in client)

## Privacy

- All data stored locally on your device
- No data sent to servers (except optional API calls to Anthropic)
- No analytics or tracking
- API key stored in localStorage (not encrypted - use with caution)

## Troubleshooting

**Notifications not working?**
- Check browser notification permissions
- Ensure service worker is registered (check DevTools > Application)
- Test on mobile device (desktop notifications can be flaky)

**Can't install as PWA?**
- Must be served over HTTPS (or localhost)
- Check manifest.json is accessible
- Try different browser (Chrome/Edge work best)

**API messages not working?**
- Verify API key is correct
- Check browser console for errors
- Ensure you have API credits
- Network requests require internet connection

## Future Enhancements

Potential features to add:
- Voice input for check-ins
- Photo logging of workouts
- Integration with fitness trackers
- Social sharing of streaks
- Custom workout types/goals
- Graphs and advanced analytics
- Backup/restore to cloud

## License

Built for personal use. Modify as needed.
