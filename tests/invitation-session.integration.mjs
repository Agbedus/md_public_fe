import assert from 'node:assert/strict';
import { encode } from 'next-auth/jwt';

// Run against a dedicated local server started with the same TEST-only secret.
const origin = process.env.INVITATION_TEST_ORIGIN || 'http://localhost:3012';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local test servers only');
const secret = process.env.INVITATION_TEST_AUTH_SECRET;
assert.ok(secret, 'Provide INVITATION_TEST_AUTH_SECRET matching the dedicated server AUTH_SECRET');
const cookies = await Promise.all(['authjs.session-token', '__Secure-authjs.session-token'].map(async name => {
  const token = await encode({
    secret, salt: name,
    token: { id: 'invite-test-user', email: 'member@example.com', accessToken: 'test-only-bearer-token', orgSlug: 'existing' },
  });
  return `${name}=${token}`;
}));
const headers = { Cookie: cookies.join('; ') };
const anonymous = await fetch(`${origin}/api/auth/session`);
assert.equal(anonymous.status, 200);
assert.deepEqual(await anonymous.json(), {});
assert.match(anonymous.headers.get('cache-control'), /no-store/);
const signedIn = await fetch(`${origin}/api/auth/session`, { headers });
assert.equal(signedIn.status, 200);
assert.deepEqual(await signedIn.json(), { user: { id: 'invite-test-user', email: 'member@example.com' } });
assert.match(signedIn.headers.get('cache-control'), /no-store/);
const invite = '/invite?token=test-invitation';
const login = await fetch(`${origin}/login?callbackUrl=${encodeURIComponent(invite)}`, { headers, redirect: 'manual' });
assert.equal(login.status, 302);
assert.equal(new URL(login.headers.get('location'), origin).pathname, '/invite');
const invitation = await fetch(`${origin}${invite}`, { headers, redirect: 'manual' });
assert.equal(invitation.status, 200, 'Invite must not redirect signed-in users back to login');
console.log('PASS: anonymous/session JSON, identity-only response, no-store, signed-in invite callback');
