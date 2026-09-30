const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '../../mobile-check/node_modules/playwright');

// Uses actual game input, combat and the real VFX pool. The particle wrapper only
// observes route-module calls; it always invokes the original renderer method.
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  const output = process.env.OUTPUT_DIR;
  if (output) fs.mkdirSync(output, { recursive: true });
  try {
    for (const [width, height] of [[1440, 900], [844, 390], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1000 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && /shader|WebGL/i.test(message.text())) errors.push(message.text());
      });
      await page.addInitScript(() => {
        const raf = requestAnimationFrame;
        window.requestAnimationFrame = callback => {
          window.nextFrame = callback;
          return raf(time => { if (!window.freezeGame) callback(time); });
        };
      });
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8897/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => window.game3d && !document.querySelector('#start').disabled, null, { polling: 200, timeout: 90000 });
      await page.locator('[data-attack-mode=manual]').click();
      await page.locator('#start').click();
      await page.evaluate(() => { window.freezeGame = true; });
      await page.waitForTimeout(80);

      const routes = await page.evaluate(async capture => {
        const g = game3d;
        const version = new URL(document.querySelector('script[src*="main.js"]').src).search;
        const rules = await import('./rules.js' + version);
        const { WEAPON_ROUTE_LOOKS } = await import('./weapon-route-vfx.js' + version);
        const check = (value, message) => { if (!value) throw Error(message); };
        check(Object.keys(rules.HERO_LOADOUTS).length === 5 && Object.keys(rules.WEAPONS).length === 11, 'expected five heroes and eleven weapons');
        check(Object.keys(rules.WEAPON_PATHS).length === 22, 'expected all 22 current weapon routes');
        check(JSON.stringify(Object.keys(WEAPON_ROUTE_LOOKS).sort()) === JSON.stringify(Object.keys(rules.WEAPON_PATHS).sort()), 'route visual catalog differs from gameplay catalog');
        let record, fixtures = [];
        const particle = g.vfx.particle.bind(g.vfx);
        g.vfx.particle = (...args) => {
          const fromRoute = /weapon-route-vfx\.js/.test(new Error().stack || '');
          const mesh = particle(...args);
          if (record && fromRoute) {
            record.routeRequests++;
            if (mesh) record.routeRendered++;
          }
          return mesh;
        };
        const projectile = g.vfx.projectile.bind(g.vfx);
        g.vfx.projectile = weapon => {
          if (record) record.projectiles.push({ id: weapon.id, pathId: weapon.pathId, pathRank: weapon.pathRank });
          return projectile(weapon);
        };
        const riftCast = g.vfx.riftCast.bind(g.vfx);
        g.vfx.riftCast = (...args) => {
          if (record && args[4]) record.riftBursts.push(g.time);
          return riftCast(...args);
        };
        const boltImpact = g.vfx.boltImpact.bind(g.vfx);
        g.vfx.boltImpact = (...args) => {
          if (record && args[2]) record.crossbowThirds++;
          return boltImpact(...args);
        };
        function setup(route) {
          const weapon = rules.WEAPON_PATHS[route].weapon;
          const hero = Object.keys(rules.HERO_LOADOUTS).find(id => rules.HERO_LOADOUTS[id].includes(weapon));
          check(hero, 'unknown hero for ' + weapon);
          record = null;
          g.select(hero, 'forest', rules.HERO_LOADOUTS[hero].indexOf(weapon));
          g.start();
          g.world.obstacles = []; g.world.patches = []; g.world.ponds = [];
          g.world.sites = []; g.world.roaming = []; g.world.discoveries = [];
          g.player.x = g.player.z = 0;
          g.player.inv = 999; g.player.attack = 999;
          g.player.weaponPath = { id: route, rank: 3 };
          g.hero.position.set(0, 0, 0); g.hero.rotation.y = g.player.angle = 0;
          g.controls.hasAim = true; g.controls.angle = 0; g.controls.held = false;
          g.camera.position.set(10, 18, 14); g.camera.lookAt(0, 0, 2); g.camera.updateMatrixWorld(true);
          fixtures = [];
          if (g.companion) { g.companion.x = .8; g.companion.z = .8; g.companion.cool = 999; }
          record = { route, hero, weapon, routeRequests: 0, routeRendered: 0, projectiles: [], riftBursts: [], crossbowThirds: 0, petHits: 0, markedPetHits: 0, returning: false, returnHit: false, maxActive: 0, peakBurst: 0, screenshot: null };
          if (g.companion) {
            const onHit = g.companion.api.onHit;
            g.companion.api.onHit = enemy => {
              record.petHits++;
              if (enemy.lingyaMark > g.companion.now) record.markedPetHits++;
              return onHit(enemy);
            };
          }
          const stats = rules.weaponStats(g.player);
          check(stats.id === weapon && stats.pathId === route && stats.pathRank === 3, route + ': missing route snapshot on weapon stats');
          return record;
        }
        function foe(x = 0, z = 3.3) {
          const enemy = g.spawn('golem', x, z);
          check(enemy, 'fixture spawn failed');
          enemy.hp = enemy.maxHp = 100000; enemy.speed = 0; enemy.cool = 999;
          fixtures.push(enemy);
          return enemy;
        }
        function step(frames) {
          for (let frame = 0; frame < frames; frame++) {
            for (const enemy of g.enemies) if (!fixtures.includes(enemy)) { enemy.alive = false; enemy.mesh.visible = false; }
            const before = record.routeRendered;
            g.step(1 / 60);
            check(g.state === 'playing', record.route + ': unexpected state ' + g.state);
            g.vfx.update(1 / 60);
            check(g.vfx.active.length <= g.vfx.limit, record.route + ': particle pool overflow');
            record.maxActive = Math.max(record.maxActive, g.vfx.active.length);
            for (const item of g.vfx.active) {
              check([...item.mesh.position.toArray(), ...item.mesh.scale.toArray(), ...item.mesh.quaternion.toArray(), item.life, item.mesh.material.opacity].every(Number.isFinite), record.route + ': non-finite rendered particle');
              check(item.mesh.geometry, record.route + ': missing particle geometry');
            }
            for (const bullet of g.bullets) {
              check(bullet.id === record.weapon && bullet.pathId === record.route && bullet.pathRank === 3, record.route + ': projectile lost route snapshot');
              if (bullet.returning) {
                record.returning = true;
                if (fixtures.some(enemy => bullet.hits.has(enemy.id))) record.returnHit = true;
              }
            }
            const burst = record.routeRendered - before;
            if (capture && burst > record.peakBurst) {
              record.peakBurst = burst;
              g.renderer.render(g.vfx.scene, g.camera);
              record.screenshot = g.renderer.domElement.toDataURL('image/png');
            }
          }
        }
        function shoot() {
          g.player.attack = 0; g.controls.held = true;
          const serial = g.hero.userData.shotSerial || 0;
          step(1); g.controls.held = false;
          check(g.hero.userData.shotSerial === serial + 1, record.route + ': actual attack did not start');
        }
        window.routeHarness = { g, rules, check, setup, foe, step, shoot, get record() { return record; } };
        return Object.keys(rules.WEAPON_PATHS);
      }, !!output);

      const results = [];
      for (const route of routes) {
        const result = await page.evaluate(route => {
          const h = routeHarness, { g, check, setup, foe, step, shoot } = h;
          const r = setup(route);
          const target = foe(0, route === 'boomerang_snare' ? 1.1 : r.weapon === 'harpoon' ? 2.6 : 3.6);
          let bounced;
          if (route === 'shade_echo') bounced = foe(1.6, 4.5);
          if (route === 'harpoon_tow') g.player.harpoonCount = 2;
          if (route === 'boomerang_pincer') g.companion.cool = 0;
          const shots = route === 'boomerang_snare' || route === 'crossbow_hunt' || route === 'shade_blight' ? 3 : 1;
          for (let shot = 0; shot < shots; shot++) { shoot(); step(r.weapon === 'boomerang' ? 85 : 65); }
          check(target.hp < target.maxHp, route + ': real attack dealt no damage');
          check(r.routeRequests > 0 && r.routeRendered > 0, route + ': real combat emitted no route particles');
          if (!['harpoon', 'grimoire'].includes(r.weapon)) {
            check(r.projectiles.length > 0, route + ': no real projectile creation');
            check(r.projectiles.every(w => w.id === r.weapon && w.pathId === route && w.pathRank === 3), route + ': projectile factory received wrong route');
          }
          if (route === 'shuriken_return' || route === 'shadowblade_return') {
            check(r.returning && r.returnHit, route + ': no actual return-leg contact');
            check(g.bullets.length === 0, route + ': return failed to finish');
          }
          if (route === 'boomerang_pincer') check(r.petHits > 0 && r.markedPetHits > 0, 'pincer did not hit a bone-marked target');
          if (route === 'boomerang_snare') {
            check(g.companion.throwCount === 3, 'snare did not follow three actual throws');
            check(g.companion.traps.length === 0 && target.slow > 0, 'third-throw trap did not snap on actual enemy');
          }
          if (route === 'crossbow_hunt') check(r.crossbowThirds === 1, 'crossbow third-hit confirmation missing or repeated');
          if (route === 'shade_blight') check(target.shadowMark?.hits === 0, 'shadow mark never completed the third hit');
          if (route === 'shade_echo') check(bounced.hp < bounced.maxHp, 'bounce never reached its next target');
          if (route === 'fire_burn') check(target.burnTime > 0, 'burn route never applied burning');
          if (route === 'harpoon_tow') check(target.slow > 0, 'third harpoon hit did not apply tow slow');
          if (r.weapon === 'grimoire') {
            check(r.riftBursts.length === (route === 'grimoire_echo' ? 2 : 1), route + ': wrong number of actual rift explosions');
            if (route === 'grimoire_echo') check(r.riftBursts[1] - r.riftBursts[0] >= .3, 'echo occurred before its second damage event');
          }
          g.renderer.render(g.vfx.scene, g.camera);
          return { ...r, damage: Number((target.maxHp - target.hp).toFixed(2)) };
        }, route);
        if (output && result.screenshot) fs.writeFileSync(path.join(output, `${route}-${width}.png`), Buffer.from(result.screenshot.split(',')[1], 'base64'));
        delete result.screenshot;
        results.push(result);
      }

      const lifecycle = await page.evaluate(() => {
        const { g, check, setup, foe, step, shoot } = routeHarness;
        const cancelled = setup('boomerang_snare');
        foe(); g.companion.throwCount = 2;
        shoot(); check(g.bullets[0]?.releaseDelay > 0, 'cancellation fixture already released');
        g.dash(); step(12);
        check(g.companion.throwCount === 2 && g.companion.traps.length === 0, 'cancelled bone spawned a third-throw trap');
        check(cancelled.routeRendered === 0 && g.bullets.length === 0, 'cancelled bone emitted route effect or stayed airborne');

        const stress = setup('shotgun_fan');
        for (const x of [-2, -1, 0, 1, 2]) for (const z of [2.4, 3.7, 5]) foe(x, z);
        const normalLimit = g.vfx.limit;
        g.vfx.limit = 24;
        g.player.upgrades.haste = 4; g.player.attack = 0; g.controls.held = true;
        step(240); g.controls.held = false;
        check(stress.maxActive === 24, 'actual battle did not exercise saturated particle pool');
        check(g.vfx.active.length + g.vfx.pool.length <= normalLimit, 'VFX meshes grew beyond normal pool capacity');
        g.vfx.limit = normalLimit;

        setup('dark_gravity'); foe(); shoot(); step(16);
        check(g.fields.length > 0 && g.vfx.active.length > 0, 'pause fixture has no live field or particles');
        g.pause();
        const frozen = JSON.stringify({ time: g.time, fields: g.fields.map(f => [f.life, f.pulse]), particles: g.vfx.active.map(p => [p.life, ...p.mesh.position.toArray()]) });
        g.step(2);
        nextFrame(performance.now() + 50); nextFrame(performance.now() + 100);
        check(JSON.stringify({ time: g.time, fields: g.fields.map(f => [f.life, f.pulse]), particles: g.vfx.active.map(p => [p.life, ...p.mesh.position.toArray()]) }) === frozen, 'pause advanced a real field or visual particle');
        g.resume(); step(1);
        check(g.state === 'playing', 'resume failed');
        g.start();
        check(g.vfx.active.length === 0 && g.bullets.length === 0 && g.fields.length === 0 && g.riftStrikes.length === 0, 'restart retained prior combat visuals');
        check(!g.player.weaponPath, 'restart retained route state');
        return { cancelledRelease: true, saturatedPool: stress.maxActive, normalLimit, paused: true, reset: true };
      });
      await page.evaluate(() => {
        routeHarness.setup('grimoire_echo');
        let now = performance.now();
        for (let i = 0; i < 6; i++) nextFrame(now += 35);
      });
      await page.locator('[data-path-detail]').click();
      assert.equal(await page.evaluate(() => game3d.state), 'paused', 'route details should pause combat');
      assert.match(await page.locator('#dialog').innerText(), /复诵禁咒/);
      assert.match(await page.locator('#dialog').innerText(), /招式表现：.*二次爆发/);
      const bounds = await page.locator('#dialog').boundingBox();
      assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1, 'route detail dialog leaves viewport');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#dialog').scrollWidth <= document.querySelector('#dialog').clientWidth + 1), 'route details overflow horizontally');
      if (output) await page.screenshot({ path: path.join(output, `weapon-route-details-${width}.png`) });
      await page.locator('#dialog button').filter({ hasText: '继续远征' }).click();
      assert.equal(await page.evaluate(() => game3d.state), 'playing');
      assert.deepEqual(errors, [], 'browser or shader errors');
      assert.equal(results.length, 22);
      if (output) fs.writeFileSync(path.join(output, `weapon-route-vfx-${width}.json`), JSON.stringify({ viewport: { width, height }, results, lifecycle }, null, 2));
      console.log(`PASS ${width}x${height}: 22 real routes, contacts/returns, marked pet, trap, rift echo, cancel, pool, pause/reset, details UI ${JSON.stringify(lifecycle)}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
