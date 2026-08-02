# Supabase Email Verification Setup Guide

This guide explains how to configure Supabase to enable email verification for user signups.

## Required Supabase Configuration

### 1. Enable Email Confirmation

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers** → **Email**
3. Enable the following settings:
   - **Confirm email**: Toggle ON
   - **Secure email change**: Toggle ON (recommended)

### 2. Configure Email Templates

Go to **Authentication** → **Email Templates** and configure the following:

#### Confirm Signup Template

**Subject**: `Confirm Your Email - ROAVA`

**Body** (HTML):
```html
<h2>Welcome to ROAVA!</h2>
<p>Thanks for signing up! Please confirm your email address by clicking the button below:</p>
<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirm Email</a></p>
<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link will expire in 24 hours.</p>
<p>If you didn't create an account, you can safely ignore this email.</p>
```

### 3. Configure Site URL and Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set the following:
   - **Site URL**: `https://yourdomain.com` (or `http://localhost:5173` for development)
   - **Redirect URLs**: Add the following URLs:
     - `https://yourdomain.com/traveler/verify-email`
     - `http://localhost:5173/traveler/verify-email` (for development)

### 4. Email Provider Setup

#### Using Supabase's Built-in Email Service (Development)
- By default, Supabase uses their email service for development
- Rate limits apply (4 emails per hour per user in free tier)
- Emails may go to spam

#### Using Custom SMTP (Production - Recommended)

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Configure your SMTP provider (e.g., SendGrid, Mailgun, AWS SES):
   - **Sender email**: noreply@yourdomain.com
   - **Sender name**: ROAVA
   - **Host**: smtp.sendgrid.net (or your provider)
   - **Port**: 587
   - **Username**: Your SMTP username
   - **Password**: Your SMTP password

**Recommended Providers**:
- **SendGrid**: Free tier allows 100 emails/day
- **Mailgun**: Free tier allows 5,000 emails/month
- **AWS SES**: Pay-as-you-go, very affordable

## How the Email Verification Flow Works

### 1. User Signup
1. User fills out signup form
2. System creates account in Supabase Auth
3. Supabase sends verification email automatically
4. User is redirected to `/traveler/verify-email?email={email}`

### 2. Verification Page
1. User sees message to check email
2. Can resend verification email if needed (with 60s cooldown)
3. Link to go back to login page

### 3. Email Link Click
1. User clicks verification link in email
2. Supabase validates the token
3. User is redirected to: `/traveler/verify-email?type=signup&email={email}`
4. Page checks if email is confirmed
5. If confirmed, shows success message and redirects to login

### 4. Login Attempt
1. User tries to login
2. System checks `email_confirmed_at` field
3. If not confirmed, redirects to verification page
4. If confirmed, logs user in normally

## Testing Email Verification

### Local Development Testing

1. Start your development server: `npm run dev`
2. Sign up with a test email (use a real email you can access)
3. Check your email inbox (and spam folder)
4. Click the verification link
5. Verify you're redirected to the verification success page
6. Try logging in

### Troubleshooting

**Email not received:**
- Check spam/junk folder
- Verify email provider configuration
- Check Supabase logs: **Authentication** → **Users** → Click on user → View logs
- Try resending verification email

**Verification link not working:**
- Ensure redirect URLs are properly configured in Supabase
- Check that Site URL matches your domain
- Verify the email template includes `{{ .ConfirmationURL }}`

**User can login without verification:**
- Ensure "Confirm email" is enabled in Supabase
- Check that the login function checks `email_confirmed_at`
- Clear browser localStorage and try again

## Email Template Variables

Available variables in email templates:
- `{{ .ConfirmationURL }}` - The verification link
- `{{ .Token }}` - The verification token (use with ConfirmationURL)
- `{{ .TokenHash }}` - Hashed version of the token
- `{{ .SiteURL }}` - Your configured site URL
- `{{ .Email }}` - User's email address

## Security Best Practices

1. **Always use HTTPS in production** for redirect URLs
2. **Set appropriate token expiration** (default is 24 hours)
3. **Use a custom domain email** (e.g., noreply@yourdomain.com) instead of Supabase's default
4. **Monitor failed verification attempts** in Supabase logs
5. **Implement rate limiting** for resend verification requests (already implemented: 60s cooldown)

## Support

If you encounter issues:
1. Check Supabase dashboard logs
2. Verify all configuration steps above
3. Test with a different email address
4. Check browser console for errors
5. Review Supabase documentation: https://supabase.com/docs/guides/auth/auth-email
