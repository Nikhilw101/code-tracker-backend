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
const runScheduledChecks = async (forceHour = null) => {
    const now = new Date();

    // Convert to IST (Asia/Kolkata) timezone
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentHour = forceHour !== null ? forceHour : istTime.getHours();

    // Enhanced logging
    console.log(`\n⏰ ===== Scheduled Email Check =====`);
    console.log(`🌍 Server Time (UTC): ${now.toISOString()}`);
    console.log(`🇮🇳 IST Time: ${istTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false })}`);
    console.log(`🕐 Current IST Hour: ${currentHour}`);
    console.log(`${forceHour !== null ? '⚡ FORCED HOUR MODE' : ''}`);

    const ALERT_HOURS = [10, 18, 22];

    if (ALERT_HOURS.includes(currentHour)) {
        console.log(`✅ Hour ${currentHour} matches alert schedule - Processing users...`);
        try {
            const users = await User.find({});
            console.log(`📋 Found ${users.length} users to check.`);

            for (const user of users) {
                if (!user.email) continue;
                if (!user.preferences.enableEndOfDaySummary && !user.preferences.enableDailyReminder) continue;

                console.log(`\n📧 Processing user: ${user.username} (${user.email})`);

                // Prepare Data
                let lcStats = null;
                let lcRecent = null;

                try {
                    if (user.leetcodeUsername) {
                        console.log(`Debug: Fetching LC stats for ${user.leetcodeUsername}`);
                        const s = await getLeetCodeStats(user.leetcodeUsername);
                        console.log(`Debug: LC stats fetched. Success: ${s.success}`);

                        console.log(`Debug: Fetching Recent submissions`);
                        const r = await getRecentSubmissions(user.leetcodeUsername);
                        console.log(`Debug: Recent fetched. Success: ${r.success}`);

                        if (s.success) lcStats = s.data;
                        if (r.success) lcRecent = r.data;
                    }
                } catch (lcError) {
                    console.error('Debug: LeetCode Service Error', lcError);
                }

                console.log('Debug: Calculating App Stats');
                const appStats = calculateAppStats(user);

                console.log('Debug: Sending Email via Service');
                // Use the required module directly or rely on the cached require
                const emailService = require('./emailService');
                if (!emailService.sendMasterSummary) {
                    console.error('CRITICAL: sendMasterSummary function missing on emailService export!');
                    console.log('Available exports:', Object.keys(emailService));
                }

                await emailService.sendMasterSummary(
                    user.email,
                    user.username,
                    appStats,
                    lcStats,
                    lcRecent
                );
                console.log('Debug: Email sent function completed');
            }
            console.log(`\n✅ Scheduled check complete - Processed ${users.length} users`);
            return { success: true, count: users.length };
        } catch (error) {
            console.error('❌ Scheduled Check Error:', error);
            return { success: false, error: error.message };
        }
    } else {
        console.log(`⏭️  Hour ${currentHour} is not an alert hour (${ALERT_HOURS.join(', ')}). Skipping.`);
        return { success: true, skipped: true, currentHour };
    }
};

// External Cron Trigger Endpoint
app.get('/api/cron/trigger', async (req, res) => {
    try {
        // Allow voluntary force param for testing ?hour=22
        const forceHour = req.query.hour ? parseInt(req.query.hour) : null;

        // Optional: Verify a secret if you want to secure this
        // const authHeader = req.headers['authorization'];
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { return res.status(401).json({ error: 'Unauthorized' }); }

        const result = await runScheduledChecks(forceHour);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Internal Cron (Backup/Development)
// Note: Commented out for Vercel deployment - use external cron service (cron-job.org)
// to call /api/cron/trigger endpoint at scheduled times
// For local development, uncomment the line below:
// cron.schedule('0 * * * *', async () => {
//     await runScheduledChecks();
// });

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
