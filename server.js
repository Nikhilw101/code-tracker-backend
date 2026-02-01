const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { sendDailyReminder, sendEndOfDaySummary, testEmailConfig } = require('./emailService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const connectDB = require('./db');
const User = require('./models/User');

// Global Error Handlers for process stability
process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION! Shutting down...', err);
    // Ideally restart process, but for dev we log
});

process.on('unhandledRejection', (err) => {
    console.error('🔥 UNHANDLED REJECTION! Shutting down...', err);
});

// Connect to Database
connectDB();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend server is running' });
});

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const user = await User.create({
            username,
            password, // Plain text for now as requested
            email
        });

        res.status(201).json({
            success: true,
            userId: user._id,
            username: user.username,
            email: user.email
        });
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ success: false, message: 'Server error during signup' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username
        // Note: Password comparison should use hashing in production
        const user = await User.findOne({ username });

        if (user && user.password === password) {
            res.json({
                success: true,
                userId: user._id,
                username: user.username,
                email: user.email,
                preferences: user.preferences
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// User Data Routes
app.get('/api/user/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({
            success: true,
            data: {
                username: user.username,
                email: user.email,
                leetcodeUsername: user.leetcodeUsername,
                dailyGoal: user.dailyGoal,
                preferences: user.preferences,
                progress: user.progress
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching user data' });
    }
});

app.put('/api/user/:userId/progress', async (req, res) => {
    try {
        const { problemId, updates } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if problem already exists in progress
        const problemIndex = user.progress.findIndex(p => p.problemId === problemId);

        if (problemIndex > -1) {
            // Update existing
            user.progress[problemIndex] = { ...user.progress[problemIndex].toObject(), ...updates };
        } else {
            // Add new
            user.progress.push({ problemId, ...updates });
        }

        await user.save();
        res.json({ success: true, progress: user.progress });
    } catch (error) {
        console.error('Progress Update Error:', error);
        res.status(500).json({ success: false, message: 'Error updating progress' });
    }
});

app.post('/api/user/:userId/preferences', async (req, res) => {
    try {
        const { leetcodeUsername, dailyGoal, preferences, email } = req.body;
        const updates = {};

        if (leetcodeUsername !== undefined) updates.leetcodeUsername = leetcodeUsername;
        if (dailyGoal !== undefined) updates.dailyGoal = dailyGoal;
        if (email !== undefined) updates.email = email;
        if (preferences) {
            // Merge preferences logic if needed, or simple replace
            updates.preferences = preferences;
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: updates },
            { new: true }
        );

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating preferences' });
    }
});

// Email Routes
app.post('/api/email/save-preferences', async (req, res) => {
    res.status(400).json({ message: 'Please use /api/user/:userId/preferences' });
});

app.post('/api/email/send-reminder', async (req, res) => {
    const { userId, email, username } = req.body;

    // If we have userId, we can fetch real stats. Otherwise we rely on body params (legacy/test mode)
    if (userId) {
        try {
            const user = await User.findById(userId);
            if (user && user.email) {
                const todayStr = new Date().toISOString().split('T')[0];
                const todayCompletedCount = user.progress.filter(p =>
                    p.status === 'done' && p.dateCompleted === todayStr
                ).length;

                const result = await require('./emailService').sendDailyReminder(
                    user.email,
                    user.username,
                    todayCompletedCount,
                    user.dailyGoal
                );
                return res.json(result);
            }
        } catch (e) {
            console.error(e);
        }
    }

    // Fallback or explicit test params
    const { todayCompleted, dailyGoal } = req.body;
    const destEmail = email || process.env.EMAIL_USER;

    if (!destEmail || !username) {
        return res.status(400).json({ error: 'Email and username are required' });
    }

    const result = await require('./emailService').sendDailyReminder(destEmail, username, todayCompleted || 0, dailyGoal || 4);
    res.json(result);
});

// Helper to calculate App Stats from User Model
const calculateAppStats = (user) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCompleted = user.progress.filter(p => p.status === 'done' && p.dateCompleted === todayStr).length;

    // Simple streak calc (simulated based on done count existence over days)
    // Real prod logic would need better streak tracking in DB
    const streak = user.progress.length > 0 ? 'Active' : 0;

    return {
        todayCompleted,
        dailyGoal: user.dailyGoal,
        streak: 1, // Placeholder or simple calc
        totalSolved: user.progress.filter(p => p.status === 'done').length
    };
};

app.post('/api/email/send-summary', async (req, res) => {
    const { userId, email, username } = req.body;

    if (userId) {
        try {
            const user = await User.findById(userId);
            if (user) {
                // 1. Fetch LeetCode Data
                let lcStats = null;
                let lcRecent = null;

                if (user.leetcodeUsername) {
                    const statsResult = await getLeetCodeStats(user.leetcodeUsername);
                    const recentResult = await getRecentSubmissions(user.leetcodeUsername);
                    if (statsResult.success) lcStats = statsResult.data;
                    if (recentResult.success) lcRecent = recentResult.data;
                }

                // 2. Calculate App Stats
                const appStats = calculateAppStats(user);

                // 3. Send Unified Email
                const result = await require('./emailService').sendMasterSummary(
                    user.email || email,
                    user.username,
                    appStats,
                    lcStats,
                    lcRecent
                );
                return res.json(result);
            }
        } catch (e) { console.error(e); }
    }

    // Fallback if no user found
    res.status(404).json({ success: false, message: 'User not found for summary' });
});

app.post('/api/email/test', async (req, res) => {
    const { email } = req.body;
    const destEmail = email || process.env.EMAIL_USER;
    const result = await require('./emailService').testEmailConfig(destEmail);
    res.json(result);
});

// LeetCode API Routes
const { getLeetCodeStats, getRecentSubmissions } = require('./leetcodeService');

app.get('/api/leetcode/:username', async (req, res) => {
    const { username } = req.params;
    const result = await getLeetCodeStats(username);
    if (result.success) {
        res.json(result.data);
    } else {
        res.status(400).json({ error: result.error });
    }
});

app.get('/api/leetcode/:username/recent', async (req, res) => {
    const { username } = req.params;
    const result = await getRecentSubmissions(username);
    if (result.success) {
        res.json(result.data);
    } else {
        res.status(400).json({ error: result.error });
    }
});

// Scheduled tasks
// Scheduled Logic
const runScheduledChecks = async (forceHour = null, isForceMode = false) => {
    const now = new Date();
    // Using a more robust IST conversion
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const currentHour = forceHour !== null ? forceHour : istTime.getUTCHours();

    // Only Daytime hours: 9 AM, 12 PM, 3 PM, 6 PM, 9 PM IST
    const ALERT_HOURS = [9, 12, 15, 18, 21];

    if (ALERT_HOURS.includes(currentHour) || isForceMode) {
        console.log(`⏰ [${istTime.toISOString()}] Starting Scheduled Check for hour ${currentHour}...`);
        try {
            const users = await User.find({
                email: { $ne: '' },
                $or: [
                    { 'preferences.enableEndOfDaySummary': true },
                    { 'preferences.enableDailyReminder': true }
                ]
            }).select('username email leetcodeUsername dailyGoal preferences progress');

            if (users.length === 0) {
                console.log('ℹ️ No eligible users found for this hour.');
                return { success: true, count: 0 };
            }

            console.log(`📋 Processing ${users.length} users...`);

            // Process users in smaller batches to avoid timeouts
            let successCount = 0;
            for (const user of users) {
                try {
                    let lcStats = null;
                    let lcRecent = null;

                    if (user.leetcodeUsername) {
                        // Use a shorter timeout for individual user lookups if possible
                        const s = await getLeetCodeStats(user.leetcodeUsername).catch(() => ({ success: false }));
                        const r = await getRecentSubmissions(user.leetcodeUsername).catch(() => ({ success: false }));
                        if (s.success) lcStats = s.data;
                        if (r.success) lcRecent = r.data;
                    }

                    const appStats = calculateAppStats(user);
                    await require('./emailService').sendMasterSummary(
                        user.email,
                        user.username,
                        appStats,
                        lcStats,
                        lcRecent
                    );
                    successCount++;
                } catch (userError) {
                    console.error(`❌ Error for ${user.username}:`, userError.message);
                }
            }
            console.log(`✅ Sent: ${successCount}/${users.length}`);
            return { success: true, sent: successCount, total: users.length };
        } catch (error) {
            console.error('❌ Scheduled Check Error:', error);
            throw error;
        }
    } else {
        console.log(`⏭️  Hour ${currentHour} IST is not an alert hour. Skipping.`);
        return { success: true, message: 'Skipped (not alert hour)' };
    }
};

// External Cron Trigger Endpoint
app.get('/api/cron/trigger', async (req, res) => {
    const forceHour = req.query.hour ? parseInt(req.query.hour) : null;
    const isForceMode = req.query.force === 'true';

    try {
        // On Vercel, we MUST await the process to ensure it completes before the function terminates
        // However, this might hit the 10s timeout if there are MANY users.
        // For now, we await it to ensure it actually runs.
        const result = await runScheduledChecks(forceHour, isForceMode);

        res.json({
            success: true,
            message: result.message || 'Cron process completed',
            details: result,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Cron Trigger Error:', err);
        res.status(500).json({
            success: false,
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Internal Cron (Backup/Development)
cron.schedule('0 * * * *', async () => {
    console.log('Running automated hourly check...');
    await runScheduledChecks().catch(console.error);
});

// Self-pinging to keep Render Free Tier awake during active hours (optional but helpful)
// Note: Render free tier still sleeps after 15m of NO traffic. 
// This internal interval only helps if the server is already awake.
setInterval(() => {
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const hour = istTime.getUTCHours();

    if (hour >= 9 && hour <= 23) {
        console.log('Keep-alive: Internal heartbeat (Daytime)');
    }
}, 14 * 60 * 1000); // Every 14 minutes

// Start server with DB connection check (only for local development)
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`✅ Backend server running on http://localhost:${PORT}`);
            console.log(`📧 Email service ready`);
            console.log(`⏰ Scheduled tasks initialized`);
            console.log(`💡 For Vercel: Use external cron service to call /api/cron/trigger`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
    startServer();
} else {
    // In Vercel, just connect to DB
    connectDB();
}

// Export the Express app for Vercel serverless functions
module.exports = app;
