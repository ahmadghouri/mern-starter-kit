const { createOriginChecker } = require('../../src/lib/origins');

const allowedOrigins = ['https://app.example.com'];

describe('createOriginChecker', () => {
  it('in production allows only configured origins', () => {
    const isTrusted = createOriginChecker({ allowedOrigins, allowAnyLocalhost: false });

    expect(isTrusted('https://app.example.com')).toBe(true);
    expect(isTrusted('http://localhost:5174')).toBe(false);
    expect(isTrusted('https://evil.example')).toBe(false);
  });

  it('in development also allows any localhost port', () => {
    const isTrusted = createOriginChecker({ allowedOrigins, allowAnyLocalhost: true });

    expect(isTrusted('http://localhost:5174')).toBe(true);
    expect(isTrusted('http://127.0.0.1:3000')).toBe(true);
    expect(isTrusted('http://[::1]:5173')).toBe(true);
  });

  it('never trusts look-alike hosts', () => {
    const isTrusted = createOriginChecker({ allowedOrigins, allowAnyLocalhost: true });

    expect(isTrusted('http://localhost.evil.example:5173')).toBe(false);
    expect(isTrusted('https://localhost:5173')).toBe(false);
    expect(isTrusted('http://evil.example/localhost:5173')).toBe(false);
  });
});
