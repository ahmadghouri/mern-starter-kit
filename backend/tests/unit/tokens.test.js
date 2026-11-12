const jwt = require('jsonwebtoken');
const {
  signAccessToken,
  verifyAccessToken,
  generateOpaqueToken,
  hashToken,
} = require('../../src/lib/tokens');
const { escapeHtml } = require('../../src/emails/passwordReset');

describe('access tokens', () => {
  const claims = { userId: 'user-1', role: 'user', sessionId: 'session-1' };

  it('signs and verifies a token with subject, role, and session id', () => {
    const payload = verifyAccessToken(signAccessToken(claims));

    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('user');
    expect(payload.sid).toBe('session-1');
  });

  it('rejects a token signed with another secret', () => {
    const forged = jwt.sign({ sid: 's' }, 'another-secret-another-secret-12345', {
      subject: 'user-1',
      issuer: 'starter-kit-api',
      audience: 'starter-kit-web',
    });
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('rejects the "none" algorithm', () => {
    const unsigned = jwt.sign({ sid: 's' }, null, { algorithm: 'none', subject: 'user-1' });
    expect(() => verifyAccessToken(unsigned)).toThrow();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign(
      { sid: 's', exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_ACCESS_SECRET,
      { subject: 'user-1', issuer: 'starter-kit-api', audience: 'starter-kit-web' },
    );
    expect(() => verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
  });
});

describe('opaque tokens', () => {
  it('generates unique url-safe tokens', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[\w-]{64}$/);
  });

  it('hashes deterministically', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});

describe('escapeHtml', () => {
  it('escapes HTML special characters in email templates', () => {
    expect(escapeHtml('<script>"x"&\'y\'</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;',
    );
  });
});
