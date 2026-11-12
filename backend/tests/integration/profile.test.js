const request = require('supertest');
const { createApp } = require('../../src/app');
const { PasswordResetToken } = require('../../src/models/PasswordResetToken');
const { useTestDatabase } = require('../helpers/db');
const { VALID_USER, registerUser } = require('../helpers/auth');

useTestDatabase();

const app = createApp();

const authed = (method, path, token) =>
  request(app)[method](path).set('Authorization', `Bearer ${token}`);

const login = ({ email, password }) =>
  request(app).post('/api/auth/login').send({ email, password });

// Smallest valid headers for each supported format, padded to look like real files.
const IMAGES = {
  png: Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(32)]),
  jpeg: Buffer.concat([Buffer.from('ffd8ffe0', 'hex'), Buffer.alloc(32)]),
  webp: Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(32)]),
  avif: Buffer.concat([Buffer.alloc(4), Buffer.from('ftypavif'), Buffer.alloc(32)]),
};

const uploadAvatar = (token, data, contentType = 'image/webp') =>
  authed('put', '/api/profile/avatar', token).set('Content-Type', contentType).send(data);

describe('profile routes require authentication', () => {
  it.each([
    ['patch', '/api/profile'],
    ['patch', '/api/profile/email'],
    ['put', '/api/profile/password'],
    ['put', '/api/profile/avatar'],
    ['delete', '/api/profile/avatar'],
  ])('%s %s returns 401 without a token', async (method, path) => {
    await request(app)[method](path).expect(401);
  });
});

describe('PATCH /api/profile', () => {
  it('updates the name', async () => {
    const { accessToken } = await registerUser(app);

    const response = await authed('patch', '/api/profile', accessToken)
      .send({ name: '  New Name  ' })
      .expect(200);

    expect(response.body.data.user.name).toBe('New Name');
  });

  it('rejects empty names and unknown fields such as role', async () => {
    const { accessToken } = await registerUser(app);

    await authed('patch', '/api/profile', accessToken).send({ name: ' ' }).expect(400);
    await authed('patch', '/api/profile', accessToken)
      .send({ name: 'Ok', role: 'admin' })
      .expect(400);
  });
});

describe('PATCH /api/profile/email', () => {
  it('changes the email after checking the current password', async () => {
    const { accessToken } = await registerUser(app);

    const response = await authed('patch', '/api/profile/email', accessToken)
      .send({ email: 'New.Email@Example.com', currentPassword: VALID_USER.password })
      .expect(200);

    expect(response.body.data.user.email).toBe('new.email@example.com');
    await login({ email: 'new.email@example.com', password: VALID_USER.password }).expect(200);
    await login({ email: VALID_USER.email, password: VALID_USER.password }).expect(401);
  });

  it('rejects a wrong current password', async () => {
    const { accessToken } = await registerUser(app);

    const response = await authed('patch', '/api/profile/email', accessToken)
      .send({ email: 'other@example.com', currentPassword: 'WrongPassword1' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    expect(response.body.error.details).toEqual([
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);
  });

  it('rejects an email that belongs to another account', async () => {
    await registerUser(app, { email: 'taken@example.com' });
    const { accessToken } = await registerUser(app);

    const response = await authed('patch', '/api/profile/email', accessToken)
      .send({ email: 'taken@example.com', currentPassword: VALID_USER.password })
      .expect(409);

    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('invalidates pending password reset links', async () => {
    const { accessToken } = await registerUser(app);
    await request(app).post('/api/auth/forgot-password').send({ email: VALID_USER.email });
    expect(await PasswordResetToken.countDocuments()).toBe(1);

    await authed('patch', '/api/profile/email', accessToken)
      .send({ email: 'moved@example.com', currentPassword: VALID_USER.password })
      .expect(200);

    expect(await PasswordResetToken.countDocuments()).toBe(0);
  });
});

describe('PUT /api/profile/password', () => {
  it('changes the password and signs out other devices only', async () => {
    const { accessToken } = await registerUser(app);
    const other = await login(VALID_USER).expect(200);

    const response = await authed('put', '/api/profile/password', accessToken)
      .send({ currentPassword: VALID_USER.password, newPassword: 'BrandNew123' })
      .expect(200);

    expect(response.body.data.message).toMatch(/password has been changed/i);
    await authed('get', '/api/auth/me', accessToken).expect(200);
    await authed('get', '/api/auth/me', other.body.data.accessToken).expect(401);

    await login({ email: VALID_USER.email, password: 'BrandNew123' }).expect(200);
    await login(VALID_USER).expect(401);
  });

  it('rejects a wrong current password, a weak password, and reusing the same one', async () => {
    const { accessToken } = await registerUser(app);
    const change = (body) => authed('put', '/api/profile/password', accessToken).send(body);

    const wrong = await change({ currentPassword: 'Nope12345', newPassword: 'BrandNew123' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('INVALID_CURRENT_PASSWORD');

    const weak = await change({ currentPassword: VALID_USER.password, newPassword: 'short' });
    expect(weak.status).toBe(400);

    const same = await change({
      currentPassword: VALID_USER.password,
      newPassword: VALID_USER.password,
    });
    expect(same.status).toBe(400);
    expect(same.body.error.details[0].field).toBe('newPassword');
  });
});

describe('avatar', () => {
  it.each(Object.entries(IMAGES))('accepts %s images and serves them back', async (type, data) => {
    const { accessToken, user } = await registerUser(app);

    const response = await uploadAvatar(accessToken, data, `image/${type}`).expect(200);
    const { avatarVersion } = response.body.data.user;
    expect(typeof avatarVersion).toBe('number');

    const image = await request(app)
      .get(`/api/avatars/${user.id}?v=${avatarVersion}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(image.headers['content-type']).toBe(`image/${type}`);
    expect(image.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(image.body, data)).toBe(0);
  });

  it('detects the real type instead of trusting the header', async () => {
    const { accessToken, user } = await registerUser(app);

    await uploadAvatar(accessToken, IMAGES.png, 'image/webp').expect(200);

    const image = await request(app).get(`/api/avatars/${user.id}`).expect(200);
    expect(image.headers['content-type']).toBe('image/png');
  });

  it('rejects non-image data, SVG, and unsupported content types', async () => {
    const { accessToken } = await registerUser(app);

    const fake = await uploadAvatar(accessToken, Buffer.from('<script>alert(1)</script>xx'));
    expect(fake.status).toBe(415);
    expect(fake.body.error.code).toBe('UNSUPPORTED_IMAGE');

    await uploadAvatar(accessToken, Buffer.from('<svg></svg>'), 'image/svg+xml').expect(415);
    await uploadAvatar(accessToken, IMAGES.png, 'text/plain').expect(415);
  });

  it('rejects images over the size limit', async () => {
    const { accessToken } = await registerUser(app);
    const large = Buffer.concat([IMAGES.png, Buffer.alloc(600 * 1024)]);

    const response = await uploadAvatar(accessToken, large, 'image/png').expect(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('removes the avatar', async () => {
    const { accessToken, user } = await registerUser(app);
    await uploadAvatar(accessToken, IMAGES.webp).expect(200);

    const response = await authed('delete', '/api/profile/avatar', accessToken).expect(200);

    expect(response.body.data.user.avatarVersion).toBeNull();
    await request(app).get(`/api/avatars/${user.id}`).expect(404);
  });

  it('returns 400 for an invalid user id', async () => {
    await request(app).get('/api/avatars/not-an-id').expect(400);
  });
});
