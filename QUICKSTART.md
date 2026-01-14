# Quick Start Guide

## Get It Running in 2 Minutes

1. **Download all the files** to a folder on your computer

2. **Open a terminal/command prompt** in that folder

3. **Start a local web server**:
   
   If you have Python 3:
   ```bash
   python3 -m http.server 8000
   ```
   
   Or Python 2:
   ```bash
   python -m SimpleHTTPServer 8000
   ```
   
   Or if you have Node.js:
   ```bash
   npx http-server -p 8000
   ```

4. **Open your browser** to: http://localhost:8000

5. **Grant notification permissions** when prompted

6. **Configure your schedule**:
   - Click the settings icon (⚙️)
   - Set your workout time (default is noon)
   - Check the days you want to work out (Monday, Thursday, Saturday, Sunday are pre-selected)
   - Close settings

7. **You're done!** The app will:
   - Show when your next workout is scheduled
   - Send you a notification at that time
   - Follow up 1 hour later
   - Track your streak

## First Test

Want to test it right now?

1. Open Settings
2. Set the workout time to 2 minutes from now
3. Make sure today is checked
4. Close settings
5. Wait for the notification!

## Install on Your Phone

1. Open the app in your mobile browser (Chrome or Safari)
2. Tap the browser menu
3. Select "Add to Home Screen" or "Install"
4. Now you have a native-feeling app!

## Using Live AI (Optional)

If you want me to actually talk to you (costs ~$0.25-0.50/month):

1. Get an API key from https://console.anthropic.com
2. Go to Settings in the app
3. Change Message Provider to "Live AI"
4. Paste your API key
5. Save

Scripted messages are free and work great, though!

## Need Help?

Check README.md for full documentation.

The app is designed to work even if you're skeptical. Just set it up and let it nag you. That's the whole point.
