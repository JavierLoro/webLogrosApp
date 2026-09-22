const { resolve } = require('node:path');
const { writeFileSync, mkdirSync } = require('node:fs');
const { chromium } = require('C:/Users/javie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');

module.exports = async function capture({ team, cookies, progressive, create, increment, player }) {
  const dir = resolve('docs/issue-30/qa/screenshots');
  mkdirSync(dir, { recursive: true });
  const hidden = await create({ nombre: 'QA browser hidden', kind: 'PROGRESSIVE', targetValue: 10, isSecret: true });
  const partial = await create({ nombre: 'QA browser partial', kind: 'PROGRESSIVE', targetValue: 10 });
  await increment(partial, 4);
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const evidence = [];
  try {
    const flowContext = await browser.newContext({ viewport: { width: 1440, height: 1024 }, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
    const cookie = cookies.admin.split('=');
    await flowContext.addCookies([{ name: cookie.shift(), value: cookie.join('='), domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    const flow = await flowContext.newPage();
    const prefix = `/equipos/${team.slug}`;
    const createdName = 'QA Browser Secret Progress';
    let createPosts = 0;
    flow.on('request', request => { if (request.method() === 'POST' && request.url().endsWith(`${prefix}/logros`)) createPosts++; });
    await flow.goto(`http://localhost:3000${prefix}/logros/nuevo`, { waitUntil: 'networkidle' });
    await flow.getByLabel('Nombre del logro').fill(createdName);
    await flow.getByLabel('Puntos', { exact: false }).fill('25');
    await flow.getByLabel('Tipo de logro').selectOption('PROGRESSIVE');
    await flow.getByLabel('Objetivo', { exact: true }).fill('1.5');
    await flow.getByLabel('Logro secreto', { exact: false }).check();
    await flow.getByRole('button', { name: 'Crear logro', exact: true }).click();
    assert.equal(createPosts, 0, 'fractional target blocked before HTTP');
    assert.equal(await flow.getByLabel('Objetivo', { exact: true }).getAttribute('aria-invalid'), 'true');
    await flow.getByLabel('Objetivo', { exact: true }).fill('3');
    const createdResponse = flow.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`${prefix}/logros`));
    await flow.getByRole('button', { name: 'Crear logro', exact: true }).evaluate(button => { button.click(); button.click(); });
    const createdHttp = await createdResponse;
    assert.equal(createdHttp.status(), 201);
    const created = await createdHttp.json();
    await flow.waitForLoadState('networkidle');
    assert.equal(createPosts, 1, 'double submit creates once');
    await flow.goto(`http://localhost:3000${prefix}/logros/${created.id}`, { waitUntil: 'networkidle' });
    const memberProgress = flow.waitForResponse(r => r.url().includes(`/logros/${created.id}/progreso?`));
    await flow.getByLabel('Miembro', { exact: false }).selectOption(String(player.id));
    await memberProgress;
    const awardButton = flow.getByRole('button', { name: 'Conceder logro manualmente' });
    assert(await awardButton.isDisabled(), 'premature award disabled');
    const deltaInput = flow.getByLabel('Ajuste del contador');
    await deltaInput.fill('0.5');
    assert(await flow.getByRole('button', { name: 'Guardar progreso' }).isDisabled(), 'fractional delta disabled');
    await deltaInput.fill('-10');
    assert(await flow.getByRole('button', { name: 'Guardar progreso' }).isEnabled(), 'negative clamp accepted');
    await flow.getByRole('button', { name: 'Guardar progreso' }).click();
    await flow.getByText('Progreso actualizado. La concesión sigue siendo manual.').waitFor();
    await deltaInput.fill('10');
    await flow.getByRole('button', { name: 'Guardar progreso' }).click();
    await flow.getByText('Progreso actualizado. La concesión sigue siendo manual.').waitFor();
    await awardButton.waitFor({ state: 'visible' });
    await flow.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Conceder logro manualmente' && !b.disabled));
    await awardButton.click();
    await flow.getByText('Logro concedido.', { exact: true }).waitFor();
    await flow.getByText('Logro concedido: el contador está cerrado y no admite cambios.').waitFor();
    assert(await deltaInput.isDisabled(), 'awarded counter closed');
    assert(await awardButton.isDisabled(), 'repeat award disabled');
    await flow.getByRole('button', { name: 'Hacer visible', exact: true }).click();
    await flow.getByRole('button', { name: 'Marcar como secreto', exact: true }).waitFor();
    await flow.getByRole('button', { name: 'Marcar como secreto', exact: true }).click();
    await flow.getByText('Secreto ya revelado a todo el equipo.').waitFor();
    await flow.screenshot({ path: resolve(dir, 'admin-browser-flow-awarded.png'), fullPage: true });
    const memberContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
    const memberCookie = cookies.player.split('=');
    await memberContext.addCookies([{ name: memberCookie.shift(), value: memberCookie.join('='), domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    const memberPage = await memberContext.newPage();
    await memberPage.goto(`http://localhost:3000${prefix}/logros/${created.id}`, { waitUntil: 'networkidle' });
    await memberPage.getByRole('heading', { name: createdName, exact: true }).waitFor();
    await memberPage.screenshot({ path: resolve(dir, 'player-browser-flow-revealed.png'), fullPage: true });
    evidence.push({ check: 'real browser create/integer validation/double submit/progress/grant/freeze/visibility/member reveal', result: 'PASS', route: `${prefix}/logros/${created.id}`, fixture: { teamId: team.id, playerId: player.id, logroId: created.id }, createPosts });
    await memberContext.close();
    await flowContext.close();
    for (const role of ['player', 'admin']) {
      for (const viewport of [{ width: 1440, height: 1024 }, { width: 390, height: 844 }]) {
        const context = await browser.newContext({ viewport, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
        const [name, ...value] = cookies[role].split('=');
        await context.addCookies([{ name, value: value.join('='), domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
        const page = await context.newPage();
        let errors = [];
        page.on('pageerror', error => errors.push({ type: 'pageerror', message: error.message }));
        page.on('console', msg => { if (msg.type() === 'error') errors.push({ type: 'console', message: msg.text() }); });
        page.on('response', response => { if (response.status() >= 400) errors.push({ type: 'http', status: response.status(), url: response.url() }); });
        const routes = [
          ['catalog', '/logros'], ['partial', `/logros/${partial.id}`],
          ['awarded', `/logros/${progressive.id}`], ['hidden', `/logros/${hidden.id}`],
          ['dashboard', ''], ...(role === 'admin' ? [['create', '/logros/nuevo'], ['admin', '/admin']] : []),
        ];
        for (const [label, suffix] of routes) {
          errors = [];
          const route = `/equipos/${team.slug}${suffix}`;
          await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
          const expectedHeading = { catalog: 'Logros del equipo', partial: 'QA browser partial', awarded: 'QA progressive', hidden: role === 'admin' ? 'QA browser hidden' : 'Logro secreto', dashboard: 'Dashboard de QA30 main', create: 'Crear logro', admin: 'Administración del equipo' }[label];
          await page.getByRole('heading', { name: expectedHeading, exact: true }).waitFor({ state: 'visible' });
          if (label === 'catalog') await page.getByText('QA integer boundary', { exact: true }).waitFor({ state: 'visible' });
          if (label === 'partial') await page.getByRole('progressbar').first().waitFor({ state: 'visible' });
          await page.evaluate(() => document.fonts.ready);
          const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, heading: document.querySelector('h1')?.textContent }));
          const progressGeometry = await page.locator('progress').evaluateAll(bars => bars.map(bar => {
            const box = bar.parentElement;
            const bounds = box.getBoundingClientRect();
            return { text: box.textContent, clientWidth: box.clientWidth, scrollWidth: box.scrollWidth, overflowingNumbers: [...box.querySelectorAll('span')].filter(span => { const rect = span.getBoundingClientRect(); return rect.right > bounds.right + 1 || rect.left < bounds.left - 1; }).map(span => span.textContent) };
          }));
          assert(progressGeometry.every(item => item.scrollWidth <= item.clientWidth + 1 && item.overflowingNumbers.length === 0), `progress internal overflow: ${route}`);
          const artifact = resolve(dir, `${role}-${viewport.width}-${label}.png`);
          await page.screenshot({ path: artifact, fullPage: true });
          evidence.push({ route, role, viewport, fixture: { teamId: team.id, slug: team.slug, partialId: partial.id, hiddenId: hidden.id }, expectedHeading, geometry, progressGeometry, overflow: geometry.scrollWidth > geometry.width, errors: [...errors], artifact });
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    writeFileSync(resolve('docs/issue-30/qa/browser-results.json'), JSON.stringify(evidence, null, 2));
  }
};
