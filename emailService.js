const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter (Nodemailer fallback)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
};

// Send via Resend API (Primary)
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
      console.log('✅ Email sent via Resend:', data.id);
      return { success: true, method: 'resend', messageId: data.id };
    } else {
      console.error('❌ Resend API Error:', data);
      return { success: false, error: data.message || 'Resend API failed', details: data };
    }
  } catch (error) {
    console.error('❌ Resend Fetch Error:', error);
    return { success: false, error: 'Resend network error: ' + error.message };
  }
};

// Send email with fallback strategy (Resend primary, Nodemailer backup)
const sendEmailWithFallback = async (to, subject, html) => {
  // 1. Try Resend API first
  if (process.env.RESEND_API_KEY) {
    try {
      console.log('📧 Attempting to send email via Resend...');
      const result = await sendViaResend(to, subject, html);
      if (result.success) {
        return result;
      }
      console.warn('⚠️ Resend failed, trying Nodemailer fallback...');
    } catch (error) {
      console.error('Resend error:', error.message);
    }
  }

  // 2. Fallback to Nodemailer (Gmail)
  try {
    console.log('📧 Attempting to send email via Nodemailer (Gmail)...');
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"LeetCode Tracker" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });
    console.log('✅ Email sent via Nodemailer:', info.messageId);
    return { success: true, method: 'nodemailer', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Nodemailer failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Templates
const getDailyReminderTemplate = (username, todayCompleted, dailyGoal, remaining) => {
  const progress = Math.round((todayCompleted / dailyGoal) * 100);
  return {
    subject: `🎯 Daily LeetCode Reminder - ${remaining} problems remaining!`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f4f4f4;">
        <div style="background: white; border-radius: 12px; padding: 20px;">
           <h2 style="color: #4f46e5;">Hey ${username}! 👋</h2>
           <p>Only ${remaining} problems left to hit your goal!</p>
           <div style="background: #e5e7eb; height: 10px; border-radius: 5px; margin: 15px 0;">
             <div style="width: ${progress}%; background: #10b981; height: 100%; border-radius: 5px;"></div>
           </div>
           <p style="text-align: center;"><a href="http://localhost:5173" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Solve Now</a></p>
        </div>
      </div>
    `
  };
};

const getEndOfDaySummaryTemplate = (username, stats) => {
  return {
    subject: `📊 End of Day Summary`,
    html: `<h1>Good job ${username}!</h1><p>You solved ${stats.todayCompleted} problems today.</p>`
  };
};

const getMasterSummaryTemplate = (username, appStats, leetcodeStats, recentSubmissions) => {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lcHtml = leetcodeStats ?
    `<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
       <h3>💻 LeetCode Status</h3>
       <p>Total: ${leetcodeStats.totalSolved} | Easy: ${leetcodeStats.easySolved} | Medium: ${leetcodeStats.mediumSolved} | Hard: ${leetcodeStats.hardSolved}</p>
     </div>` : '';

  return {
    subject: `📊 Daily Summary - ${appStats.todayCompleted} problems solved!`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f4f4f4;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 20px;">
            <h1 style="color: #4f46e5; margin: 0;">Daily Summary</h1>
            <p style="color: #6b7280; margin-top: 5px;">${date}</p>
          </div>
          
          <div style="text-align: center;">
            <p style="font-size: 18px;">Hey <strong>${username}</strong>!</p>
            <div style="display: flex; justify-content: space-around; margin: 30px 0;">
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #4f46e5;">${appStats.todayCompleted}</div>
                <div style="font-size: 12px; color: #6b7280;">Today</div>
              </div>
               <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #10b981;">${appStats.dailyGoal}</div>
                <div style="font-size: 12px; color: #6b7280;">Goal</div>
              </div>
               <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${appStats.streak}</div>
                <div style="font-size: 12px; color: #6b7280;">Streak</div>
              </div>
            </div>
            ${appStats.todayCompleted >= appStats.dailyGoal ?
        '<div style="background: #ecfdf5; color: #047857; padding: 10px; border-radius: 6px; margin-bottom: 20px;">🎉 Goal Achieved! Great work!</div>' :
        `<div style="background: #fffbeb; color: #b45309; padding: 10px; border-radius: 6px; margin-bottom: 20px;">Keep going! ${Math.max(0, appStats.dailyGoal - appStats.todayCompleted)} more to go.</div>`
      }
          </div>
          
          ${lcHtml}
          
          <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
            LeetCode Tracker
          </div>
        </div>
      </div>
    `
  };
};

const getLeetCodeSummaryTemplate = (username, stats, recentSubmissions) => {
  return getMasterSummaryTemplate(username, { todayCompleted: 0, dailyGoal: 10, streak: 0 }, stats, recentSubmissions);
};

const sendDailyReminder = async (to, username, todayCompleted, dailyGoal) => {
  const remaining = Math.max(0, dailyGoal - todayCompleted);
  const template = getDailyReminderTemplate(username, todayCompleted, dailyGoal, remaining);
  return await sendEmailWithFallback(to, template.subject, template.html);
};

const sendEndOfDaySummary = async (to, username, stats) => {
  const template = getEndOfDaySummaryTemplate(username, stats);
  return await sendEmailWithFallback(to, template.subject, template.html);
};

const sendLeetCodeSummary = async (to, username, stats, recentSubmissions) => {
  const template = getLeetCodeSummaryTemplate(username, stats, recentSubmissions);
  return await sendEmailWithFallback(to, template.subject, template.html);
};

const sendMasterSummary = async (to, username, appStats, leetcodeStats, recentSubmissions) => {
  const template = getMasterSummaryTemplate(username, appStats, leetcodeStats, recentSubmissions);
  return await sendEmailWithFallback(to, template.subject, template.html);
};

const testEmailConfig = async (to) => {
  const subject = '✅ Email Config Test';
  const html = '<p>Your email configuration is working! (Resend/Nodemailer)</p>';
  return await sendEmailWithFallback(to, subject, html);
};

module.exports = {
  sendDailyReminder,
  sendEndOfDaySummary,
  sendLeetCodeSummary,
  sendMasterSummary,
  testEmailConfig,
};
