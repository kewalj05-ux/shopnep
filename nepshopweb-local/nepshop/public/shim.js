// Gives the storefront the same data/user/AI API it used before, backed by this server.
(()=>{
const J=async(u,o)=>{const r=await fetch(u,o);if(!r.ok)throw Object.assign(new Error(r.status),{status:r.status});return r.json()};
let ME=null;const ready=fetch("/api/me").then(r=>r.ok?r.json():null).then(m=>{ME=m;if(!m)gate()}).catch(()=>gate());
function poll(get,cb,err){let last="",dead=false;const run=async()=>{if(dead||document.hidden&&last)return;try{const r=await get(),s=JSON.stringify(r);if(s!==last){last=s;cb(r)}}catch(e){err&&err(e)}};run();const t=setInterval(run,2200);return()=>{dead=true;clearInterval(t)}}
const snap=(id,r)=>({id,exists:r.exists,data:()=>r.data,metadata:{}});
function doc(c,id){const u=`/api/db/${c}/${id}`,put=(data,merge)=>J(u,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({data,merge})}).then(()=>{});
 return{id,path:c+"/"+id,get:async()=>snap(id,await J(u)),set:d=>put(d,false),update:d=>put(d,true),delete:()=>J(u,{method:"DELETE"}).then(()=>{}),onSnapshot:(n,e)=>poll(()=>J(u),r=>n(snap(id,r)),e)}}
function col(c){const q=r=>{const docs=r.docs.map(d=>({id:d.id,exists:true,data:()=>d.data}));return{docs,size:docs.length,empty:!docs.length}};
 return{doc:id=>doc(c,id),get:async()=>q(await J(`/api/db/${c}`)),onSnapshot:(n,e)=>poll(()=>J(`/api/db/${c}`),r=>n(q(r)),e)}}
const db={collection:col};
async function sample(input,o={}){const msgs=typeof input==="string"?[{role:"user",content:input}]:input.map(m=>({role:m.role,content:m.content}));
 const tools=(o.tools||[]).map(t=>({name:t.name,description:t.description,input_schema:t.inputSchema||{type:"object",properties:{}}}));
 for(let i=0;i<5;i++){const j=await J("/api/ai",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages:msgs,tools:tools.length?tools:undefined})});
  const tu=(j.content||[]).filter(b=>b.type==="tool_use");
  if(!tu.length){const text=(j.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");o.onText&&o.onText({text,delta:text});return{text,truncated:false}}
  msgs.push({role:"assistant",content:j.content});const rs=[];
  for(const t of tu){const tl=(o.tools||[]).find(x=>x.name===t.name);let out;try{out=JSON.stringify(await tl.execute(t.input))}catch(e){out="error"}rs.push({type:"tool_result",tool_use_id:t.id,content:out})}
  msgs.push({role:"user",content:rs})}throw new Error("loop")}
const user={isOwner:async()=>!!ME?.admin,canEdit:async()=>!!ME?.admin,id:async()=>ME?.id||null,me:async()=>({...ME,isOwner:!!ME?.admin,canEdit:!!ME?.admin})};
const assets={upload:async f=>{const r=await J("/api/upload",{method:"POST",headers:{"content-type":f.type},body:f});return{id:r.id,url:r.url}}};
const downloads={save:async({filename,data})=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data]));a.download=filename;a.click()}};
window.claude={use:async n=>{await ready;if(!ME)return null;return{db,user,sample,assets,downloads}[n]||null}};
window.logout=async()=>{await fetch("/api/logout",{method:"POST"});location.reload()};
function gate(){const o=document.createElement("div");o.style.cssText="position:fixed;inset:0;z-index:999;display:grid;place-items:center;padding:18px;background:linear-gradient(135deg,#4c1d95,#7c3aed 55%,#2563eb)";
 o.innerHTML=`<div style="background:var(--card);color:var(--tx);border-radius:22px;padding:26px;width:100%;max-width:380px;box-shadow:0 20px 60px #0006;animation:up .4s"><div style="font-size:24px;font-weight:800;text-align:center">🛒 NEPSHOP<span style="color:var(--ac)">WEB</span></div><p class="mu" style="text-align:center;margin:4px 0 14px">Sign in to top up, track orders and chat with support</p>
 <div style="display:flex;gap:8px;margin-bottom:12px"><button class="btn" id="tl" style="flex:1">Login</button><button class="btn g" id="tr" style="flex:1">Register</button></div>
 <div id="fn" style="display:none"><label>Full name</label><input id="an" placeholder="Your name"></div><label id="lb">Email or username</label><input id="ae" placeholder="you@gmail.com" autocomplete="username"><label>Password</label><input id="ap" type="password" placeholder="••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')document.getElementById('ag').click()">
 <div id="aerr" style="color:#dc2626;min-height:20px;font-size:13px"></div><button class="btn" id="ag" style="width:100%;padding:13px">Login</button></div>`;document.body.appendChild(o);let reg=false;const $=i=>o.querySelector("#"+i);
 const mode=r=>{reg=r;$("fn").style.display=r?"block":"none";$("lb").textContent=r?"Email (Gmail or any)":"Email or username";$("ag").textContent=r?"Create account":"Login";$("tl").className="btn"+(r?" g":"");$("tr").className="btn"+(r?"":" g");$("aerr").textContent=""};
 $("tl").onclick=()=>mode(false);$("tr").onclick=()=>mode(true);
 $("ag").onclick=async()=>{try{const b=reg?{name:$("an").value,email:$("ae").value,password:$("ap").value}:{login:$("ae").value,password:$("ap").value};
  const r=await fetch(reg?"/api/register":"/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}),j=await r.json();if(!r.ok)throw new Error(j.error);location.reload()}catch(e){$("aerr").textContent=e.message}}}
})();
