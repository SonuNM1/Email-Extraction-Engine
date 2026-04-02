const BLOCKED_EMAIL_DOMAINS = new Set([
  'sentry.io', 'sentry-next.wixpress.com', 'wixpress.com',
  'rollbar.com', 'bugsnag.com',
  'example.com', 'test.com', 'domain.com',
  'yourdomain.com', 'yourcompany.com',
  'wordpress.com', 'wix.com', 'squarespace.com',
  'googleusercontent.com', 'cloudinary.com',
  'amazonaws.com', 'fastly.net',
  'mailchimp.com', 'hubspot.com',
]);

const BLOCKED_PREFIXES = new Set([
  'noreply', 'no-reply', 'donotreply',
  'mailer', 'postmaster', 'bounce',
  'unsubscribe', 'newsletter', 'notifications',
  'robot', 'daemon', 'webmaster',
]);

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function cleanEmails(emails) {
  const seen = new Set();

  return emails
    .map(raw => {
      try {
        return decodeURIComponent(raw.split('?')[0])
          .trim()
          .toLowerCase()
          .replace(/^[^a-z0-9]+/, '')
          .replace(/[^a-z0-9]+$/, '');
      } catch {
        return '';
      }
    })
    .filter(email => EMAIL_REGEX.test(email))

    // ❌ remove image/script junk

    .filter(email => !/\.(png|jpg|jpeg|gif|webp|svg|css|js)$/i.test(email))

    // ❌ remove calendar garbage

    .filter(email => !email.includes('calendar.google.com'))
    .filter(email => !email.includes('group.calendar'))

    // ❌ remove junk domains
    
    .filter(email => {

      const domain = email.split('@')[1];
      return !BLOCKED_EMAIL_DOMAINS.has(domain) &&
        ![...BLOCKED_EMAIL_DOMAINS].some(d => domain.endsWith('.' + d));
    })

    // ❌ remove useless prefixes

    .filter(email => !BLOCKED_PREFIXES.has(email.split('@')[0]))
    
    .filter(email => {
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
}