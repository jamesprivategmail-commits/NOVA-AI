const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'trashmail.com',
  'yopmail.com',
  'yopmail.fr',
  'dispostable.com',
  'getnada.com',
  'sharklasers.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'maildrop.cc',
  'generator.email',
  'inboxkitten.com',
  'crazymailing.com',
  'mohmal.com',
  'mytemp.email',
  'fake-mail.org',
  'emailondeck.com',
  'tempmail.net',
  'discard.email',
  '0815.ru',
  'spamgourmet.com',
  'burnermail.io'
]);

export function validateEmail(email: string): { valid: boolean; reason?: string } {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: 'Invalid email address format.' };
  }

  const domain = trimmed.split('@')[1];
  if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { 
      valid: false, 
      reason: 'Temporary / disposable email addresses are strictly blocked. Please use a valid email account (e.g. Gmail, Yahoo, Outlook).' 
    };
  }

  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain both letters and numbers for account security.' };
  }
  return { valid: true };
}
