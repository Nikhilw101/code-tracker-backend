# LeetCode Tracker Backend

Backend server for email notifications using Node.js, Express, and Nodemailer.

## Features

- 📧 Email notifications (Daily Reminders & End-of-Day Summaries)
- ⏰ Scheduled email delivery using cron jobs
- 🎨 Beautiful HTML email templates
- 🔧 Configurable notification preferences
- ✅ Email configuration testing

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Email Credentials

1. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   PORT=5000
   ```

### 3. Get Gmail App Password

**Important:** You need to use an App Password, not your regular Gmail password.

Steps to create a Gmail App Password:
1. Enable 2-Factor Authentication on your Google Account
2. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and your device
4. Click "Generate"
5. Copy the 16-character password (e.g., `qotm gmml ggnf xxvw`)
6. Paste it in your `.env` file as `EMAIL_PASS` (remove spaces)

### 4. Start the Server

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /api/health
```
Returns: `{ status: 'ok', message: 'Backend server is running' }`

### Save Email Preferences
```
POST /api/email/preferences
Body: {
  userId: string,
  email: string,
  enableDailyReminder: boolean,
  enableEndOfDaySummary: boolean,
  reminderTime: string (HH:MM),
  summaryTime: string (HH:MM)
}
```

### Get Email Preferences
```
GET /api/email/preferences/:userId
```

### Test Email Configuration
```
POST /api/email/test
Body: { email: string }
```
Sends a test email to verify configuration.

### Send Daily Reminder
```
POST /api/email/send-reminder
Body: {
  userId: string,
  email: string,
  username: string,
  todayCompleted: number,
  dailyGoal: number
}
```

### Send End-of-Day Summary
```
POST /api/email/send-summary
Body: {
  email: string,
  username: string,
  stats: {
    todayCompleted: number,
    dailyGoal: number,
    completed: number,
    total: number,
    streak: number,
    categoryProgress: object
  }
}
```

## Email Templates

### Daily Reminder
- Shows progress toward daily goal
- Visual progress bar
- Statistics cards (Completed Today, Daily Goal, Remaining)
- Call-to-action button to continue solving

### End-of-Day Summary
- Complete daily statistics
- Achievement badge (if goal met)
- Current streak
- Category-wise progress breakdown
- Motivational message

## Scheduled Tasks

The server runs a cron job every hour to check if it's time to send emails based on user preferences:

- **Daily Reminder**: Sent at user's preferred time (default: 9:00 AM)
- **End-of-Day Summary**: Sent at user's preferred time (default: 9:00 PM)

## Troubleshooting

### Emails not sending?

1. **Check backend server is running**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Verify .env configuration**
   - Ensure `EMAIL_USER` is correct
   - Ensure `EMAIL_PASS` is the App Password (not regular password)
   - Remove any spaces from the App Password

3. **Check server logs**
   - Look for error messages in the console
   - Common issues:
     - "Invalid credentials" → Wrong App Password
     - "ECONNREFUSED" → Gmail blocked the connection
     - "SMTP error" → Check firewall/antivirus

4. **Test with the Test Email button**
   - Use the frontend Settings page
   - Click "Send Test Email"
   - Check both inbox and spam folder

### Using other email providers

For Outlook:
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

For Yahoo:
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

## Security Notes

- Never commit `.env` file to git
- Keep your App Password secure
- Use App Passwords instead of regular passwords
- The `.env` file is already in `.gitignore`

## Development

To modify email templates, edit `emailService.js`:
- `getDailyReminderTemplate()` - Daily reminder HTML
- `getEndOfDaySummaryTemplate()` - Summary HTML

Templates use inline CSS for email client compatibility.
