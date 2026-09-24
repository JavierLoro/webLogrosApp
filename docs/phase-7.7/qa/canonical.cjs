const { chromium } = require('C:/Users/javie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { mkdirSync, writeFileSync, readFileSync, existsSync } = require('node:fs');
const assert = require('node:assert/strict');
const req = require('node:module').createRequire(require('node:path').resolve('apps/backend/package.json'));
const db = new (req('@prisma/client').PrismaClient)({adapter:new (req('@prisma/adapter-pg').PrismaPg)({connectionString:process.env.DATABASE_URL})});
const dir = 'docs/phase-7.7/qa';
const results = [];
async function main() {
  mkdirSync(`${dir}/screenshots`, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const role of (process.env.QA_ROLE ? [process.env.QA_ROLE] : ['player', 'admin'])) {
      const email = role === 'player' ? 'ana@halcones.test' : 'diego@halcones.test';
      let cookie;
      if(process.env.QA_SIGNED_SESSION==='1') {
        const user=await db.user.findUniqueOrThrow({where:{email}});
        cookie='auth_token='+req('jsonwebtoken').sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:'15m'});
      } else {
        const response=await fetch('http://localhost:3001/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:process.env.SEED_USER_PASSWORD})});
        assert.equal(response.status,200); cookie=response.headers.get('set-cookie').split(';')[0];
      }
      const read = async path => { const r = await fetch(`http://localhost:3001/equipos/halcones${path}`, { headers: { Cookie: cookie } }); assert.equal(r.status, 200); return r.json(); };
      const proposals = await read(role === 'admin' ? '/admin/propuestas?status=all' : '/propuestas');
      const requests = await read(role === 'admin' ? '/admin/solicitudes?status=all' : '/solicitudes');
      const routes = role === 'admin' ? ['admin', 'admin/invitaciones', 'admin/jugadores', 'admin/logros', 'admin/solicitudes', 'admin/propuestas', ...requests.slice(0, 1).map(x => `admin/solicitudes/${x.id}`), ...proposals.slice(0, 1).map(x => `admin/propuestas/${x.id}`)] : ['solicitudes', ...proposals.map(x => `solicitudes?tipo=propuesta&detalle=${x.id}`), ...requests.slice(0, 1).map(x => `solicitudes?tipo=solicitud&detalle=${x.id}`)];
      for (const viewport of [{ width: 1440, height: 1024 }, { width: 390, height: 844 }]) {
        const context = await browser.newContext({ viewport, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
        const sep = cookie.indexOf('=');
        await context.addCookies([{ name: cookie.slice(0, sep), value: cookie.slice(sep + 1), domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
        const page = await context.newPage();
        await page.clock.setFixedTime(new Date('2026-09-20T12:00:00Z'));
        for (const route of routes.filter(r=>!process.env.QA_ROUTES||process.env.QA_ROUTES.split(',').includes(r))) {
          const errors = [], httpErrors = [];
          const onError = e => errors.push(e.message);
          const onResponse = r => { if (r.status() >= 400) httpErrors.push({ url: r.url(), status: r.status() }); };
          page.on('pageerror', onError); page.on('response', onResponse);
          await page.goto(`http://localhost:3000/equipos/halcones/${route}`, { waitUntil: 'networkidle' });
          await page.getByRole('heading', {level:1}).waitFor();
          await page.evaluate(() => document.fonts.ready);
          const path = `${dir}/screenshots/${role}-${route.replace(/[^a-z0-9-]/gi, '-')}-${viewport.width}.png`;
          await page.screenshot({ path, fullPage: true });
          const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, heading: document.querySelector('h1')?.textContent, overflowElements:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})).slice(0,30), text: document.querySelector('main')?.innerText.slice(0, 1200) }));
          results.push({ role, identity: email, fixture: 'halcones-visual', route, viewport, path, errors, httpErrors, ...geometry });
          page.off('pageerror', onError); page.off('response', onResponse);
        }
        await context.close();
      }
    }
  } finally { await browser.close(); await db.$disconnect(); }
}
main().catch(e => { results.push({ failure: e.message }); process.exitCode = 1; }).finally(() => { const out=`${dir}/canonical-results-${process.env.QA_ROLE || "all"}.json`; const previous=process.env.QA_ROUTES&&existsSync(out)?JSON.parse(readFileSync(out,"utf8")).filter(x=>!results.some(r=>r.route===x.route&&r.width===x.width)):[]; writeFileSync(out, JSON.stringify([...previous,...results], null, 2)); console.log(JSON.stringify(results.map(({ text, ...r }) => r), null, 2)); });
