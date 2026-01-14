// Message Provider Interface
// This allows swapping between scripted messages and live AI API calls

class MessageProvider {
    async getMessage(context) {
        throw new Error('getMessage must be implemented by subclass');
    }
}

// Scripted Message Provider - Default implementation
class ScriptedMessageProvider extends MessageProvider {
    constructor() {
        super();
        this.messages = {
            welcome: [
                "Hey! Ready to get moving?",
                "It's workout time. Let's do this.",
                "Time to prove to yourself you can do this.",
                "I'm here. You're here. Let's get it done."
            ],
            checkIn: [
                "So... did you do it?",
                "How'd it go?",
                "Tell me what you did.",
                "What happened?"
            ],
            completed: [
                "Hell yes! That's what I'm talking about.",
                "You did it. I knew you would.",
                "There you go. That's the version of you that shows up.",
                "Excellent. Keep this momentum going."
            ],
            skipped: [
                "Okay, you skipped today. Tomorrow is a new day.",
                "Not today. That's fine. But don't make it a pattern.",
                "Alright. Just don't let this become the norm.",
                "Fair enough. But I'll be back tomorrow."
            ],
            missed: [
                "You missed one. It happens. Don't miss the next one.",
                "Missed today. The streak can start fresh tomorrow.",
                "That's a miss. Don't beat yourself up, just do better next time.",
                "Okay, you didn't make it. Reset and try again."
            ],
            streakGood: [
                "You're building something here. Keep going.",
                "This is a solid streak. Don't break it now.",
                "Look at you maintaining consistency. Nice work."
            ],
            streakGreat: [
                "This streak is impressive. You're proving something to yourself.",
                "You're on a roll. This is the momentum you needed.",
                "Damn. You're actually doing this. Keep it up."
            ],
            streakAmazing: [
                "This is incredible. You've made this a real habit.",
                "Look at this streak. You're a different person than you were when we started.",
                "This is what discipline looks like. You should be proud."
            ],
            encouragement: [
                "Remember: you just have to do the thing. It doesn't have to be perfect.",
                "Small actions. Consistent days. That's all this is.",
                "You've done this before. You can do it again.",
                "The hard part is starting. Once you start, you'll be fine."
            ],
            reminderFollowUp: [
                "Hey, checking in. What actually happened?",
                "It's been an hour. Did you end up doing anything?",
                "Following up - what did you do?"
            ]
        };
    }

    _selectRandom(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    async getMessage(context) {
        const { type, streak, daysSinceLast, data } = context;

        switch(type) {
            case 'welcome':
                return this._selectRandom(this.messages.welcome);
            
            case 'checkIn':
                return this._selectRandom(this.messages.checkIn);
            
            case 'completed':
                let response = this._selectRandom(this.messages.completed);
                if (streak >= 3 && streak < 7) {
                    response += ' ' + this._selectRandom(this.messages.streakGood);
                } else if (streak >= 7 && streak < 14) {
                    response += ' ' + this._selectRandom(this.messages.streakGreat);
                } else if (streak >= 14) {
                    response += ' ' + this._selectRandom(this.messages.streakAmazing);
                }
                return response;
            
            case 'skipped':
                return this._selectRandom(this.messages.skipped);
            
            case 'missed':
                let missedMsg = this._selectRandom(this.messages.missed);
                if (daysSinceLast > 3) {
                    missedMsg += " It's been a few days. Time to get back on track.";
                }
                return missedMsg;
            
            case 'encouragement':
                return this._selectRandom(this.messages.encouragement);
            
            case 'reminderFollowUp':
                return this._selectRandom(this.messages.reminderFollowUp);
            
            case 'message':
                // Generic response to user messages
                const responses = [
                    "Got it.",
                    "I hear you.",
                    "Okay.",
                    "Fair enough.",
                    "Noted.",
                    "Alright.",
                    "Makes sense."
                ];
                return this._selectRandom(responses);
            
            default:
                return "I'm here when you need me.";
        }
    }
}

// Anthropic API Message Provider - For live AI responses
class AnthropicAPIProvider extends MessageProvider {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.conversationHistory = [];
        this.systemPrompt = `You are Kerri's workout accountability buddy. You're direct, no-nonsense, supportive but not coddling. You know she struggles with motivation due to chronic pain and fatigue, but you also know she's capable when she pushes through the mental barrier.

Your role:
- Keep responses SHORT (1-3 sentences max)
- Be encouraging but realistic
- Celebrate wins without being over-the-top
- When she misses workouts, acknowledge it but don't pile on guilt
- Reference her streak and progress naturally
- Match her energy - if she's struggling, be gentle; if she's motivated, amplify it

Remember: She needs external structure because her internal motivation is depleted. You're the voice that shows up when she can't find it herself.`;
    }

    async getMessage(context) {
        const { type, streak, daysSinceLast, data } = context;

        // Build context-aware prompt
        let userMessage = this._buildPrompt(type, streak, daysSinceLast, data);

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 150,
                    system: this.systemPrompt,
                    messages: [
                        ...this.conversationHistory,
                        { role: 'user', content: userMessage }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const result = await response.json();
            const message = result.content[0].text;

            // Update conversation history
            this.conversationHistory.push(
                { role: 'user', content: userMessage },
                { role: 'assistant', content: message }
            );

            // Keep history manageable (last 10 exchanges)
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            return message;

        } catch (error) {
            console.error('API Error:', error);
            // Fallback to scripted message
            const fallback = new ScriptedMessageProvider();
            return await fallback.getMessage(context);
        }
    }

    _buildPrompt(type, streak, daysSinceLast, data) {
        const streakInfo = `Current streak: ${streak} days. Days since last workout: ${daysSinceLast}.`;

        switch(type) {
            case 'welcome':
                return `It's workout time. ${streakInfo} Send a brief motivational message (1-2 sentences).`;
            
            case 'checkIn':
                return `Workout was scheduled. ${streakInfo} Ask what they did (keep it short and direct).`;
            
            case 'completed':
                return `They completed their workout! ${streakInfo} Celebrate appropriately based on their streak (1-2 sentences).`;
            
            case 'skipped':
                return `They skipped today's workout. ${streakInfo} Acknowledge it without being harsh (1-2 sentences).`;
            
            case 'missed':
                return `They missed their workout entirely. ${streakInfo} Give a brief reality check (1-2 sentences).`;
            
            case 'encouragement':
                return `${streakInfo} Give brief encouragement to help them get started (1-2 sentences).`;
            
            case 'reminderFollowUp':
                return `Following up an hour after their scheduled workout. ${streakInfo} Ask what actually happened (keep it conversational and brief).`;
            
            case 'message':
                return `${streakInfo} User says: "${data.content}". Respond conversationally and briefly (1-2 sentences).`;
            
            default:
                return `${streakInfo} Say something supportive and brief.`;
        }
    }

    clearHistory() {
        this.conversationHistory = [];
    }
}

// Factory to get the appropriate provider
class MessageProviderFactory {
    static createProvider(type, apiKey = null) {
        switch(type) {
            case 'api':
                if (!apiKey) {
                    console.warn('No API key provided, falling back to scripted messages');
                    return new ScriptedMessageProvider();
                }
                return new AnthropicAPIProvider(apiKey);
            
            case 'scripted':
            default:
                return new ScriptedMessageProvider();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MessageProvider, ScriptedMessageProvider, AnthropicAPIProvider, MessageProviderFactory };
}
