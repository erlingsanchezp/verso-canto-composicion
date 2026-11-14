/* Proyecto musical original de Verso: voz a altura de concierto y canción con acordes. */
(() => {
  'use strict';
  const NAMES=['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'],FLATS=['Do','Re♭','Re','Mi♭','Mi','Fa','Sol♭','Sol','La♭','La','Si'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const noteName=(m,flat=false)=>(flat?FLATS:NAMES)[((Math.round(m)%12)+12)%12]+(Math.floor(Math.round(m)/12)-1);
  const freq=(m,a=440)=>a*2**((m-69)/12),midi=(f,a=440)=>69+12*Math.log2(f/a),inRange=m=>Number.isInteger(m)&&m>=36&&m<=84;
  const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const locName=m=>`${noteName(m,true)} · altura de concierto`;
  const eventFor=(m,d=1)=>{if(m!==null&&!inRange(m))throw Error('El editor admite Do2–Do6; no representa un objetivo de extensión vocal.');return {m,d};};
  const fresh=()=>({version:1,instrument:'voice-songwriting',lessons:{},exams:{},practice:{},journal:[],settings:{goal:20,a:440,base:60,low:55,high:67,confirmed:false},composition:null,seenIntro:false});
  const lessonDone=(s,id)=>!!s.lessons[id]?.completedAt,examPassed=(s,id)=>!!s.exams[id]?.completedAt;
  const unlocked=(s,l,lessons)=>l.id===1||lessonDone(s,l.id-1)&&(lessons[l.id-2].level===l.level||examPassed(s,l.level-1));
  const examReady=(s,id,lessons)=>lessons.filter(l=>l.level===id).every(l=>lessonDone(s,l.id));
  const reference=(pattern,settings)=>pattern.map(n=>settings.base+n);
  const fits=(seq,settings)=>settings.confirmed&&seq.every(m=>m>=settings.low&&m<=settings.high);
  const lessonReady=(r,l)=>!!r&&r.quiz===3&&r.practical===true&&r.checks?.length===3&&r.checks.every(Boolean)&&(!l?.assignment||String(r.work||'').trim().length>=l.assignment.min);
  const reviewPass=e=>!!e?.review&&e.review.name?.trim().length>=3&&e.review.feedback?.trim().length>=30&&e.review.scores?.length===4&&e.review.scores.every(n=>Number.isInteger(n)&&n>=3&&n<=5)&&e.review.scores.reduce((a,b)=>a+b,0)>=16;
  const KEYS={C:0,Db:-5,D:2,Eb:-3,E:4,F:-1,Gb:-6,G:1,Ab:-4,A:3,Bb:-2,B:5,Cm:-3,'C#m':4,Dm:-1,Ebm:-6,Em:1,Fm:-4,'F#m':3,Gm:-2,'G#m':5,Am:0,Bbm:-5,Bm:2};
  const ROOTS={C:0,Db:1,'C#':1,D:2,Eb:3,'D#':3,E:4,F:5,Gb:6,'F#':6,G:7,Ab:8,'G#':8,A:9,Bb:10,'A#':10,B:11};
  const SECTIONS={verse:'Verso',pre:'Preestribillo',chorus:'Estribillo',bridge:'Puente'};
  const CHORD_TYPES={'':{steps:[0,4,7],xml:'major'},m:{steps:[0,3,7],xml:'minor'},'7':{steps:[0,4,7,10],xml:'dominant'},maj7:{steps:[0,4,7,11],xml:'major-seventh'},m7:{steps:[0,3,7,10],xml:'minor-seventh'},dim:{steps:[0,3,6],xml:'diminished'},sus2:{steps:[0,2,7],xml:'suspended-second'},sus4:{steps:[0,5,7],xml:'suspended-fourth'}};
  function chord(symbol){const match=/^([A-G](?:#|b)?)(maj7|m7|sus2|sus4|dim|m|7)?$/.exec(String(symbol));if(!match||!Object.hasOwn(ROOTS,match[1]))return null;const root=ROOTS[match[1]],type=match[2]||'',notes=CHORD_TYPES[type].steps.map(n=>48+root+n);return {symbol,root,type,notes,step:match[1][0],alter:match[1].includes('#')?1:match[1].includes('b')?-1:0,xml:CHORD_TYPES[type].xml};}
  const chordPalette=()=>['C','Dm','Em','F','G','Am','Bdim','C7','D7','E7','Fmaj7','G7','Am7','Cmaj7','Cm','D','Eb','Fm','Ab','Bb','Bbm','Db','Gb','B','F#','F#m','C#m','G#m','A','E','Dsus2','Gsus4'];
  const initialPiece=()=>({instrument:'song',title:'Mi primera canción',key:'C',tempo:80,bars:Array.from({length:16},(_,i)=>({melody:[],chord:['C','Am','F','G'][i%4],section:i<8?'verse':'chorus'})),lyrics:{verse:'',pre:'',chorus:'',bridge:''},hook:'',brief:'',notes:'',revision:'',release:'',feedback:[]});
  function transposePiece(piece,semitones){if(!Number.isInteger(semitones)||Math.abs(semitones)>24)throw Error('Transporte no válido.');const p=JSON.parse(JSON.stringify(piece)),en=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'],minor=['Cm','C#m','Dm','Ebm','Em','Fm','F#m','Gm','G#m','Am','Bbm','Bm'];for(const bar of p.bars){const ch=chord(bar.chord);bar.chord=en[(ch.root+semitones%12+12)%12]+ch.type;for(const e of bar.melody)if(e.m!==null){e.m+=semitones;if(!inRange(e.m))throw Error('El transporte sale del registro editable. No se modificó el proyecto.');}}const pc=(ROOTS[p.key.replace(/m$/,'')]+semitones%12+12)%12;p.key=p.key.endsWith('m')?minor[pc]:en[pc];return validatePiece(p);}
  const newPiece=(base=60)=>transposePiece(initialPiece(),base-60);
  const limited=(v,n)=>String(v??'').slice(0,n);
  function validateFeedback(v){if(!v||typeof v!=='object')throw Error('Comentario no válido.');const item={alias:limited(v.alias||'Oyente',60),clarity:Number(v.clarity),recall:limited(v.recall,300),comment:limited(v.comment,1000),again:v.again===true,listened:v.listened===true};if(!Number.isInteger(item.clarity)||item.clarity<1||item.clarity>5||item.comment.trim().length<10)throw Error('Registra claridad de 1–5 y una observación de al menos diez caracteres.');return item;}
  function validatePiece(v){
    if(!v||v.instrument!=='song'||!Array.isArray(v.bars)||v.bars.length<1||v.bars.length>32)throw Error('El archivo no es una canción de Verso.');
    const p={instrument:'song',title:limited(v.title||'Sin título',100),key:Object.hasOwn(KEYS,v.key)?v.key:'C',tempo:Math.max(40,Math.min(180,Number(v.tempo)||80)),bars:[],lyrics:{},hook:limited(v.hook,300),brief:limited(v.brief,2000),notes:limited(v.notes,5000),revision:limited(v.revision,3000),release:limited(v.release,3000),feedback:[]};
    for(const id of Object.keys(SECTIONS))p.lyrics[id]=limited(v.lyrics?.[id],6000);
    for(const bar of v.bars){if(!bar||!Array.isArray(bar.melody)||bar.melody.length>16||!chord(bar.chord)||!Object.hasOwn(SECTIONS,bar.section))throw Error('Compás, acorde o sección no válido.');const b={chord:String(bar.chord),section:bar.section,melody:[]};for(const e of bar.melody){if(!e||![.25,.5,1,1.5,2,3,4].includes(e.d)||e.m!==null&&!inRange(e.m))throw Error('Nota o duración fuera del editor.');b.melody.push({m:e.m,d:e.d,...(e.spell==='flat'?{spell:'flat'}:{}),...(e.breath===true?{breath:true}:{}),...(e.m!==null&&e.lyric?{lyric:limited(e.lyric,50)}:{})});}if(b.melody.reduce((a,e)=>a+e.d,0)>4)throw Error('Un compás supera cuatro pulsos.');p.bars.push(b);}
    if(Array.isArray(v.feedback))p.feedback=v.feedback.slice(0,30).map(validateFeedback);
    return p;
  }
  function lyricStats(text){const lines=String(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);return {lines:lines.length,words:String(text).trim().split(/\s+/u).filter(Boolean).length,rows:lines.map(line=>({line,words:line.split(/\s+/u).length,last:line.split(/\s+/u).at(-1).replace(/[.,;:!?¡¿"'…]/g,'')}))};}
  function feedbackSummary(p){const list=p.feedback.filter(x=>x.listened);return {n:list.length,clarity:list.length?list.reduce((a,x)=>a+x.clarity,0)/list.length:0,recall:list.filter(x=>x.recall.trim()).length,again:list.filter(x=>x.again).length};}
  function analysePiece(p,settings){
    const errors=[],warnings=[],notes=p.bars.flatMap(b=>b.melody).filter(e=>e.m!==null),words=p.notes.trim().split(/\s+/u).filter(Boolean).length;
    p.bars.forEach((b,i)=>{const sum=b.melody.reduce((a,e)=>a+e.d,0);if(sum!==4)errors.push(`Compás ${i+1}: ${sum}/4 pulsos.`);if(!chord(b.chord))errors.push(`Compás ${i+1}: acorde no válido.`);});
    if(!notes.length)errors.push('La canción necesita notas reales, además de silencios.');
    const breath=p.bars.flatMap(b=>b.melody).some(e=>e.m===null||e.breath),lyricOK=lyricStats(p.lyrics.verse).lines>=2&&lyricStats(p.lyrics.chorus).lines>=2&&p.hook.trim().length>=5&&p.brief.trim().length>=30;
    const melodyOK=errors.length===0&&p.bars.length>=8&&notes.length>=16;
    const songOK=errors.length===0&&p.bars.length>=16&&notes.length>=32&&breath&&lyricOK&&['verse','chorus'].every(id=>p.bars.filter(b=>b.section===id).length>=4)&&notes.some(e=>e.lyric?.trim());
    const audience=feedbackSummary(p),revisionOK=p.revision.trim().length>=50&&audience.n>=3,finalOK=songOK&&revisionOK&&words>=150&&words<=300&&p.release.trim().length>=80;
    if(!breath)warnings.push('Planifica silencios o respiraciones y comprueba la frase cantando.');
    if(!lyricOK)warnings.push('Completa verso y estribillo con dos líneas cada uno, frase gancho e intención.');
    if(!notes.some(e=>e.lyric?.trim()))warnings.push('Alinea al menos una sílaba con su nota; el ajuste completo de letra y melodía se revisa al cantar.');
    if(settings&&notes.some(e=>e.m<settings.low||e.m>settings.high))warnings.push('Hay notas fuera de tu zona cómoda declarada. Revisa o transpón antes de cantarlas; la extensión no es una meta automática.');
    if(audience.n<3)warnings.push('El proyecto final pide observaciones declaradas de tres oyentes que hayan escuchado.');
    if(words<150||words>300)warnings.push('La defensa final debe tener 150–300 palabras.');
    warnings.push('Estos controles describen estructura y evidencias. No valoran automáticamente calidad vocal, originalidad ni potencial de éxito comercial.');
    return {errors,warnings,notes:notes.length,complete:errors.length===0,lyricOK,melodyOK,songOK,revisionOK,finalOK,words,audience};
  }
  function examRequirements(s,l,lessons){const e=s.exams[l.id]||{},a=s.composition?analysePiece(s.composition,s.settings):null;return [
    {ok:examReady(s,l.id,lessons),label:'Seis clases y sus ejercicios completados'},
    {ok:e.theory>=80,label:'Teoría: al menos 8 de 10'},
    {ok:e.practical===true,label:'Secuencia vocal y pulso aprobados'},
    {ok:!!e.evidence&&e.evidence.duration>=l.record,label:`Toma propia de al menos ${l.record} segundos guardada`},
    {ok:l.id<3?e.selfReview===true:reviewPass(e),label:l.id<3?'Autoobservación registrada':'Revisión docente: 16/20 y ningún criterio inferior a 3'},
    ...(l.id>=3?[{ok:!!a?.lyricOK,label:'Borrador propio: verso, estribillo, gancho e intención'}]:[]),
    ...(l.id>=4?[{ok:!!a?.melodyOK,label:'Ocho compases completos y 16 notas o más'}]:[]),
    ...(l.id>=6?[{ok:!!a?.songOK,label:'Canción de 16 compases con forma, letra y respiración'}]:[]),
    ...(l.id>=7?[{ok:!!a?.revisionOK,label:'Tres oyentes y una revisión documentada'}]:[]),
    ...(l.id===8?[{ok:!!a?.finalOK,label:'Defensa de 150–300 palabras y plan de lanzamiento'}]:[])
  ];}
  function validateState(v){
    if(!v||v.version!==1||v.instrument!=='voice-songwriting'||!v.lessons||!v.exams||typeof v.lessons!=='object'||typeof v.exams!=='object'||Array.isArray(v.lessons)||Array.isArray(v.exams))throw Error('El archivo no es una copia de progreso de Verso.');
    const n=fresh();for(let i=1;i<=48;i++){const r=v.lessons[i];if(r&&typeof r==='object')n.lessons[i]={quiz:Math.max(0,Math.min(3,Number(r.quiz)||0)),practical:r.practical===true,checks:Array.isArray(r.checks)?r.checks.slice(0,3).map(x=>x===true):[],work:limited(r.work,5000),reference:Number.isInteger(r.reference)?r.reference:undefined,completedAt:typeof r.completedAt==='string'?r.completedAt.slice(0,40):undefined};}
    for(let i=1;i<=8;i++){const r=v.exams[i];if(r&&typeof r==='object')n.exams[i]={theory:Math.max(0,Math.min(100,Number(r.theory)||0)),practical:r.practical===true,selfReview:r.selfReview===true,reference:Number.isInteger(r.reference)?r.reference:undefined,completedAt:typeof r.completedAt==='string'?r.completedAt.slice(0,40):undefined,evidence:r.evidence&&typeof r.evidence.id==='string'?{id:r.evidence.id.slice(0,150),duration:Math.max(0,Math.min(600,Number(r.evidence.duration)||0)),type:limited(r.evidence.type||'audio/webm',60)}:undefined,review:r.review?{name:limited(r.review.name,120),feedback:limited(r.review.feedback,3000),scores:Array.isArray(r.review.scores)?r.review.scores.slice(0,4).map(x=>Math.max(0,Math.min(5,Math.floor(Number(x)||0)))):[]}:undefined};}
    if(v.practice&&typeof v.practice==='object')for(const [k,m] of Object.entries(v.practice))if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&Number.isFinite(m)&&m>=0&&m<=1440)n.practice[k]=m;
    n.journal=Array.isArray(v.journal)?v.journal.slice(-200).filter(x=>x&&typeof x.text==='string').map(x=>({date:limited(x.date,40),text:limited(x.text,3000)})):[];
    n.settings={goal:Math.max(5,Math.min(120,Number(v.settings?.goal)||20)),a:Math.max(436,Math.min(444,Number(v.settings?.a)||440)),base:Math.max(40,Math.min(72,Math.round(Number(v.settings?.base)||60))),low:Math.max(36,Math.min(84,Math.round(Number(v.settings?.low)||55))),high:Math.max(36,Math.min(84,Math.round(Number(v.settings?.high)||67))),confirmed:v.settings?.confirmed===true};if(n.settings.low>n.settings.high)throw Error('La zona cómoda está invertida.');n.seenIntro=v.seenIntro===true;if(v.composition)n.composition=validatePiece(v.composition);return n;
  }
  const SECTION_PROMPTS={verse:'¿Quién está en la escena, dónde y qué detalle muestra el conflicto?',pre:'¿Qué cambia para preparar la llegada sin adelantar toda la respuesta?',chorus:'¿Cuál es la idea central que puede recordarse y cantarse?',bridge:'¿Qué perspectiva o decisión nueva aparece antes del regreso?'};
  const PROMPTS=[['Una maleta que no se abre','Despedida sin dramatismo','Primera persona','Una decisión pequeña cambia el rumbo'],['El último bus','Esperanza cotidiana','Segunda persona','Regresar ya no significa lo mismo'],['Una taza en la ventana','Ausencia y aceptación','Primera persona','Un objeto cuenta lo que no se dijo'],['La ciudad antes del ruido','Comenzar de nuevo','Plural','Una acción concreta reemplaza una promesa'],['Un mensaje sin enviar','Orgullo y vulnerabilidad','Primera persona','El estribillo revela la contradicción'],['La llave equivocada','Pertenencia','Segunda persona','La puerta importante no es la literal']];
  const API={NAMES,FLATS,KEYS,ROOTS,SECTIONS,CHORD_TYPES,SECTION_PROMPTS,PROMPTS,esc,noteName,freq,midi,inRange,locName,eventFor,dateKey,fresh,lessonDone,examPassed,unlocked,examReady,lessonReady,reference,fits,reviewPass,examRequirements,validateState,newPiece,validatePiece,analysePiece,transposePiece,chord,chordPalette,lyricStats,validateFeedback,feedbackSummary};
  function detectPitch(input,sampleRate){
    const len=input.length,buf=new Float64Array(len);let energy=0,mean=0;
    for(let i=0;i<len;i++){buf[i]=input[i];mean+=buf[i];}mean/=len;
    for(let i=0;i<len;i++){buf[i]-=mean;energy+=buf[i]*buf[i];}
    const rms=Math.sqrt(energy/len);if(rms<.006)return null;
    const sr=sampleRate,min=Math.floor(sr/1500),max=Math.min(Math.floor(sr/60),Math.floor(len/2)-1),half=Math.floor(len/2),d=new Float64Array(max+2);
    let cum=0,tau=-1;
    for(let t=1;t<=max+1;t++){let sum=0;for(let i=0;i<half;i++){const x=buf[i]-buf[i+t];sum+=x*x;}d[t]=sum;}
    for(let t=1;t<=max+1;t++){cum+=d[t];d[t]=cum?d[t]*t/cum:1;}
    for(let t=Math.max(2,min);t<=max;t++)if(d[t]<.14){while(t<max&&d[t+1]<d[t])t++;tau=t;break;}
    if(tau<0||d[tau]>.16)return null;
    const x=d[tau-1],y=d[tau],z=d[tau+1],den=x-2*y+z;
    const refined=tau+(den?(x-z)/(2*den):0),f=sr/refined;
    if(f<60||f>1500)return null;
    return {frequency:f,confidence:1-y,rms};
  }
  class Sequence {
    constructor(targets,{cents=40,tempo=60,timed=false,tolerance=.35,hold=190}={}){this.targets=targets;this.cents=cents;this.tempo=tempo;this.timed=timed;this.tolerance=tolerance;this.hold=hold;this.index=0;this.onsets=[];this.candidate=null;this.since=0;this.waitRelease=false;this.lastMidi=null;this.silentSince=null;this.finished=false;this.maxRms=0;this.lowRms=1;}
    feed(pitch,time,a=440){
      if(this.finished)return {done:true,index:this.index};
      if(!pitch){this.candidate=null;if(this.silentSince===null)this.silentSince=time;if(time-this.silentSince>=90)this.waitRelease=false;this.lowRms=.001;return {index:this.index};}
      this.silentSince=null;const raw=midi(pitch.frequency,a),n=Math.round(raw),cent=(raw-n)*100;
      if(this.waitRelease){if(n!==this.lastMidi||(pitch.rms>this.lowRms*2.2&&this.lowRms<this.maxRms*.6)){this.waitRelease=false;this.candidate=null;}else{this.lowRms=Math.min(this.lowRms,pitch.rms);return {index:this.index};}}
      if(n!==this.targets[this.index]||Math.abs(cent)>this.cents){this.candidate=null;return {index:this.index,wrong:true,note:n};}
      if(this.candidate!==n){this.candidate=n;this.since=time;this.maxRms=pitch.rms;}
      this.maxRms=Math.max(this.maxRms,pitch.rms);
      if(time-this.since>=this.hold){this.onsets.push(this.since);this.index++;this.candidate=null;this.lastMidi=n;this.waitRelease=true;this.lowRms=pitch.rms;if(this.index===this.targets.length){this.finished=true;const expected=60000/this.tempo;let hits=0;const errors=[];for(let i=1;i<this.onsets.length;i++){const dev=Math.abs((this.onsets[i]-this.onsets[i-1])/expected-1);errors.push(dev);if(dev<=this.tolerance)hits++;}const rhythmScore=errors.length?Math.round(hits/errors.length*100):100;return {done:true,index:this.index,rhythmScore,passed:!this.timed||rhythmScore>=70};}return {index:this.index,accepted:true};}
      return {index:this.index,holding:Math.min(1,(time-this.since)/this.hold)};
    }
  }
  /* Partitura vocal a altura de concierto; el editor no clasifica voces. */
  function scoreSvg(events,{labels=true,active=-1,width=760,barLines=true,title='Ejercicio vocal',preferFlats=false}={}){
    const list=events.map(x=>typeof x==='number'?{m:x,d:1}:x),height=285;
    const total=list.reduce((a,e)=>a+(e.d||1),0)||4,left=70,usable=width-left-32,scale=usable/Math.max(total,4),sy=85,gap=11;
    const pitchStep=[0,0,1,1,2,3,3,4,4,5,5,6],flatStep=[0,1,1,2,2,3,4,4,5,5,6,6];
    const pos=(m,flat)=>{const w=m;const diat=(Math.floor(w/12)-1)*7+(flat?flatStep:pitchStep)[w%12];return sy+gap*4-(diat-(4*7+2))*gap/2;};
    let svg=`<svg class="score" role="img" aria-label="${esc(title)}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><title>${esc(title)}</title><g stroke="#b1b1a2" stroke-width="1">`;
    for(let i=0;i<5;i++)svg+=`<path d="M16 ${sy+i*gap}H${width-15}"/>`;
    svg+=`</g><path transform="translate(0,28)" d="M35 110C16 104 18 84 34 82C50 80 51 100 37 102C26 104 22 93 30 88C34 85 40 87 41 91M33 82C38 73 45 63 39 48C33 44 26 55 29 68L41 116C45 134 22 132 27 119C30 112 39 116 35 121" fill="none" stroke="#2a4038" stroke-width="2.2" stroke-linecap="round"/><g font-family="Georgia,serif" font-size="18" fill="#52634c"><text x="54" y="${sy+18}">4</text><text x="54" y="${sy+38}">4</text></g>`;
    let t=0,accidentals=new Map(),lastBar=0;
    list.forEach((e,i)=>{const x=left+t*scale+Math.min(scale*.3,18),d=e.d||1,fill=i===active?'#aa8042':'#48334e';
      if(Math.floor(t/4)!==lastBar){accidentals=new Map();lastBar=Math.floor(t/4);}
      if(e.m===null){if(d>=2)svg+=`<rect x="${x-7}" y="${d===4?sy+gap:sy+gap*2-4}" width="14" height="4" fill="${fill}"/>`;else if(d<=.5)svg+=`<circle cx="${x-3}" cy="${sy+20}" r="3" fill="${fill}"/><path d="M${x-4} ${sy+24}q8 2 9-8l-6 25" fill="none" stroke="${fill}" stroke-width="1.8"/>`;else svg+=`<path d="M${x-3} ${sy+8}l9 11-9 7 8 11q-10-2-7 8" fill="none" stroke="${fill}" stroke-width="2.5"/>`;if(d===1.5||d===3)svg+=`<circle cx="${x+12}" cy="${sy+25}" r="2" fill="${fill}"/>`;}
      else{const flat=e.spell==='flat'||preferFlats,y=pos(e.m,flat),white=d>=2;for(let ly=sy-11;ly>=y-1;ly-=11)svg+=`<path d="M${x-11} ${ly}h22" stroke="#7e887d"/>`;for(let ly=sy+55;ly<=y+1;ly+=11)svg+=`<path d="M${x-11} ${ly}h22" stroke="#7e887d"/>`;
        const alter=[1,3,6,8,10].includes(e.m%12)?(flat?-1:1):0,key=Math.floor(e.m/12)*7+(flat?flatStep:pitchStep)[e.m%12];
        if((accidentals.get(key)||0)!==alter)svg+=`<text x="${x-21}" y="${y+5}" font-size="18" fill="${fill}">${alter===1?'♯':alter===-1?'♭':'♮'}</text>`;accidentals.set(key,alter);
        svg+=`<ellipse cx="${x}" cy="${y}" rx="7.3" ry="4.9" transform="rotate(-18 ${x} ${y})" fill="${white?'#fdfcf8':fill}" stroke="${fill}" stroke-width="1.8"/>`;
        if(d<4){const down=y<sy+gap*2,sx=x+(down?-6:6);svg+=`<path d="M${sx} ${y+(down?1:-1)}v${down?32:-32}" stroke="${fill}" stroke-width="1.5"/>`;if(d===.25)svg+=`<path d="M${sx} ${y+(down?27:-27)}${down?'q-18-10-6-22q-4 10 6 13':'q18 10 6 22q4-10-6-13'}" fill="${fill}"/>`;if(d<=.5)svg+=`<path d="M${sx} ${y+(down?33:-33)}${down?'q-18-10-6-22q-4 10 6 13':'q18 10 6 22q4-10-6-13'}" fill="${fill}"/>`;}
        if(e.art==='staccato')svg+=`<circle cx="${x}" cy="${y+14}" r="2" fill="${fill}"/>`;
        if(e.art==='tenuto')svg+=`<path d="M${x-5} ${y+14}h10" stroke="${fill}" stroke-width="1.5"/>`;
        if(e.art==='accent')svg+=`<path d="M${x-5} ${y+12}l10 3-10 3" stroke="${fill}" stroke-width="1.5" fill="none"/>`;
        if(e.breath)svg+=`<text x="${x+13}" y="${Math.min(sy-12,y-20)}" font-size="20" fill="${fill}">’</text>`;
        if(d===1.5||d===3)svg+=`<circle cx="${x+14}" cy="${y-2}" r="2" fill="${fill}"/>`;
        if(e.lyric)svg+=`<text x="${x}" y="243" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${fill}">${esc(e.lyric)}</text>`;
        if(labels)svg+=`<text x="${x}" y="269" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${fill}">${esc(noteName(e.m,flat))}</text>`;
      }
      t+=d;
    });
    if(barLines)for(let b=4;b<=total;b+=4)svg+=`<path d="M${left+b*scale-4} ${sy}v${gap*4}" stroke="#8d968a" stroke-width="${b===total?2:1}"/>`;
    return svg+'</svg>';
  }
  function musicXML(p){
    const names=['C','C','D','D','E','F','F','G','G','A','A','B'],flatNames=['C','D','D','E','E','F','G','G','A','A','B','B'];
    let xml=`<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="4.0"><work><work-title>${esc(p.title)}</work-title></work><identification><creator type="composer">Estudiante de Verso</creator></identification><part-list><score-part id="P1"><part-name>Voz y cifrado</part-name><score-instrument id="I1"><instrument-name>Voz</instrument-name></score-instrument><midi-instrument id="I1"><midi-channel>1</midi-channel><midi-program>54</midi-program></midi-instrument></score-part></part-list><part id="P1">`;
    p.bars.forEach((bar,i)=>{xml+=`<measure number="${i+1}">`;if(i===0)xml+=`<attributes><divisions>4</divisions><key><fifths>${KEYS[p.key]||0}</fifths><mode>${p.key.endsWith('m')?'minor':'major'}</mode></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${p.tempo}</per-minute></metronome></direction-type><sound tempo="${p.tempo}"/></direction>`;
      if(i===0||p.bars[i-1].section!==bar.section)xml+=`<direction placement="above"><direction-type><rehearsal>${esc(SECTIONS[bar.section])}</rehearsal></direction-type></direction>`;
      const ch=chord(bar.chord);xml+=`<harmony><root><root-step>${ch.step}</root-step>${ch.alter?'<root-alter>'+ch.alter+'</root-alter>':''}</root><kind text="${esc(ch.type)}">${ch.xml}</kind></harmony>`;
      const events=[...bar.melody];let remaining=4-events.reduce((a,e)=>a+e.d,0);for(const d of [4,2,1,.5,.25])while(remaining>=d){events.push({m:null,d});remaining-=d;}
      for(const e of events){const type={.25:'16th',.5:'eighth',1:'quarter',1.5:'quarter',2:'half',3:'half',4:'whole'}[e.d];xml+='<note>';if(e.m===null)xml+='<rest/>';else{const pc=e.m%12;xml+=`<pitch><step>${(e.spell==='flat'?flatNames:names)[pc]}</step>${[1,3,6,8,10].includes(pc)?'<alter>'+(e.spell==='flat'?-1:1)+'</alter>':''}<octave>${Math.floor(e.m/12)-1}</octave></pitch>`;}xml+=`<duration>${e.d*4}</duration><voice>1</voice><type>${type}</type>${e.d===1.5||e.d===3?'<dot/>':''}`;if(e.breath&&e.m!==null)xml+='<notations><articulations><breath-mark/></articulations></notations>';if(e.lyric&&e.m!==null)xml+=`<lyric><text>${esc(e.lyric)}</text></lyric>`;xml+='</note>';}
      xml+='</measure>';});return xml+'</part></score-partwise>';
  }
  function leadSheet(p){return p.title+'\nTonalidad: '+p.key+' · Tempo: '+p.tempo+' BPM · 4/4\n\nIntención: '+p.brief+'\nGancho: '+p.hook+'\n\n'+Object.entries(SECTIONS).filter(([id])=>p.lyrics[id].trim()).map(([id,name])=>name.toUpperCase()+'\n'+p.lyrics[id]+'\n').join('\n')+'\nMAPA DE COMPASES\n'+p.bars.map((b,i)=>(i+1)+'. '+SECTIONS[b.section]+' · '+b.chord+' · '+b.melody.map(e=>e.m===null?'silencio '+e.d:noteName(e.m,e.spell==='flat')+' ('+e.d+')'+(e.lyric?' ['+e.lyric+']':'')).join(' / ')).join('\n')+'\n\nDEFENSA\n'+p.notes+'\n\nREVISIÓN\n'+p.revision+'\n\nPLAN DE LANZAMIENTO\n'+p.release+'\n';}
  Object.assign(API,{detectPitch,Sequence,scoreSvg,musicXML,leadSheet});
  if(typeof window!=='undefined')window.VersoCore=API;
  if(typeof module!=='undefined')module.exports=API;
})();
