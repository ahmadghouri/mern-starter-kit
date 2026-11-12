const request = require('supertest');
const { REFRESH_COOKIE_NAME } = require('../../src/lib/cookies');

const VALID_USER = Object.freeze({
  name: 'Test User',
  email: 'test.user@example.com',
  password: 'Password123',
});

/** Returns the raw `name=value` pair of the refresh cookie, if set. */
function getRefreshCookie(response) {
  const cookies = response.headers['set-cookie'] ?? [];
  const cookie = cookies.find((value) => value.startsWith(`${REFRESH_COOKIE_NAME}=`));
  return cookie ? cookie.split(';')[0] : null;
}

async function registerUser(app, overrides = {}) {
  const body = { ...VALID_USER, ...overrides };
  const response = await request(app).post('/api/auth/register').send(body).expect(201);
  return {
    response,
    user: response.body.data.user,
    accessToken: response.body.data.accessToken,
    refreshCookie: getRefreshCookie(response),
    credentials: { email: body.email, password: body.password },
  };
}

module.exports = { VALID_USER, getRefreshCookie, registerUser };
