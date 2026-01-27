const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // or 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
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

// Send Daily Reminder
const sendDailyReminder = async (to, username, todayCompleted, dailyGoal) => {
  const remaining = Math.max(0, dailyGoal - todayCompleted);
  const template = getDailyReminderTemplate(username, todayCompleted, dailyGoal, remaining);

  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"LeetCode Tracker" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: template.subject,
      html: template.html,
    });

    console.log('Daily reminder sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending daily reminder:', error);
    return { success: false, error: error.message };
  }
};

// Send End of Day Summary
const sendEndOfDaySummary = async (to, username, stats) => {
  const template = getEndOfDaySummaryTemplate(username, stats);

  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"LeetCode Tracker" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: template.subject,
      html: template.html,
    });

    console.log('End of day summary sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending end of day summary:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
const testEmailConfig = async (to) => {
  const transporter = createTransporter();

  try {
    await transporter.verify();
    console.log('Email server is ready');

    // Send test email
    const info = await transporter.sendMail({
      from: `"LeetCode Tracker" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: '✅ Email Notifications Configured Successfully!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">🎉 Success!</h2>
          <p>Your email notifications are now set up and ready to go!</p>
          <p>You'll receive:</p>
          <ul>
            <li>Daily reminders about your progress</li>
            <li>End-of-day summaries of your achievements</li>
          </ul>
          <p>Happy coding! 💻</p>
        </div>
      `,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email configuration test failed:', error);
    return { success: false, error: error.message };
  }
};

// LeetCode Summary Template
const getLeetCodeSummaryTemplate = (username, stats, recentSubmissions) => {
  return {
    subject: `📅 LeetCode Update: ${stats.totalSolved} Solved!`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <div style="background: #ffa116; color: white; padding: 25px; text-align: center;">
            <h1 style="margin: 0;">LeetCode Progress Tracker</h1>
          </div>
          
          <div style="padding: 25px;">
            <h2>Hello ${username}! 👋</h2>
            <p>Here is your current LeetCode standing according to your linked profile.</p>
            
            <div style="display: flex; justify-content: space-around; background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.easySolved}</div>
                    <div style="font-size: 12px; color: #666;">Easy</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${stats.mediumSolved}</div>
                    <div style="font-size: 12px; color: #666;">Medium</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${stats.hardSolved}</div>
                    <div style="font-size: 12px; color: #666;">Hard</div>
                </div>
            </div>
            
            <div style="text-align: center; font-size: 18px; margin-bottom: 20px;">
                Total Solved: <strong>${stats.totalSolved}</strong>
            </div>

            <h3>Recent Activity 🕒</h3>
            <ul style="list-style: none; padding: 0;">
                ${recentSubmissions.slice(0, 5).map(sub => `
                    <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                        <span>${sub.title}</span>
                        <span style="color: #666; font-size: 12px;">${new Date(sub.timestamp * 1000).toLocaleDateString()}</span>
                    </li>
                `).join('')}
            </ul>

            <center style="margin-top: 30px;">
              <a href="https://leetcode.com/${username}" style="background: #ffa116; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Profile</a>
            </center>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

const sendLeetCodeSummary = async (to, username, stats, recentSubmissions) => {
  const template = getLeetCodeSummaryTemplate(username, stats, recentSubmissions);
  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"LeetCode Tracker" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: template.subject,
      html: template.html,
    });
    console.log(`LeetCode summary sent to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending LeetCode summary:', error);
    return { success: false, error: error.message };
  }
};

// Combined Master Summary Template
const getMasterSummaryTemplate = (username, appStats, leetcodeStats, recentSubmissions) => {
  const { todayCompleted, dailyGoal, totalSolved: appTotal, streak } = appStats;
  const { easySolved, mediumSolved, hardSolved, totalSolved: lcTotal } = leetcodeStats || { easySolved: 0, mediumSolved: 0, hardSolved: 0, totalSolved: 0 };

  // Dynamic Greeting based on goal
  const goalMet = todayCompleted >= dailyGoal;
  const greeting = goalMet ? "🎉 Amazing Work Today!" : "👊 Keep Pushing!";
  const message = goalMet
    ? `You smashed your daily goal of ${dailyGoal} problems.`
    : `You completed ${todayCompleted} out of ${dailyGoal} problems today. Consitency is key!`;

  return {
    subject: `📊 Daily Report: ${todayCompleted} App / ${lcTotal || 0} LeetCode`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 20px; margin: 0;">
        <div style="max-width: 650px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 26px;">Daily Coding Recap</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div style="padding: 30px;">
            <!-- Greeting & Main App Stats -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #1f2937; margin-bottom: 10px;">${greeting}</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin: 0;">${message}</p>
            </div>

            <div style="display: flex; gap: 15px; margin-bottom: 30px;">
                <div style="flex: 1; background: #eff6ff; padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 800; color: #3b82f6;">${todayCompleted}</div>
                    <div style="font-size: 12px; font-weight: 600; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">Today's Count</div>
                </div>
                <div style="flex: 1; background: #fff7ed; padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 800; color: #f97316;">${streak}🔥</div>
                    <div style="font-size: 12px; font-weight: 600; color: #9a3412; text-transform: uppercase; letter-spacing: 0.5px;">Day Streak</div>
                </div>
            </div>

            <!-- LeetCode Stats Section -->
            ${leetcodeStats ? `
            <div style="border-top: 2px solid #f3f4f6; padding-top: 30px; margin-top: 30px;">
                <h3 style="color: #1f2937; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>🚀</span> Live LeetCode Stats
                </h3>
                
                <div style="display: flex; justify-content: space-between; background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
                    <div style="text-align: center;">
                        <span style="display: block; font-size: 20px; font-weight: bold; color: #10b981;">${easySolved}</span>
                        <span style="font-size: 12px; color: #6b7280;">Easy</span>
                    </div>
                    <div style="text-align: center; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; padding: 0 20px; flex: 1;">
                        <span style="display: block; font-size: 20px; font-weight: bold; color: #f59e0b;">${mediumSolved}</span>
                        <span style="font-size: 12px; color: #6b7280;">Medium</span>
                    </div>
                    <div style="text-align: center;">
                        <span style="display: block; font-size: 20px; font-weight: bold; color: #ef4444;">${hardSolved}</span>
                        <span style="font-size: 12px; color: #6b7280;">Hard</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 15px; font-size: 14px; color: #6b7280;">
                    Total Solved on Profile: <strong>${lcTotal}</strong>
                </div>
            </div>
            ` : ''}

            <!-- Recent Activity -->
            ${recentSubmissions && recentSubmissions.length > 0 ? `
            <div style="margin-top: 30px;">
                <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 16px;">Recent Submissions</h3>
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    ${recentSubmissions.slice(0, 5).map((sub, i) => `
                        <div style="padding: 12px 15px; border-bottom: ${i === 4 ? 'none' : '1px solid #f3f4f6'}; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 500; color: #374151;">${sub.title}</span>
                            <span style="font-size: 12px; color: #9ca3af;">${new Date(sub.timestamp * 1000).toLocaleDateString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px;">
              <a href="http://localhost:5173" style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Go to Dashboard</a>
              <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">LeetCode Tracker • Keep coding!</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

const sendMasterSummary = async (to, username, appStats, leetcodeStats, recentSubmissions) => {
  const template = getMasterSummaryTemplate(username, appStats, leetcodeStats, recentSubmissions);
  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"LeetCode Tracker" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: template.subject,
      html: template.html,
    });
    console.log(`Master Summary sent to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending Master Summary:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendDailyReminder,
  sendEndOfDaySummary,
  sendLeetCodeSummary,
  sendMasterSummary,
  testEmailConfig,
};
