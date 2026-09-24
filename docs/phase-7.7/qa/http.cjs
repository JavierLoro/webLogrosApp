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
const run = `qa77-${Date.now()}`;
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
  for (const label of ['main', 'other']) teams.push(await db.team.create({ data: { slug: `${run}-${label}`, nombre: `QA77 ${label}` } }));
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
  if(process.env.QA_STATES==='1'){await require('./states.cjs')({team,cookies,http,path,player});return;}

  const proposalBody = { nombre: 'QA propuesta', descripcion: 'Descripción verificable', criterios: ['Criterio real'] };
  const accepted = await http('player', 'POST', path('/propuestas'), proposalBody, 201);
  const rejected = await http('player', 'POST', path('/propuestas'), { ...proposalBody, nombre: 'QA rechazada' }, 201);
  await check('proposal authorization and tenant isolation', async () => {
    await http('none', 'GET', path('/propuestas'), undefined, 401);
    await http('outsider', 'GET', path('/propuestas'), undefined, 403);
    await http('player', 'GET', path(`/admin/propuestas/${accepted.id}`), undefined, 403);
    await http('admin', 'GET', path(`/propuestas/${accepted.id}`), undefined, 404);
    await db.teamMembership.create({data:{teamId:other.id,userId:admin.id,role:'TEAM_ADMIN'}});
    await http('admin','GET',`/equipos/${other.slug}/admin/propuestas/${accepted.id}`,undefined,404);
  });
  await check('reject reason and immutable resolution', async () => {
    await http('admin','POST',path(`/admin/propuestas/${rejected.id}/rechazar`),{reason:' '},400);
    await http('admin','POST',path(`/admin/propuestas/${rejected.id}/rechazar`),{reason:'Falta concretar criterio'});
    assert.equal((await http('player','GET',path(`/propuestas/${rejected.id}`))).rejectionReason,'Falta concretar criterio');
    await http('admin','POST',path(`/admin/propuestas/${rejected.id}/aceptar`),{puntos:25},409);
  });
  await check('proposal approval creates catalog only; obtaining is separate', async () => {
    const approved = await http('admin','POST',path(`/admin/propuestas/${accepted.id}/aceptar`),{puntos:25});
    assert(approved.logroId);
    assert.equal(await db.userLogro.count({where:{logroId:approved.logroId}}),0);
    assert.equal(await db.solicitudLogro.count({where:{logroId:approved.logroId}}),0);
    await http('admin','POST',path(`/admin/propuestas/${accepted.id}/aceptar`),{puntos:25},409);
    const request=await http('player','POST',path(`/logros/${approved.logroId}/solicitudes`),{},201);
    const detail=await http('admin','GET',path(`/admin/solicitudes/${request.id}`));
    assert.equal(detail.progress,null); assert.equal(detail.season,null);
    await http('admin','POST',path(`/admin/solicitudes/${request.id}/aceptar`),{});
    assert.equal(await db.userLogro.count({where:{logroId:approved.logroId,userId:player.id}}),1);
  });
  await check('request detail uses original season progress and award', async () => {
    const old=await db.season.create({data:{teamId:team.id,name:'Original',startsAt:new Date('2025-01-01'),endsAt:new Date('2025-12-31'),status:'CLOSED'}});
    const active=await db.season.create({data:{teamId:team.id,name:'Actual',startsAt:new Date('2026-01-01'),endsAt:new Date('2026-12-31'),status:'ACTIVE'}});
    const logro=await create({nombre:'QA temporal',scope:'SEASONAL',kind:'PROGRESSIVE',targetValue:10});
    await db.achievementProgress.createMany({data:[{userId:player.id,logroId:logro.id,seasonId:old.id,currentValue:7},{userId:player.id,logroId:logro.id,seasonId:active.id,currentValue:2}]});
    const request=await db.solicitudLogro.create({data:{userId:player.id,logroId:logro.id,seasonId:old.id}});
    let detail=await http('admin','GET',path(`/admin/solicitudes/${request.id}`));
    assert.deepEqual(detail.progress,{currentValue:7,targetValue:10,seasonId:old.id,status:'IN_PROGRESS'});
    assert.deepEqual(detail.season,{id:old.id,name:'Original',status:'CLOSED'});
    await db.userLogro.create({data:{userId:player.id,logroId:logro.id,seasonId:active.id}});
    detail=await http('admin','GET',path(`/admin/solicitudes/${request.id}`)); assert.equal(detail.progress.status,'IN_PROGRESS');
    await db.userLogro.create({data:{userId:player.id,logroId:logro.id,seasonId:old.id}});
    detail=await http('admin','GET',path(`/admin/solicitudes/${request.id}`)); assert.equal(detail.progress.status,'AWARDED');
    await http('none','GET',path(`/admin/solicitudes/${request.id}`),undefined,401);
    await http('player','GET',path(`/admin/solicitudes/${request.id}`),undefined,403);
    await http('admin','GET',`/equipos/${other.slug}/admin/solicitudes/${request.id}`,undefined,404);
    await http('admin','GET',path('/admin/solicitudes/2147483647'),undefined,404);
  });
  if(process.env.QA_BROWSER==='1') await require('./capture.cjs')({team,cookies,player,admin,http,path,db,proposalBody});
}

main().catch(error => { results.push({ result: 'FAIL', error: error.message, stack: error.stack }); process.exitCode = 1; }).finally(async () => {
  try { await cleanup(); results.push({ cleanup: 'PASS', teamIds: teams.map(t => t.id), userIds: users.map(u => u.id) }); } catch (error) { results.push({ cleanup: 'FAIL', error: error.message }); process.exitCode = 1; }
  if (existingSnapshot) { const after = await snapshot(); try { assert.deepEqual(after, existingSnapshot); results.push({ check: 'existing fixture unchanged', result: 'PASS', before: existingSnapshot, after }); } catch (error) { results.push({ result: 'FAIL', error: error.message }); process.exitCode = 1; } }
  await db.$disconnect();
  const report = JSON.stringify({ run, base, sessionMode: process.env.QA_SIGNED_SESSION === '1' ? 'signed fixture session' : 'real login', at: new Date().toISOString(), results }, null, 2);
  writeFileSync(resolve('docs/phase-7.7/qa/http-results.json'), report);
  writeFileSync(resolve(`docs/phase-7.7/qa/http-results-${run}.json`), report);
  console.log(JSON.stringify({ run, checks: results.filter(r => r.check), failures: results.filter(r => r.result === 'FAIL' || r.cleanup === 'FAIL'), requests: results.filter(r => r.method).length, cleanup: results.at(-1) }, null, 2));
});
