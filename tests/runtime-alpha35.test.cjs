const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const legacy = require('./fixtures/alpha34-legacy.cjs');
const { adapters } = require('../.runtime-build/runtime/compat.js');
const { createRuntime, readModes, equalResults, DOMAINS } = require('../.runtime-build/runtime/controller.js');
const modes = mode => readModes(Object.fromEntries(DOMAINS.map(key => [key, mode])));

test('numerology matches the frozen Alpha 3.4 executable oracle, including master numbers', () => {
  for (let value = -2000; value <= 2000; value++) assert.equal(adapters.numerology.reduce(value), legacy.reduce(value));
  for (const value of ['11','22','33','',NaN,Infinity,-Infinity,12.5]) {
    assert.equal(adapters.numerology.reduce(value), legacy.reduce(value));
  }
  for (const birth of ['1995-03-15','1989-12-11','2000-02-29','1900-03-01','2026-02-31']) {
    assert.equal(adapters.numerology.lifePath(birth), legacy.lifePath(birth));
    for (let month = 0; month < 12; month++) for (let day = 1; day <= 28; day++) {
      const date = new Date(2026, month, day, 12);
      assert.deepEqual(adapters.numerology.personalNumbers(birth, date), legacy.personalNumbers(birth, date));
    }
  }
});

test('zodiac, full scores and local dates preserve parity through LNY, leap days, midnight and DST in five zones', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['UTC','Indian/Mauritius','America/New_York','Pacific/Kiritimati','Pacific/Pago_Pago']) {
      process.env.TZ = zone;
      const births = ['1936-01-24','1988-02-16','1988-02-17','1989-12-11','1995-03-15','2000-02-29'];
      const dates = ['2026-02-16T23:30:00Z','2026-02-17T00:30:00Z','2026-03-08T07:30:00Z','2026-11-01T06:30:00Z','2024-02-29T23:30:00Z','2026-12-31T23:30:00Z'];
      for (const birth of births) for (const instant of dates) {
        const date = new Date(instant);
        assert.deepEqual(adapters.chineseZodiac.chinese(date), legacy.chinese(date), zone);
        assert.deepEqual(adapters.chineseZodiac.zodiacHarmony(birth,date), legacy.zodiacHarmony(birth,date), zone);
        assert.deepEqual(adapters.numerology.personalNumbers(birth,date), legacy.personalNumbers(birth,date), zone);
        legacy.setProfile({birth_date:birth});
        const insight = legacy.insight(date);
        const personal = adapters.numerology.personalNumbers(birth,date);
        const harmony = adapters.chineseZodiac.zodiacHarmony(birth,date);
        const numScore = adapters.cosmicScore.numerologyScore(personal.personalDay);
        assert.equal(adapters.cosmicScore.cosmicScore(numScore,harmony.score),insight.score,zone);
        assert.equal(adapters.plannerTime.isoDate(date), legacy.isoDate(date), zone);
        for (const offset of [-7,-1,0,1,7,30]) {
          assert.deepEqual(adapters.plannerTime.addDays(date,offset),legacy.addDays(date,offset),zone);
        }
      }
      for (const civil of ['2024-02-29','2026-03-08','2026-11-01','2026-12-31','2026-02-31','0099-01-01','bad']) {
        assert.deepEqual(adapters.plannerTime.parseDate(civil),legacy.parseDate(civil),zone);
      }
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ=previous; }
});

test('zodiac harmony covers the full sixty-year animal/element cycle against the legacy oracle', () => {
  for (let natal=1960; natal<2020; natal++) for (let current=2020; current<2080; current++) {
    const birth=`${natal}-07-15`, date=new Date(current,6,15,12);
    assert.deepEqual(adapters.chineseZodiac.zodiacHarmony(birth,date),legacy.zodiacHarmony(birth,date));
  }
});

test('score clamping, weighting and default personal days preserve boundary behavior', () => {
  for (const day of [0,1,2,3,4,5,6,7,8,9,11,22,33,99]) {
    const expected = ({1:76,2:69,3:82,4:67,5:80,6:77,7:71,8:88,9:74,11:90,22:92,33:94})[day] || 72;
    assert.equal(adapters.cosmicScore.numerologyScore(day),expected);
  }
  for (const base of [-100,0,29,30,50,89,97,98,99,100]) for (const match of [false,true]) for (const priority of ['low','medium','High','HIGH','']) {
    assert.equal(adapters.cosmicScore.taskAlignmentScore(base,match,priority),Math.max(30,Math.min(98,base+(match?8:0)+(priority.toLowerCase()==='high'?1:0))));
  }
});

test('legacy planner defaults, all-day elapsed time, subminute and overnight behavior survive the stricter domain boundary', () => {
  for (const item of [
    {starts_at:'2026-09-07T10:00:00Z',ends_at:'2026-09-07T10:00:20Z'},
    {starts_at:'2026-09-07T10:00:00Z',ends_at:'2026-09-07T11:15:00Z'},
    {starts_at:'2026-09-07T23:30:00Z',ends_at:'2026-09-08T00:30:00Z'},
    {starts_at:'2026-09-07T00:00:00Z',ends_at:'2026-09-08T00:00:00Z',all_day:true},
    {starts_at:'2026-03-08T00:00:00-05:00',ends_at:'2026-03-09T00:00:00-04:00',all_day:true},
    {starts_at:'2026-09-07T10:00:00Z'}, {starts_at:'bad',ends_at:'bad'},
    {starts_at:'2026-09-07T10:00:00Z',ends_at:'2026-09-07T10:00:00Z'},
    {starts_at:'2026-09-07T10:00:00Z',ends_at:'2026-09-07T09:00:00Z'},
    {starts_at:'1960-01-01T00:00:00Z',ends_at:null},
  ]) assert.equal(adapters.plannerTime.durationMinutes(item),legacy.durationMinutes(item));
  for (const start of ['00:00','23:30','14:30','99:99','','bad']) for (const end of ['00:00','00:30','14:30','99:99','','bad']) {
    assert.equal(adapters.plannerTime.clockMinutes(start),legacy.clockMinutes(start));
    assert.equal(adapters.plannerTime.overnightDuration(start,end),legacy.overnightDuration(start,end));
  }
});

test('guidance keeps the original order, three-item limit and malformed JSON-value behavior', () => {
  for (const value of [undefined,null,'work',4,{},[],['work','money','work','invalid','wellbeing','growth'],['growth',1,null,'relationships'],[new String('work')]]) {
    assert.deepEqual(adapters.guidance.cleanFocus(value),legacy.cleanFocus(value));
  }
  for (const value of ['practical','balanced','reflective','invalid','Practical',null,undefined,0,{},new String('practical')]) {
    assert.equal(adapters.guidance.cleanStyle(value),legacy.cleanStyle(value));
  }
});

test('missing Intl relatedYear preserves the legacy fallback without masking invalid dates', () => {
  const original = Intl.DateTimeFormat.prototype.formatToParts;
  try {
    Intl.DateTimeFormat.prototype.formatToParts=function(date) { return original.call(this,date).filter(part=>part.type!=='relatedYear'); };
    const date=new Date('2026-02-16T12:00:00Z');
    assert.deepEqual(adapters.chineseZodiac.chinese(date),legacy.chinese(date));
    assert.deepEqual(adapters.chineseZodiac.zodiacHarmony('1995-03-15',date),legacy.zodiacHarmony('1995-03-15',date));
    assert.throws(()=>adapters.chineseZodiac.chinese(new Date(NaN)));
  } finally { Intl.DateTimeFormat.prototype.formatToParts=original; }
});

test('legacy, shadow and typed choose the intended implementation and preserve null results', () => {
  for (const mode of ['legacy','shadow','typed']) {
    let legacyCalls=0;
    const runtime=createRuntime(adapters,modes(mode));
    assert.equal(runtime.call('numerology','reduce',()=>{legacyCalls++;return 33},[33]),33);
    assert.equal(legacyCalls,mode==='typed'?0:1);
    assert.equal(runtime.status().operations['numerology.reduce'][mode],1);
    assert.equal(runtime.call('plannerTime','clockMinutes',()=>null,['bad']),null);
  }
  assert.deepEqual(readModes({numerology:'typo',guidance:'shadow'}),{
    numerology:'legacy',chineseZodiac:'legacy',cosmicScore:'legacy',guidance:'shadow',plannerTime:'legacy',
  });
  assert.equal(equalResults(NaN,null),false);
  assert.equal(equalResults({a:1,b:NaN},{b:NaN,a:1}),true);
  assert.equal(equalResults(new Date(NaN),new Date(NaN)),true);
});

test('shadow mismatches and typed errors trip only that operation; status contains no payloads', () => {
  for (const mode of ['shadow','typed']) {
    let calls=0;
    const broken={...adapters,numerology:{...adapters.numerology,reduce:()=>{calls++;if(mode==='typed')throw Error('PRIVATE INPUT');return 999}}};
    const runtime=createRuntime(broken,modes(mode));
    for(let i=0;i<3;i++) assert.equal(runtime.call('numerology','reduce',()=>33,['PRIVATE INPUT']),33);
    assert.equal(calls,1);
    assert.equal(runtime.call('numerology','lifePath',()=>33,['1995-03-15']),33);
    const status=runtime.status(), counter=status.operations['numerology.reduce'];
    assert.equal(counter.tripped,true);
    assert.equal(counter[mode==='shadow'?'mismatches':'errors'],1);
    assert.equal(status.operations['numerology.lifePath'].tripped,false);
    assert.equal(JSON.stringify(status).includes('PRIVATE INPUT'),false);
    counter.errors=999;
    assert.notEqual(runtime.status().operations['numerology.reduce'].errors,999);
  }
});

test('the generated bundle installs synchronously, defaults to legacy and isolates per-domain switches', () => {
  const source=fs.readFileSync('runtime-alpha35.js','utf8');
  for (const dataset of [{},{numerology:'typed',guidance:'shadow'},{numerology:'bad'}]) {
    const context=vm.createContext({window:{},document:{currentScript:{dataset}}});
    vm.runInContext(source,context);
    const runtime=context.window.CosmicRuntime;
    assert.equal(runtime.status().modes.numerology,dataset.numerology==='typed'?'typed':'legacy');
    assert.equal(runtime.call('numerology','reduce',()=>17,[33]),dataset.numerology==='typed'?33:17);
    assert.equal(runtime.status().modes.plannerTime,'legacy');
  }
});

test('static deployment and offline cache include the exact versioned bundle before the app', () => {
  const html=fs.readFileSync('index.html','utf8');
  const sw=fs.readFileSync('sw.js','utf8');
  assert.ok(html.indexOf('runtime-alpha35.js')<html.indexOf('src="app.js'));
  for (const asset of [...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^\"]*)?)"/g)].map(match=>match[1])) {
    if (!asset.startsWith('http')) assert.ok(sw.includes(`'./${asset}'`),`${asset} missing from offline cache`);
  }
  assert.ok(sw.includes('cosmic-planner-alpha3-v6'));
});
