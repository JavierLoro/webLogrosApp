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
const run = `qa79-${Date.now()}`;
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
  for (const label of ['main', 'other']) teams.push(await db.team.create({ data: { slug: `${run}-${label}`, nombre: `QA79 ${label}` } }));
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


  const data={name:'Temporada A',startsAt:'2025-01-01T00:00:00.000Z',endsAt:'2025-12-31T00:00:00.000Z'};
  if(process.env.QA_EXTRA==='1'){await require('./extra.cjs')({team,cookies,http,path,db,data});return;}
  if(process.env.QA_BROWSER_ONLY==='1'){await require('./browser.cjs')({team,other,admin,player,cookies,http,path,db,data});return;}
  await check('auth and tenant isolation',async()=>{
    await http('none','GET',path('/temporadas'),undefined,401);
    await http('outsider','GET',path('/temporadas'),undefined,403);
    await http('player','POST',path('/admin/temporadas'),data,403);
  });
  await check('strict names and real ISO date validation',async()=>{
    for(const patch of [{name:' '},{name:'A'.repeat(121)},{startsAt:null},{startsAt:1},{startsAt:true},{startsAt:'2025-02-30T00:00:00Z'},{startsAt:'2025-01-01'},{endsAt:data.startsAt},{endsAt:'2024-01-01T00:00:00Z'},{status:'ACTIVE'},{teamId:other.id}])await http('admin','POST',path('/admin/temporadas'),{...data,...patch},400);
  });
  const a=await http('admin','POST',path('/admin/temporadas'),data,201);
  const b=await http('admin','POST',path('/admin/temporadas'),{...data,name:'Temporada B',startsAt:'2026-01-01T01:00:00+01:00',endsAt:'2026-12-31T00:00:00Z'},201);
  await http('admin','POST',path('/admin/temporadas'),data,409);
  assert.equal(a.status,'PLANNED');
  const foreign=await db.season.create({data:{teamId:other.id,name:'Ajena',startsAt:new Date(data.startsAt),endsAt:new Date(data.endsAt)}});
  await check('foreign season IDs and role actions',async()=>{
    for(const suffix of ['activar','cerrar']){await http('player','POST',path(`/admin/temporadas/${a.id}/${suffix}`),{},403);await http('admin','POST',path(`/admin/temporadas/${foreign.id}/${suffix}`),{},404);}
    await http('player','GET',path(`/temporadas/${foreign.id}/ranking`),undefined,404);
    await http('admin','POST',path(`/admin/temporadas/${a.id}/cerrar`),{},409);
  });
  await check('activate closes previous; closed cannot reopen; close idempotence conflict',async()=>{
    await http('admin','POST',path(`/admin/temporadas/${a.id}/activar`),{});
    await http('admin','POST',path(`/admin/temporadas/${a.id}/activar`),{});
    await http('admin','POST',path(`/admin/temporadas/${b.id}/activar`),{});
    assert.equal((await db.season.findUnique({where:{id:a.id}})).status,'CLOSED');
    await http('admin','POST',path(`/admin/temporadas/${a.id}/activar`),{},409);
    await http('admin','POST',path(`/admin/temporadas/${b.id}/cerrar`),{});
    await http('admin','POST',path(`/admin/temporadas/${b.id}/cerrar`),{},409);
  });
  const permanent=await create({nombre:'Permanente',puntos:10});
  const seasonal=await create({nombre:'Estacional',puntos:20,scope:'SEASONAL'});
  await db.userLogro.createMany({data:[{userId:player.id,logroId:permanent.id},{userId:player.id,logroId:seasonal.id,seasonId:a.id},{userId:admin.id,logroId:seasonal.id,seasonId:b.id}]});
  await check('rankings isolate A B and retain permanent points; no active is permanent only',async()=>{
    const ra=await http('player','GET',path(`/temporadas/${a.id}/ranking`));assert.equal(ra.players.find(p=>p.id===player.id).puntos,30);assert.equal(ra.players.find(p=>p.id===admin.id).puntos,0);
    const rb=await http('player','GET',path(`/temporadas/${b.id}/ranking`));assert.equal(rb.players.find(p=>p.id===player.id).puntos,10);assert.equal(rb.players.find(p=>p.id===admin.id).puntos,20);
    const current=await http('player','GET',path('/ranking'));assert.equal(current.season,null);assert.equal(current.totals.points,10);
    await http('player','POST',path(`/logros/${seasonal.id}/solicitudes`),{},409);
  });
  await check('concurrent create translates unique constraint to409',async()=>{
    const responses=await Promise.all([1,2].map(()=>fetch('http://localhost:3001'+path('/admin/temporadas'),{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookies.admin},body:JSON.stringify({...data,name:'Concurrent same name'})})));
    const statuses=responses.map(r=>r.status).sort();assert.deepEqual(statuses,[201,409]);results.push({concurrentCreate:statuses});
  });
  await check('concurrent activation serialized; exactly one active; no500',async()=>{
    const c=await http('admin','POST',path('/admin/temporadas'),{...data,name:'Concurrent C'},201),d=await http('admin','POST',path('/admin/temporadas'),{...data,name:'Concurrent D'},201);
    const values=await Promise.all([c,d].map(s=>http('admin','POST',path(`/admin/temporadas/${s.id}/activar`),{})));
    assert(values.every(x=>x.status==='ACTIVE'));assert.equal(await db.season.count({where:{teamId:team.id,status:'ACTIVE'}}),1);assert.equal(await db.season.count({where:{teamId:team.id,id:{in:[c.id,d.id]},status:'CLOSED'}}),1);
  });
}

main().catch(error => { results.push({ result: 'FAIL', error: error.message, stack: error.stack }); process.exitCode = 1; }).finally(async () => {
  try { await cleanup(); results.push({ cleanup: 'PASS', teamIds: teams.map(t => t.id), userIds: users.map(u => u.id) }); } catch (error) { results.push({ cleanup: 'FAIL', error: error.message }); process.exitCode = 1; }
  if (existingSnapshot) { const after = await snapshot(); try { assert.deepEqual(after, existingSnapshot); results.push({ check: 'existing fixture unchanged', result: 'PASS', before: existingSnapshot, after }); } catch (error) { results.push({ result: 'FAIL', error: error.message }); process.exitCode = 1; } }
  await db.$disconnect();
  const report = JSON.stringify({ run, base, sessionMode: process.env.QA_SIGNED_SESSION === '1' ? 'signed fixture session' : 'real login', at: new Date().toISOString(), results }, null, 2);
  writeFileSync(resolve('docs/phase-7.9/qa/http-results.json'), report);
  writeFileSync(resolve(`docs/phase-7.9/qa/http-results-${run}.json`), report);
  console.log(JSON.stringify({ run, checks: results.filter(r => r.check), failures: results.filter(r => r.result === 'FAIL' || r.cleanup === 'FAIL'), requests: results.filter(r => r.method).length, cleanup: results.at(-1) }, null, 2));
});
