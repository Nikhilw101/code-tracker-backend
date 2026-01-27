const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Interaction timeout settings (in ms)
    connectionTimeout: 10000, // Wait 10s for connection
    greetingTimeout: 5000,    // Wait 5s for greeting
    socketTimeout: 10000,     // Wait 10s for socket operations
  });
};

// Daily Reminder Template
const getDailyReminderTemplate = (username, todayCompleted, dailyGoal, remaining) => {
  const progress = Math.round((todayCompleted / dailyGoal) * 100);

  return {
    subject: `🎯 Daily LeetCode Reminder - ${remaining} problems remaining!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 30px;
          }
          .progress-bar {
            background: #e5e7eb;
            height: 24px;
            border-radius: 12px;
            overflow: hidden;
            margin: 20px 0;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
            width: ${progress}%;
            transition: width 0.5s ease;
          }
          .stats {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
          }
          .stat-card {
            text-align: center;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            flex: 1;
            margin: 0 10px;
          }
          .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #6366f1;
          }
          .stat-label {
            font-size: 14px;
            color: #6b7280;
            margin-top: 5px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
            padding: 15px 40px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 LeetCode Tracker</h1>
            <p>Daily Progress Update</p>
          </div>
          
          <div class="content">
            <h2>Hey ${username}! 👋</h2>
            <p>Just checking in on your LeetCode journey today!</p>
            
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
            
            <div class="stats">
              <div class="stat-card">
                <div class="stat-value">${todayCompleted}</div>
                <div class="stat-label">Completed Today</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${dailyGoal}</div>
                <div class="stat-label">Daily Goal</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${remaining}</div>
                <div class="stat-label">Remaining</div>
              </div>
            </div>
            
            ${remaining > 0 ? `
              <p style="color: #f59e0b; font-weight: bold;">
                ⚠️ You still have ${remaining} problem${remaining > 1 ? 's' : ''} to complete for today's goal!
              </p>
            ` : `
              <p style="color: #10b981; font-weight: bold;">
                ✅ Congratulations! You've achieved your daily goal!
              </p>
            `}
            
            <center>
              <a href="http://localhost:5173/problems" class="cta-button">
                Continue Solving →
              </a>
            </center>
          </div>
          
          <div class="footer">
            <p>Keep up the great work! 💪</p>
            <p>LeetCode Tracker - Your coding journey companion</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

// End of Day Summary Template
const getEndOfDaySummaryTemplate = (username, stats) => {
  return {
    subject: `📊 Daily Summary - ${stats.todayCompleted} problems solved!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f4;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 30px;
          }
          .summary-card {
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .summary-item:last-child {
            border-bottom: none;
          }
          .summary-label {
            color: #6b7280;
          }
          .summary-value {
            font-weight: bold;
            color: #1f2937;
          }
          .achievement {
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
          }
          .category-progress {
            margin: 20px 0;
          }
          .category-item {
            margin: 10px 0;
          }
          .category-name {
            font-weight: 500;
            margin-bottom: 5px;
          }
          .progress-bar {
            background: #e5e7eb;
            height: 10px;
            border-radius: 5px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 End of Day Summary</h1>
            <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div class="content">
            <h2>Great work today, ${username}! 🎉</h2>
            
            ${stats.todayCompleted >= stats.dailyGoal ? `
              <div class="achievement">
                <h3 style="margin: 0;">🏆 Daily Goal Achieved!</h3>
                <p style="margin: 10px 0 0 0;">You completed ${stats.todayCompleted} problems today!</p>
              </div>
            ` : ''}
            
            <div class="summary-card">
              <h3>Today's Statistics</h3>
              <div class="summary-item">
                <span class="summary-label">Problems Solved Today</span>
                <span class="summary-value">${stats.todayCompleted}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Daily Goal</span>
                <span class="summary-value">${stats.dailyGoal}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total Solved</span>
                <span class="summary-value">${stats.completed} / ${stats.total}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Current Streak</span>
                <span class="summary-value">${stats.streak} days 🔥</span>
              </div>
            </div>
            
            <h3>Category Progress</h3>
            <div class="category-progress">
              ${Object.entries(stats.categoryProgress || {}).slice(0, 5).map(([category, data]) => `
                <div class="category-item">
                  <div class="category-name">${category}: ${data.completed}/${data.total} (${data.percentage}%)</div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${data.percentage}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <p style="text-align: center; margin-top: 30px; color: #6b7280;">
              Keep up the momentum! Tomorrow is a new opportunity! 💪
            </p>
          </div>
          
          <div class="footer">
            <p>LeetCode Tracker - Your coding journey companion</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

// Send email with fallback strategy
const sendEmailWithFallback = async (to, subject, html) => {
  // 1. Try Nodemailer (Gmail)
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"LeetCode Tracker" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });
    console.log('Email sent via Nodemailer:', info.messageId);
    return { success: true, method: 'nodemailer', messageId: info.messageId };
  } catch (error) {
    console.error('Nodemailer failed:', error.message);

    // 2. Try Resend API as Fallback
    if (process.env.RESEND_API_KEY) {
      console.log('Attempting fallback to Resend API...');
      return await sendViaResend(to, subject, html);
    }

    return { success: false, error: error.message };
  }
};

// Send via Resend API
const sendViaResend = async (to, subject, html) => {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Default testing domain
        to: to,
        subject: subject,
        html: html
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Email sent via Resend:', data.id);
      return { success: true, method: 'resend', messageId: data.id };
    } else {
      console.error('Resend API Error:', data);
      return { success: false, error: data.message || 'Resend API failed', details: data };
    }
  } catch (error) {
    console.error('Resend Fetch Error:', error);
    return { success: false, error: 'Resend network error' };
  }
};

// Send Daily Reminder
const sendDailyReminder = async (to, username, todayCompleted, dailyGoal) => {
  const remaining = Math.max(0, dailyGoal - todayCompleted);
  const template = getDailyReminderTemplate(username, todayCompleted, dailyGoal, remaining);
  return await sendEmailWithFallback(to, template.subject, template.html);
};

// Send End of Day Summary
const sendEndOfDaySummary = async (to, username, stats) => {
  const template = getEndOfDaySummaryTemplate(username, stats);
  return await sendEmailWithFallback(to, template.subject, template.html);
};

// Test email configuration
const testEmailConfig = async (to) => {
  // Test both or just generic? using fallback wrapper to test real flow
  const subject = '✅ Email Notifications Configured Successfully!';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">🎉 Success!</h2>
      <p>Your email notifications are now set up and ready to go!</p>
      <p>This email confirms that your sending pipeline (Nodemailer or Resend) is working.</p>
    </div>
  `;
  return await sendEmailWithFallback(to, subject, html);
};

const sendLeetCodeSummary = async (to, username, stats, recentSubmissions) => {
  const template = getLeetCodeSummaryTemplate(username, stats, recentSubmissions);
  return await sendEmailWithFallback(to, template.subject, template.html);
};

const sendMasterSummary = async (to, username, appStats, leetcodeStats, recentSubmissions) => {
  const template = getMasterSummaryTemplate(username, appStats, leetcodeStats, recentSubmissions);
  return await sendEmailWithFallback(to, template.subject, template.html);
};

module.exports = {
  sendDailyReminder,
  sendEndOfDaySummary,
  sendLeetCodeSummary,
  sendMasterSummary,
  testEmailConfig,
};
