let ctx=null, master=null, volume=.6;
export function setVolume(v){volume=v;if(master)master.gain.setTargetAtTime(v,ctx.currentTime,.04);}
function init(){if(ctx)return;ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=volume;master.connect(ctx.destination);}
export function sound(type){
 try{init();if(ctx.state==="suspended")ctx.resume();const now=ctx.currentTime;
  const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=type==="shot"?2200:900;osc.connect(filter);filter.connect(gain);gain.connect(master);
  const cfg={shot:[95,.075,"sawtooth"],enemy:[135,.09,"square"],reload:[360,.12,"triangle"],hit:[650,.06,"sine"],hurt:[70,.18,"sawtooth"],switch:[260,.055,"triangle"],empty:[180,.04,"square"],win:[520,.4,"sine"],lose:[95,.35,"triangle"],ui:[440,.035,"sine"]}[type]||[250,.08,"triangle"];
  osc.type=cfg[2];osc.frequency.setValueAtTime(cfg[0],now);osc.frequency.exponentialRampToValueAtTime(Math.max(35,cfg[0]*.35),now+cfg[1]);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(type==="shot"?.22:.09,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+cfg[1]);osc.start(now);osc.stop(now+cfg[1]+.01);
 }catch(e){}
}
