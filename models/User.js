const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String, // Storing as plain text for now as per legacy logic, ideally hash this
        required: true
    },
    email: {
        type: String,
        default: ''
    },
    leetcodeUsername: {
        type: String,
        default: ''
    },
    dailyGoal: {
        type: Number,
        default: 4
    },
    preferences: {
        enableDailyReminder: { type: Boolean, default: false },
        enableEndOfDaySummary: { type: Boolean, default: false },
        reminderTime: { type: String, default: '09:00' },
        summaryTime: { type: String, default: '23:00' }
    },
    progress: [{
        problemId: { type: String, required: true },
        status: { type: String, enum: ['todo', 'inProgress', 'done'], default: 'todo' },
        dateCompleted: { type: String }, // Format YYYY-MM-DD
        notes: { type: String, default: '' },
        priority: { type: String, enum: ['none', 'low', 'medium', 'high'], default: 'none' },
        timeSpent: { type: Number, default: 0 }
    }]
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;
