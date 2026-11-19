import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createAppServer } from './server.mjs';

test('requires a registered account to publish and returns saved products in the catalog', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'semeiaki-api-'));
  const server = createAppServer({ dbPath: join(directory, 'test.sqlite') });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const productData = {
      name: 'Macaxeira',
      category: 'Horta',
      price: 8.5,
      description: 'Colhida nesta semana',
      image: '',
    };
    const anonymousPost = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    assert.equal(anonymousPost.status, 401);

    const registration = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'senha-segura-123',
        phone: '(87) 99999-1111',
        site: 'Sítio Lagoa',
        city: 'Afogados da Ingazeira',
        location: 'Comunidade Lagoa',
        reference: '',
      }),
    });
    assert.equal(registration.status, 201);
    const registrationBody = await registration.json();
    assert.equal(registrationBody.user.email, 'ana@example.com');
    assert.equal('password' in registrationBody.user, false);
    const cookie = registration.headers.get('set-cookie')?.split(';')[0];
    assert(cookie);

    const session = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: cookie },
    });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).user.email, 'ana@example.com');

    const anonymousSession = await fetch(`${baseUrl}/api/auth/session`);
    assert.equal(anonymousSession.status, 200);
    assert.equal((await anonymousSession.json()).user, null);

    const duplicateRegistration = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ana',
        email: 'ANA@example.com',
        password: 'senha-segura-123',
        phone: '(87) 99999-1111',
        city: 'Afogados da Ingazeira',
        location: 'Comunidade Lagoa',
      }),
    });
    assert.equal(duplicateRegistration.status, 409);

    const published = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(productData),
    });
    assert.equal(published.status, 201);
    const publishedBody = await published.json();
    assert.equal(publishedBody.product.producer, 'Ana · Sítio Lagoa');
    assert.equal(publishedBody.product.phone, '(87) 99999-1111');

    const catalog = await fetch(`${baseUrl}/api/products`);
    const products = await catalog.json();
    assert(products.some((product) => product.name === 'Macaxeira'));

    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    assert.equal(logout.status, 204);
    const expiredSession = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: cookie },
    });
    assert.equal(expiredSession.status, 200);
    assert.equal((await expiredSession.json()).user, null);

    const incorrectLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ana@example.com', password: 'senha-incorreta' }),
    });
    assert.equal(incorrectLogin.status, 401);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ana@example.com',
        password: 'senha-segura-123',
        remember: true,
      }),
    });
    assert.equal(login.status, 200);
    assert(login.headers.get('set-cookie')?.includes('HttpOnly'));
    assert(login.headers.get('set-cookie')?.includes('Max-Age=604800'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  }
});
