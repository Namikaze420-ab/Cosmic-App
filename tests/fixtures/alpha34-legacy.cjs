// Frozen executable oracle extracted from Alpha 3.4 f34ab7d0a023c07299220fab315eb3fcdbb14004.
// Never update this fixture when changing the typed implementation.
const state = { profile:null };
const animals=['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];
const elements=['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
const trines=[['Rat','Dragon','Monkey'],['Ox','Snake','Rooster'],['Tiger','Horse','Dog'],['Rabbit','Goat','Pig']];
const opposites={Rat:'Horse',Horse:'Rat',Ox:'Goat',Goat:'Ox',Tiger:'Monkey',Monkey:'Tiger',Rabbit:'Rooster',Rooster:'Rabbit',Dragon:'Dog',Dog:'Dragon',Snake:'Pig',Pig:'Snake'};
const creates={Wood:'Fire',Fire:'Earth',Earth:'Metal',Metal:'Water',Water:'Wood'};
const controls={Wood:'Earth',Earth:'Water',Water:'Fire',Fire:'Metal',Metal:'Wood'};
const numScores={1:76,2:69,3:82,4:67,5:80,6:77,7:71,8:88,9:74,11:90,22:92,33:94};
const numTips={1:'Initiate one meaningful action and keep the plan simple.',2:'Prioritize cooperation, patience and careful communication.',3:'Use the day for expression, creative work and connection.',4:'Create structure. Finish practical work before adding more.',5:'Leave room for flexibility, movement and a change of scenery.',6:'Support relationships, home priorities and steady self-care.',7:'Protect focus. Reflection and research fit better than rushing.',8:'Direct attention toward execution, resources and measurable progress.',9:'Close loops, clear unfinished work and make room for what comes next.',11:'Notice intuition, but test important choices against practical evidence.',22:'Turn a large goal into a concrete sequence of achievable steps.',33:'Lead with care while keeping healthy boundaries and realistic expectations.'};
const windows={1:['08:30–10:00','14:00–15:30'],2:['10:30–12:00','18:00–19:30'],3:['09:30–11:00','15:00–16:30'],4:['08:00–09:30','13:00–14:30'],5:['11:00–12:30','16:00–17:30'],6:['09:00–10:30','17:00–18:30'],7:['07:30–09:00','20:00–21:00'],8:['10:00–11:30','14:30–16:00'],9:['09:00–10:30','18:30–20:00'],11:['07:30–09:00','18:30–20:00'],22:['09:00–10:30','14:00–16:00'],33:['10:00–11:30','17:00–19:00']};
const themes={1:['Work','Personal'],2:['Love','Social'],3:['Social','Personal'],4:['Work','Finance'],5:['Social','Personal'],6:['Love','Wellness'],7:['Personal','Wellness'],8:['Work','Finance'],9:['Love','Social'],11:['Love','Personal'],22:['Work','Finance'],33:['Love','Wellness']};
let sb=null;

function esc(s=''){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function isoDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function parseDate(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)}
function fmtDate(d,opts={weekday:'long',day:'numeric',month:'long'}){return new Intl.DateTimeFormat('en-GB',opts).format(d)}
function fmtTime(v){return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v))}
function reduce(n){let v=Math.abs(Number(n)||0);while(v>9&&![11,22,33].includes(v))v=String(v).split('').reduce((a,b)=>a+Number(b),0);return v}
function lifePath(s){return reduce(s.replace(/\D/g,'').split('').reduce((a,b)=>a+Number(b),0))}
function personalNumbers(birth,date){const b=parseDate(birth),uy=String(date.getFullYear()).split('').reduce((a,x)=>a+Number(x),0),py=reduce(b.getMonth()+1+b.getDate()+uy),pm=reduce(py+date.getMonth()+1),pd=reduce(pm+date.getDate());return {personalYear:py,personalMonth:pm,personalDay:pd}}
function chinese(date){const p=new Intl.DateTimeFormat('en-u-ca-chinese',{year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date),year=Number(p.find(x=>x.type==='relatedYear')?.value||date.getFullYear());return {year,animal:animals[((year-4)%12+12)%12],element:elements[((year-4)%10+10)%10]}}
function zodiacHarmony(birth,date){const natal=chinese(parseDate(birth)),current=chinese(date);let score=68;if(trines.some(g=>g.includes(natal.animal)&&g.includes(current.animal)))score=86;if(natal.animal===current.animal)score=72;if(opposites[natal.animal]===current.animal)score=50;if(natal.element===current.element)score+=5;else if(creates[natal.element]===current.element||creates[current.element]===natal.element)score+=4;else if(controls[natal.element]===current.element||controls[current.element]===natal.element)score-=5;return {score:clamp(score,42,94),natal,current}}
function insight(date=new Date()){if(!state.profile?.birth_date)return null;const n=personalNumbers(state.profile.birth_date,date),z=zodiacHarmony(state.profile.birth_date,date),numerology=numScores[n.personalDay]||72,score=Math.round(numerology*.65+z.score*.35);return {...n,lifePath:lifePath(state.profile.birth_date),zodiac:z,numerologyScore:numerology,zodiacScore:z.score,score,windows:windows[n.personalDay]||windows[1],tip:numTips[n.personalDay]||numTips[1]}}
function taskScore(t){const i=insight(new Date(t.starts_at));if(!i)return 50;return clamp(i.score+((themes[i.personalDay]||[]).includes(cap(t.category))?8:0)+(String(t.priority).toLowerCase()==='high'?1:0),30,98)}
function cap(s=''){return String(s).charAt(0).toUpperCase()+String(s).slice(1).toLowerCase()}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
function durationMinutes(task) {
    const start = new Date(task.starts_at).getTime();
    const end = new Date(task.ends_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 60;
    return Math.max(1, Math.round((end - start) / 60000));
  }
function clockMinutes(value) {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  }
function overnightDuration(start, end) {
const $ = selector => ({value:selector === '#taskTime' ? start : end});
function durationFromControls() {
    const start = clockMinutes($('#taskTime')?.value);
    const end = clockMinutes($('#taskEndTime')?.value);
    if (start === null || end === null) return null;
    let minutes = end - start;
    if (minutes <= 0) minutes += 1440;
    return minutes;
  }
return durationFromControls();
}
const FOCUS_IDS = new Set(['work','relationships','money','wellbeing','growth']);
const STYLE_IDS = new Set(['practical','balanced','reflective']);
function cleanFocus(value) {
    const items = Array.isArray(value) ? value : [];
    return [...new Set(items.map(String).filter(id => FOCUS_IDS.has(id)))].slice(0, 3);
  }
function cleanStyle(value) {
    return STYLE_IDS.has(value) ? value : 'balanced';
  }
module.exports = {reduce,lifePath,personalNumbers,chinese,zodiacHarmony,insight,taskScore,isoDate,parseDate,addDays,durationMinutes,clockMinutes,overnightDuration,cleanFocus,cleanStyle,setProfile:profile=>{state.profile=profile}};
