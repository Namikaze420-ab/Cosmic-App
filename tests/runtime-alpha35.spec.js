const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const oracle = fs.readFileSync(path.join(__dirname,'fixtures/alpha34-legacy.cjs'),'utf8');
const html = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

test.describe('Alpha 3.5 runtime cutover and rollback', () => {
  test.use({ serviceWorkers:'block', timezoneId:'Indian/Mauritius' });

  async function enterDemo(page) {
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await expect.poll(()=>page.evaluate(()=>Boolean(window.CosmicExperience33))).toBe(true);
    await page.locator('#demoMode').click();
    await expect(page.locator('.app-shell')).toBeVisible();
  }

  for (const mode of ['legacy','shadow','typed']) {
    test(`${mode} runtime preserves calculations, planner persistence and guidance`,async({page})=>{
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('http://127.0.0.1:4173/',route=>route.fulfill({contentType:'text/html',body:html.replaceAll('="typed"',`="${mode}"`)}));
      await enterDemo(page);
      // Run the frozen reference in the same browser/timezone, independently of
      // runtime adapters. This catches browser Intl and classic-script wiring drift.
      await page.addScriptTag({content:`window.Alpha34Oracle=(()=>{const module={exports:{}};${oracle}\nreturn module.exports;})();`});
      const comparison=await page.evaluate(()=>{
        const old=window.Alpha34Oracle;
        const failures=[];
        const originalProfile=state.profile;
        const equal=(label,actual,expected)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))failures.push(label)};
        try {
          for(const birth of ['1995-03-15','1989-12-11','2000-02-29']) {
            state.profile={...originalProfile,birth_date:birth}; old.setProfile(state.profile);
            for(const instant of ['2026-02-16T19:59:00Z','2026-02-16T20:01:00Z','2026-09-07T08:00:00Z','2026-12-31T21:00:00Z']) {
              const date=new Date(instant);
              equal('insight',insight(date),old.insight(date));
              equal('chinese',chinese(date),old.chinese(date));
              equal('personal',personalNumbers(birth,date),old.personalNumbers(birth,date));
              for(const category of ['work','finance','wellness']) for(const priority of ['high','medium',null]) {
                const task={starts_at:instant,category,priority};
                equal('task',taskScore(task),old.taskScore(task));
              }
            }
          }
          for(const n of [11,22,33,99,-44]) equal('reduce',reduce(n),old.reduce(n));
          for(const item of [{starts_at:'bad'},{starts_at:'2026-09-07T00:00:00Z',ends_at:'2026-09-08T00:00:00Z',all_day:true}]) {
            equal('duration',window.CosmicPlanner28.durationMinutes(item),old.durationMinutes(item));
          }
        } finally {state.profile=originalProfile;}
        return failures;
      });
      expect(comparison).toEqual([]);

      await page.locator('#quickAdd').click();
      await page.locator('#taskTitle').fill('Alpha 3.5 parity plan');
      await page.locator('#taskDate').fill('2030-01-15');
      await page.locator('#taskTime').fill('23:30');
      await page.locator('#taskEndTime').fill('00:45');
      await expect(page.locator('#taskDurationReadout')).toContainText('1h 15m');
      await page.locator('#taskRepeat').selectOption('daily');
      await page.locator('#taskRepeatUntil').fill('2030-01-17');
      await page.locator('#taskSubmit').click();
      await expect(page.locator('#modalBackdrop')).toBeHidden();
      const rows=await page.evaluate(()=>state.tasks.filter(task=>task.title==='Alpha 3.5 parity plan').map(task=>({
        day:isoDate(new Date(task.starts_at)),minutes:window.CosmicPlanner28.durationMinutes(task),rule:task.recurrence_rule,
      })));
      expect(rows).toEqual(['2030-01-15','2030-01-16','2030-01-17'].map(day=>({day,minutes:75,rule:'daily'})));

      await page.locator('[data-page="profile"]:visible').first().click();
      await page.locator('[data-alpha33-focus="money"]').click();
      await page.locator('[data-alpha33-style="reflective"]').click();
      await expect.poll(()=>page.evaluate(()=>window.CosmicExperience33.currentPreferences())).toEqual({focus_areas:['money'],guidance_style:'reflective'});
      await page.locator('[data-page="insights"]:visible').first().click();
      await expect(page.locator('.personal-lens-grid .personal-lens').first()).toHaveClass(/money/);

      const status=await page.evaluate(()=>window.CosmicRuntime.status());
      for(const domain of ['numerology','chineseZodiac','cosmicScore','guidance','plannerTime']) {
        expect(status.modes[domain]).toBe(mode);
        expect(Object.entries(status.operations).filter(([key])=>key.startsWith(`${domain}.`)).reduce((sum,[,count])=>sum+count[mode],0)).toBeGreaterThan(0);
      }
      expect(Object.values(status.operations).every(count=>!count.errors&&!count.mismatches&&!count.tripped)).toBe(true);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#demoMode').click();
      expect(await page.evaluate(()=>state.tasks.filter(task=>task.title==='Alpha 3.5 parity plan').length)).toBe(3);
      expect(await page.evaluate(()=>window.CosmicExperience33.currentPreferences())).toEqual({focus_areas:['money'],guidance_style:'reflective'});
      expect(errors).toEqual([]);
    });
  }

  test('missing runtime asset leaves the legacy app functional',async({page})=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/runtime-alpha35.js*',route=>route.abort());
    await enterDemo(page);
    expect(await page.evaluate(()=>typeof window.CosmicRuntime)).toBe('undefined');
    expect(await page.evaluate(()=>lifePath('1995-03-15'))).toBe(33);
    await page.locator('#quickAdd').click();
    await expect(page.locator('#taskDurationReadout')).toContainText('1h');
    expect(errors).toEqual([]);
  });

  test('a per-domain rollback leaves the other domains typed; invalid switches choose legacy',async({page})=>{
    await page.route('http://127.0.0.1:4173/',route=>route.fulfill({contentType:'text/html',body:html
      .replace('data-planner-time="typed"','data-planner-time="legacy"')
      .replace('data-guidance="typed"','data-guidance="invalid"')}));
    await enterDemo(page);
    expect(await page.evaluate(()=>window.CosmicRuntime.status().modes)).toEqual({
      numerology:'typed',chineseZodiac:'typed',cosmicScore:'typed',guidance:'legacy',plannerTime:'legacy',
    });
    await page.locator('#quickAdd').click();
    await expect(page.locator('#taskDurationReadout')).toContainText('1h');
  });

  test('domains can cut over cumulatively from deterministic utilities to scores',async({page})=>{
    test.setTimeout(90000);
    const enabled=[];
    let currentHtml=html;
    await page.route('http://127.0.0.1:4173/',route=>route.fulfill({contentType:'text/html',body:currentHtml}));
    for(const domain of ['planner-time','guidance','numerology','chinese-zodiac','cosmic-score']) {
      enabled.push(domain);
      currentHtml=html.replaceAll('="typed"','="legacy"');
      for(const active of enabled) currentHtml=currentHtml.replace(`data-${active}="legacy"`,`data-${active}="typed"`);
      await enterDemo(page);
      expect(await page.evaluate(()=>insight(new Date(2026,8,7,12)).score)).toBe(82);
      await page.locator('#quickAdd').click();
      await page.locator('#taskTime').fill('23:30');
      await page.locator('#taskEndTime').fill('00:30');
      await expect(page.locator('#taskDurationReadout')).toContainText('1h');
      await page.locator('#cancelTask').click();
      await page.locator('[data-page="profile"]:visible').first().click();
      await expect(page.locator('#alpha33GuidanceSettings')).toBeVisible();
      const status=await page.evaluate(()=>window.CosmicRuntime.status());
      expect(Object.values(status.modes).filter(mode=>mode==='typed')).toHaveLength(enabled.length);
      expect(Object.values(status.operations).every(count=>!count.errors&&!count.tripped)).toBe(true);
    }
  });
});

test.describe('Alpha 3.5 offline runtime',()=>{
  test.use({serviceWorkers:'allow'});
  test('offline reload serves the same typed bundle as the cached shell',async({page,context,browserName})=>{
    test.skip(browserName!=='chromium','Service-worker cache acceptance runs in Chromium; calculation parity runs in all three engines.');
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await expect.poll(()=>page.evaluate(async()=>{
      const cache=await caches.open('cosmic-planner-alpha3-v6');
      return Boolean(await cache.match('./runtime-alpha35.js?v=alpha3-5'));
    })).toBe(true);
    await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true);
    try {
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#demoMode').click();
      await expect(page.locator('.app-shell')).toBeVisible();
      expect(await page.evaluate(()=>window.CosmicRuntime.status().version)).toBe('alpha3.5');
      expect(await page.evaluate(()=>window.CosmicRuntime.status().operations['numerology.lifePath'].typed)).toBeGreaterThan(0);
    } finally {await context.setOffline(false);}
  });
});
