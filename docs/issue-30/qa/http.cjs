/* Isolated regression fixture. Run only against the approved Windows review DB. */
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const { writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const req = createRequire(resolve('apps/backend/package.json'));
const { PrismaClient } = req('@prisma/client');
const { PrismaPg } = req('@prisma/adapter-pg');
const bcrypt = req('bcryptjs');
const dbUrl = new URL(process.env.DATABASE_URL);
assert(['127.0.0.1', 'localhost'].includes(dbUrl.hostname) && dbUrl.port === '55437' && dbUrl.pathname === '/weblogros_ui', 'Review database guard');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const base = 'http://localhost:3001';
const run = `qa30-${Date.now()}`;
const teams = [], users = [], results = [];
let team, admin, player, other, cookies = {};
let existingSnapshot;
async function snapshot() {
  const teams = await db.team.findMany({ where: { slug: { in: ['halcones', 'lobos'] } }, orderBy: { id: 'asc' } });
  const ids = teams.map(t => t.id);
  return { teams, memberships: await db.teamMembership.count({ where: { teamId: { in: ids } } }), logros: await db.logro.count({ where: { teamId: { in: ids } } }), awards: await db.userLogro.count({ where: { logro: { teamId: { in: ids } } } }), requests: await db.solicitudLogro.count({ where: { logro: { teamId: { in: ids } } } }), proposals: await db.propuestaLogro.count({ where: { teamId: { in: ids } } }) };
}
async function http(role, method, path, body, expected = 200) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookies[role] ? { Cookie: cookies[role] } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const json = await response.json();
  results.push({ role, method, path, expected, actual: response.status });
  assert((Array.isArray(expected) ? expected : [expected]).includes(response.status), `${method} ${path}: expected ${expected}; received ${response.status}: ${JSON.stringify(json)}`);
  return json;
}
const path = suffix => `/equipos/${team.slug}${suffix}`;
async function check(name, fn) { await fn(); results.push({ check: name, result: 'PASS' }); }
async function create(data) { return http('admin', 'POST', path('/logros'), { nombre: 'QA visible', puntos: 10, ...data }, 201); }
async function increment(logro, delta, role = 'admin', userId = player.id, expected = 200) { return http(role, 'PATCH', path(`/logros/${logro.id}/progreso`), { userId, delta }, expected); }
async function cleanup() {
  const ids = teams.map(t => t.id);
  // 📚 Borramos solo IDs creados por esta ejecución; jamás fixtures compartidos ni tablas completas.
  await db.$transaction(async tx => {
    await tx.achievementProgress.deleteMany({ where: { logro: { teamId: { in: ids } } } });
    await tx.solicitudLogro.deleteMany({ where: { logro: { teamId: { in: ids } } } });
    await tx.propuestaLogro.deleteMany({ where: { teamId: { in: ids } } });
    await tx.userLogro.deleteMany({ where: { logro: { teamId: { in: ids } } } });
    await tx.logro.deleteMany({ where: { teamId: { in: ids } } });
    await tx.team.deleteMany({ where: { id: { in: ids } } });
    await tx.user.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
  });
}
async function main() {
  existingSnapshot = await snapshot();
  const existingCatalog = await db.logro.findMany({ where: { team: { slug: 'halcones' } } });
  assert(existingCatalog.every(l => l.kind === 'STANDARD' && l.isSecret === false && l.targetValue === null), 'conservative migration defaults');
  results.push({ check: 'migration preserves existing default catalog', result: 'PASS', rows: existingCatalog.length });
  const password = require('node:crypto').randomBytes(24).toString('hex');
  const hash = await bcrypt.hash(password, 10);
  for (const label of ['main', 'other']) teams.push(await db.team.create({ data: { slug: `${run}-${label}`, nombre: `QA30 ${label}` } }));
  [team, other] = teams;
  for (const label of ['admin', 'player', 'outsider']) {
    const user = await db.user.create({ data: { email: `${run}-${label}@qa.invalid`, password: hash, firstName: 'QA', lastName: label } });
    users.push(user);
    await db.teamMembership.create({ data: { userId: user.id, teamId: label === 'outsider' ? other.id : team.id, role: label === 'admin' ? 'TEAM_ADMIN' : 'PLAYER' } });
    if (process.env.QA_SIGNED_SESSION === '1') {
      cookies[label] = `auth_token=${req('jsonwebtoken').sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' })}`;
    } else {
      const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password }) });
      assert.equal(response.status, 200, 'real fixture login');
      cookies[label] = response.headers.get('set-cookie').split(';')[0];
    }
  }
  [admin, player] = users;
  const standard = await create({ nombre: 'QA standard' });
  const progressive = await create({ nombre: 'QA progressive', kind: 'PROGRESSIVE', targetValue: 20 });
  const secretMarker = `SECRET-${run}`;
  const secret = await create({ nombre: secretMarker, descripcion: secretMarker, criterios: [secretMarker], categoria: secretMarker, isSecret: true, kind: 'PROGRESSIVE', targetValue: 20 });
  await check('authorization, tenant isolation and immutable kind', async () => {
    await http('none', 'GET', path(`/logros/${progressive.id}/progreso`), undefined, 401);
    await http('outsider', 'GET', path(`/logros/${progressive.id}/progreso`), undefined, 403);
    await increment(progressive, 1, 'player', player.id, 403);
    await increment(progressive, 1, 'admin', users[2].id, 404);
    await http('player', 'GET', path(`/logros/${progressive.id}/progreso?userId=${admin.id}`), undefined, 403);
    await http('admin', 'PATCH', path(`/logros/${progressive.id}/configuracion`), { kind: 'STANDARD' }, 400);
    await http('player', 'PATCH', path(`/logros/${secret.id}/configuracion`), { isSecret: false }, 403);
    await http('outsider', 'GET', `/equipos/${other.slug}/logros/${secret.id}`, undefined, 404);
  });
  await check('concurrent increments are atomic and do not grant', async () => {
    const initial = await http('player', 'GET', path(`/logros/${progressive.id}/progreso`));
    assert.equal(initial.currentValue, 0);
    await Promise.all(Array.from({ length: 12 }, () => increment(progressive, 1)));
    const progress = await http('player', 'GET', path(`/logros/${progressive.id}/progreso`));
    assert.equal(progress.currentValue, 12);
    assert.equal(progress.status, 'IN_PROGRESS');
    await increment(progressive, 0.5, 'admin', player.id, 400);
    await increment(progressive, 0, 'admin', player.id, 400);
    await http('admin', 'POST', path('/logros'), { nombre: 'Invalid fractional goal', puntos: 10, kind: 'PROGRESSIVE', targetValue: 1.5 }, 400);
    await http('admin', 'POST', path('/admin/asignaciones'), { userId: player.id, logroId: progressive.id }, 409);
    const pending = await http('player', 'POST', path(`/logros/${progressive.id}/solicitudes`), {}, 201);
    await http('admin', 'POST', path(`/admin/solicitudes/${pending.id}/aceptar`), {}, 409);
    assert.equal((await db.solicitudLogro.findUnique({ where: { id: pending.id } })).status, 'PENDING');
    assert.equal(await db.userLogro.count({ where: { logroId: progressive.id } }), 0);
    assert.equal((await increment(progressive, -100)).currentValue, 0);
    assert.equal((await increment(progressive, 100)).currentValue, 20);
    assert.equal((await http('player', 'GET', path(`/logros/${progressive.id}/progreso`))).status, 'ELIGIBLE');
    assert.equal(await db.userLogro.count({ where: { logroId: progressive.id } }), 0);
    await http('admin', 'POST', path('/admin/asignaciones'), { userId: player.id, logroId: progressive.id }, 201);
    assert.equal((await http('player', 'GET', path(`/logros/${progressive.id}/progreso`))).status, 'AWARDED');
    await increment(progressive, -1, 'admin', player.id, 409);
    await increment(progressive, 1, 'admin', player.id, 409);
    assert.equal((await http('player', 'GET', path(`/logros/${progressive.id}/progreso`))).currentValue, 20);
    assert.equal(await http('player', 'GET', path(`/logros/${standard.id}/progreso`)), null);
  });
  await check('grant and correction serialize; concurrent grants stay unique', async () => {
    const max = await create({ nombre: 'QA integer boundary', kind: 'PROGRESSIVE', targetValue: 2147483647 });
    await increment(max, 2147483647);
    assert.equal((await increment(max, 2147483647)).currentValue, 2147483647);
    await increment(max, 2147483648, 'admin', player.id, 400);
    const racing = await create({ nombre: 'QA grant race', kind: 'PROGRESSIVE', targetValue: 10 });
    await increment(racing, 10);
    await Promise.all([
      increment(racing, -1, 'admin', player.id, [200, 409]),
      http('admin', 'POST', path('/admin/asignaciones'), { userId: player.id, logroId: racing.id }, [201, 409]),
    ]);
    const afterRace = await http('player', 'GET', path(`/logros/${racing.id}/progreso`));
    const awards = await db.userLogro.count({ where: { logroId: racing.id, userId: player.id } });
    assert(awards === 1 ? afterRace.currentValue === 10 && afterRace.status === 'AWARDED' : afterRace.currentValue === 9 && afterRace.status === 'IN_PROGRESS', 'grant/correction serialized state');
    const duplicated = await create({ nombre: 'QA duplicate grants', kind: 'PROGRESSIVE', targetValue: 2 });
    await increment(duplicated, 2);
    const start = results.length;
    await Promise.all(Array.from({ length: 2 }, () => http('admin', 'POST', path('/admin/asignaciones'), { userId: player.id, logroId: duplicated.id }, [201, 409])));
    assert.deepEqual(results.slice(start).filter(r => r.method).map(r => r.actual).sort(), [201, 409]);
    assert.equal(await db.userLogro.count({ where: { logroId: duplicated.id, userId: player.id } }), 1);
  });
  await check('hidden achievement redacted across catalog/detail/history/aggregates', async () => {
    const proposal = await db.propuestaLogro.create({ data: { userId: player.id, teamId: team.id, nombre: secretMarker, descripcion: secretMarker, criterios: [secretMarker], status: 'ACCEPTED', logroId: secret.id } });
    await db.solicitudLogro.create({ data: { userId: player.id, logroId: secret.id, status: 'REJECTED' } });
    for (const suffix of ['/logros', `/logros?search=${secretMarker}`, `/logros/${secret.id}`, `/logros/${secret.id}/progreso`, '/dashboard', '/ranking', '/jugadores', '/solicitudes', '/propuestas', `/propuestas/${proposal.id}`]) {
      const result = await http('player', 'GET', path(suffix));
      assert(!JSON.stringify(result).includes(secretMarker), `secret leak: ${suffix}`);
    }
    assert(!JSON.stringify(await http('player', 'GET', '/equipos/mis-equipos')).includes(secretMarker));
    const hidden = await http('player', 'GET', path(`/logros/${secret.id}`));
    assert.deepEqual(hidden, { id: secret.id, isSecret: true, isHidden: true });
    assert.equal((await http('admin', 'GET', path(`/logros/${secret.id}`))).nombre, secretMarker);
    await increment(secret, 20);
    assert.equal((await http('player', 'GET', path(`/logros/${secret.id}`))).isHidden, true);
    await db.teamMembership.create({ data: { userId: users[2].id, teamId: team.id, role: 'PLAYER' } });
    assert.equal((await http('outsider', 'GET', path(`/logros/${secret.id}`))).isHidden, true);
    await http('admin', 'POST', path('/admin/asignaciones'), { userId: player.id, logroId: secret.id }, 201);
    assert.equal((await http('player', 'GET', path(`/logros/${secret.id}`))).nombre, secretMarker);
    assert.equal((await http('outsider', 'GET', path(`/logros/${secret.id}`))).nombre, secretMarker);
    assert(JSON.stringify(await http('player', 'GET', path('/dashboard'))).includes(secretMarker));
    await http('admin', 'PATCH', path(`/logros/${standard.id}/configuracion`), { isSecret: true });
    assert.equal((await http('player', 'GET', path(`/logros/${standard.id}`))).isHidden, true);
    await http('admin', 'POST', path('/admin/asignaciones'), { userId: player.id, logroId: standard.id }, 201);
    assert.equal((await http('outsider', 'GET', path(`/logros/${standard.id}`))).nombre, standard.nombre);
    await http('admin', 'PATCH', path(`/logros/${standard.id}/configuracion`), { isSecret: false });
    assert.equal((await http('player', 'GET', path(`/logros/${standard.id}`))).nombre, standard.nombre);
  });
  await check('season progress isolated; permanent progress retained', async () => {
    const seasonal = await create({ nombre: 'QA seasonal', kind: 'PROGRESSIVE', targetValue: 10, scope: 'SEASONAL', isSecret: true });
    await increment(seasonal, 1, 'admin', player.id, 409);
    const first = await db.season.create({ data: { teamId: team.id, name: 'QA first', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31'), status: 'ACTIVE' } });
    const historical = await create({ nombre: 'QA historical request', kind: 'PROGRESSIVE', targetValue: 5, scope: 'SEASONAL' });
    await increment(historical, 5);
    const historicalRequest = await http('player', 'POST', path(`/logros/${historical.id}/solicitudes`), {}, 201);
    await increment(seasonal, 4);
    assert.equal((await http('outsider', 'GET', path(`/logros/${seasonal.id}`))).isHidden, true);
    await increment(seasonal, 6);
    await http('admin', 'POST', path('/admin/asignaciones'), { userId: player.id, logroId: seasonal.id }, 201);
    const second = await db.season.create({ data: { teamId: team.id, name: 'QA second', startsAt: new Date('2027-01-01'), endsAt: new Date('2027-12-31') } });
    await http('admin', 'POST', path(`/admin/temporadas/${second.id}/activar`), {});
    const accepted = await http('admin', 'POST', path(`/admin/solicitudes/${historicalRequest.id}/aceptar`), {});
    assert.equal(accepted.status, 'ACCEPTED');
    assert.equal(accepted.seasonId, first.id);
    assert.equal(await db.userLogro.count({ where: { logroId: historical.id, userId: player.id, seasonId: first.id } }), 1);
    assert.equal(await db.userLogro.count({ where: { logroId: historical.id, userId: player.id, seasonId: second.id } }), 0);
    assert.equal((await http('player', 'GET', path(`/logros/${historical.id}/progreso`))).currentValue, 0);
    const approved = await create({ nombre: 'QA approval lock', kind: 'PROGRESSIVE', targetValue: 2 });
    await increment(approved, 2);
    const request = await http('player', 'POST', path(`/logros/${approved.id}/solicitudes`), {}, 201);
    await http('admin', 'POST', path(`/admin/solicitudes/${request.id}/aceptar`), {});
    await increment(approved, -1, 'admin', player.id, 409);
    assert.equal((await http('player', 'GET', path(`/logros/${seasonal.id}/progreso`))).currentValue, 0);
    assert.equal((await http('outsider', 'GET', path(`/logros/${seasonal.id}`))).nombre, seasonal.nombre);
    await increment(seasonal, 2);
    assert.equal((await db.achievementProgress.findFirst({ where: { logroId: seasonal.id, userId: player.id, seasonId: first.id } })).currentValue, 10);
    await increment(seasonal, 8);
    await http('admin', 'POST', path('/admin/asignaciones'), { userId: player.id, logroId: seasonal.id }, 201);
    await http('admin', 'POST', path('/admin/asignaciones'), { userId: player.id, logroId: seasonal.id }, 409);
    assert.equal(await db.userLogro.count({ where: { logroId: seasonal.id, userId: player.id } }), 2);
    assert.equal((await http('player', 'GET', path(`/logros/${progressive.id}/progreso`))).currentValue, 20);
  });
  if (process.env.QA_BROWSER === '1') await require('./capture.cjs')({ team, cookies, progressive, secret, create, increment, player });
}
main().catch(error => { results.push({ result: 'FAIL', error: error.message, stack: error.stack }); process.exitCode = 1; }).finally(async () => {
  try { await cleanup(); results.push({ cleanup: 'PASS', teamIds: teams.map(t => t.id), userIds: users.map(u => u.id) }); } catch (error) { results.push({ cleanup: 'FAIL', error: error.message }); process.exitCode = 1; }
  if (existingSnapshot) { const after = await snapshot(); try { assert.deepEqual(after, existingSnapshot); results.push({ check: 'existing fixture unchanged', result: 'PASS', before: existingSnapshot, after }); } catch (error) { results.push({ result: 'FAIL', error: error.message }); process.exitCode = 1; } }
  await db.$disconnect();
  const report = JSON.stringify({ run, base, sessionMode: process.env.QA_SIGNED_SESSION === '1' ? 'signed fixture session' : 'real login', at: new Date().toISOString(), results }, null, 2);
  writeFileSync(resolve('docs/issue-30/qa/http-results.json'), report);
  writeFileSync(resolve(`docs/issue-30/qa/http-results-${run}.json`), report);
  console.log(JSON.stringify({ run, checks: results.filter(r => r.check), failures: results.filter(r => r.result === 'FAIL' || r.cleanup === 'FAIL'), requests: results.filter(r => r.method).length, cleanup: results.at(-1) }, null, 2));
});
