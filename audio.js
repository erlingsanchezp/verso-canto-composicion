(() => {
  'use strict';
  class VoiceAudio {
    constructor(){this.context=null;this.stream=null;this.source=null;this.analyser=null;this.loop=null;this.token=0;this.soundToken=0;this.outputs=[];this.metro=null;this.visualTimers=[];this.playingUntil=0;}
    async init(){const A=window.AudioContext||window.webkitAudioContext;if(!A)throw Error('Este navegador no dispone de Web Audio. Prueba una versión reciente de Chrome, Safari o Firefox.');if(!this.context||this.context.state==='closed'){try{this.context=new A({sampleRate:48000,latencyHint:'interactive'});}catch{this.context=new A();}}if(this.context.state==='suspended')await this.context.resume();return this.context;}
    async startMic(callback){
      this.stopMic();this.stopSounds();const token=this.token;
      if(!window.isSecureContext)throw Error('Abre la dirección HTTPS de Verso. El micrófono no funciona en una página HTTP o en algunos archivos locales.');
      if(!navigator.mediaDevices?.getUserMedia)throw Error('No hay acceso al micrófono. Abre Verso en un navegador compatible y permite el micrófono.');
      const ctx=await this.init();let stream;
      try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});}
      catch(e){const msg={NotAllowedError:'El micrófono está bloqueado. Permítelo en los ajustes del sitio y vuelve a intentarlo. Si estás en una vista integrada, abre el enlace en el navegador.',NotFoundError:'No se encontró un micrófono. Conecta uno y vuelve a intentarlo.',NotReadableError:'Otro programa está usando el micrófono o no se puede leer. Cierra las otras grabaciones y prueba de nuevo.',SecurityError:'El navegador bloqueó el micrófono. Abre el enlace HTTPS en una pestaña del navegador.'};throw Error(msg[e.name]||'No se pudo abrir el micrófono. Revisa los permisos y el dispositivo de entrada.');}
      if(token!==this.token){stream.getTracks().forEach(t=>t.stop());return false;}
      this.stream=stream;this.source=ctx.createMediaStreamSource(stream);this.analyser=ctx.createAnalyser();this.analyser.fftSize=4096;this.analyser.smoothingTimeConstant=0;this.source.connect(this.analyser);
      const input=new Float32Array(4096);
      this.loop=setInterval(()=>{if(!this.analyser)return;this.analyser.getFloatTimeDomainData(input);callback(VersoCore.detectPitch(input,ctx.sampleRate),performance.now());},75);
      stream.getAudioTracks().forEach(t=>t.addEventListener('ended',()=>{if(this.stream===stream){this.stopMic();callback(null,performance.now(),true);}}));
      return true;
    }
    stopMic(){this.token++;clearInterval(this.loop);this.loop=null;if(this.source){try{this.source.disconnect();}catch{}}if(this.stream)this.stream.getTracks().forEach(t=>t.stop());this.stream=null;this.source=null;this.analyser=null;}
    note(m,time,duration=.6,a=440,volume=.18){
      const ctx=this.context;if(!ctx)return;
      const osc=ctx.createOscillator(),gain=ctx.createGain(),harmonic=ctx.createOscillator(),hg=ctx.createGain();
      const f=VersoCore.freq(m,a);osc.type='triangle';osc.frequency.value=f;harmonic.type='sine';harmonic.frequency.value=f*2;
      gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+Math.min(.04,duration*.2));gain.gain.setValueAtTime(volume,time+Math.max(.05,duration*.75));gain.gain.exponentialRampToValueAtTime(.0001,time+Math.max(.1,duration));hg.gain.setValueAtTime(volume*.18,time);hg.gain.exponentialRampToValueAtTime(.0001,time+Math.max(.07,duration*.7));
      osc.connect(gain).connect(ctx.destination);harmonic.connect(hg).connect(ctx.destination);osc.start(time);harmonic.start(time);osc.stop(time+duration+.05);harmonic.stop(time+duration+.05);this.outputs.push(osc,harmonic);
      osc.onended=()=>{this.outputs=this.outputs.filter(x=>x!==osc);gain.disconnect();};harmonic.onended=()=>{this.outputs=this.outputs.filter(x=>x!==harmonic);hg.disconnect();};
    }
    async playEvents(events,{tempo=60,a=440,onNote}={}){if(this.stream)throw Error('Detén el micrófono antes de reproducir una referencia. Las referencias no sirven para aprobar pruebas.');this.stopSounds();const token=this.soundToken;await this.init();if(token!==this.soundToken||this.stream)return;let offset=0;const start=this.context.currentTime+.12;
      events.forEach((e,i)=>{const event=typeof e==='number'?{m:e,d:1}:e,d=60/tempo*(event.d||1);if(event.m!==null)this.note(event.m,start+offset,Math.max(.1,d*.85),a);if(onNote)this.visualTimers.push(setTimeout(()=>onNote(i),120+offset*1000));offset+=d;});
      this.playingUntil=performance.now()+offset*1000+200;return offset;
    }
    async playPiece(p,a=440,{mode='both'}={}){if(this.stream)throw Error('Detén el micrófono antes de escuchar la guía.');this.stopSounds();const token=this.soundToken;await this.init();if(token!==this.soundToken||this.stream)return;const beat=60/p.tempo,start=this.context.currentTime+.12;for(let i=0;i<p.bars.length;i++){if(mode!=='melody'){const ch=VersoCore.chord(p.bars[i].chord);for(const m of ch.notes)this.note(m,start+i*4*beat,4*beat*.92,a,.045);}if(mode!=='chords'){let offset=i*4;for(const e of p.bars[i].melody){if(e.m!==null)this.note(e.m,start+offset*beat,Math.max(.1,e.d*beat*.85),a,.14);offset+=e.d;}}}this.playingUntil=performance.now()+p.bars.length*4*beat*1000+200;}
    async startMetronome(bpm,beats,onBeat){if(this.stream)throw Error('Detén el micrófono antes de activar el metrónomo sonoro. Las pruebas usan un pulso visual.');this.stopSounds();const token=this.soundToken,ctx=await this.init();if(token!==this.soundToken||this.stream)return;let next=ctx.currentTime+.1,beat=0;
      this.metro=setInterval(()=>{while(next<ctx.currentTime+.12){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=beat%beats===0?1150:820;g.gain.setValueAtTime(.14,next);g.gain.exponentialRampToValueAtTime(.001,next+.05);o.connect(g).connect(ctx.destination);o.start(next);o.stop(next+.06);this.outputs.push(o);o.onended=()=>{this.outputs=this.outputs.filter(x=>x!==o);g.disconnect();};const b=beat%beats;this.visualTimers.push(setTimeout(()=>onBeat(b),Math.max(0,(next-ctx.currentTime)*1000)));next+=60/bpm;beat++;}},25);
    }
    stopSounds(){this.soundToken++;clearInterval(this.metro);this.metro=null;for(const o of this.outputs){try{o.stop();}catch{}}this.outputs=[];for(const t of this.visualTimers)clearTimeout(t);this.visualTimers=[];this.playingUntil=0;}
    stop(){this.stopMic();this.stopSounds();}
  }
  const db={
    async open(){if(!window.indexedDB)throw Error('Este navegador no permite guardar grabaciones. Usa una pestaña normal con almacenamiento disponible.');return new Promise((resolve,reject)=>{const r=indexedDB.open('verso-canto-media-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('recordings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('No se pudo abrir el almacenamiento de audio.'));});},
    async put(id,blob){const d=await this.open();return new Promise((resolve,reject)=>{const tx=d.transaction('recordings','readwrite');tx.objectStore('recordings').put(blob,id);tx.oncomplete=()=>{d.close();resolve();};tx.onerror=()=>{d.close();reject(Error('No hay espacio para la grabación. Descarga una copia y libera almacenamiento.'));};tx.onabort=()=>{d.close();reject(Error('No se pudo guardar la grabación.'));};});},
    async get(id){const d=await this.open();return new Promise((resolve,reject)=>{const tx=d.transaction('recordings','readonly'),r=tx.objectStore('recordings').get(id);r.onsuccess=()=>{const value=r.result;d.close();resolve(value);};r.onerror=()=>{d.close();reject(Error('No se pudo leer la grabación.'));};});},
    async remove(id){const d=await this.open();return new Promise((resolve,reject)=>{const tx=d.transaction('recordings','readwrite');tx.objectStore('recordings').delete(id);tx.oncomplete=()=>{d.close();resolve();};tx.onerror=()=>{d.close();reject(Error('No se pudo eliminar la grabación.'));};});},
    async clear(){const d=await this.open();return new Promise((resolve,reject)=>{const tx=d.transaction('recordings','readwrite');tx.objectStore('recordings').clear();tx.oncomplete=()=>{d.close();resolve();};tx.onerror=()=>{d.close();reject(Error('No se pudo borrar el audio local.'));};});}
  };
  window.VoiceAudio=VoiceAudio;window.VersoMedia=db;
})();
