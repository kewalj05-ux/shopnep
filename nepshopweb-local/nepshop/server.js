// NEPSHOPWEB local server — zero dependencies, Node 18+.  Run: node server.js
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
// Read settings.env (KEY=value per line) so you don't have to type environment variables
try{fs.readFileSync(path.join(__dirname,"settings.env"),"utf8").split(/\r?\n/).forEach(l=>{const m=/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(l);if(m&&!l.trim().startsWith("#")&&m[2]&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,"")})}catch(e){}
const PORT=+process.env.PORT||8080,DATA=path.join(__dirname,"data"),UP=path.join(DATA,"uploads"),PUB=path.join(__dirname,"public");
const KEY=process.env.ANTHROPIC_API_KEY||"",MODEL=process.env.ANTHROPIC_MODEL||"claude-haiku-5-5";
fs.mkdirSync(UP,{recursive:true});
const load=(n,d)=>{try{return JSON.parse(fs.readFileSync(path.join(DATA,n),"utf8"))}catch(e){return d}};
const save=(n,o)=>fs.writeFileSync(path.join(DATA,n),JSON.stringify(o));
let users=load("users.json",[]),store=load("db.json",{}),sess=load("sessions.json",{});
const rid=n=>crypto.randomBytes(n).toString("hex");
const hash=(pw,salt)=>crypto.scryptSync(pw,salt,32).toString("hex");
const same=(a,b)=>a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
function mk(u){const salt=rid(16);return{...u,id:"u"+rid(6),salt,hash:hash(u.password,salt),password:undefined}}
if(!users.some(u=>u.role==="admin")){
  const au=(process.env.ADMIN_USER||"kewal").toLowerCase(),ap=process.env.ADMIN_PASS||"kewal2836";
  users.push(mk({username:au,email:(process.env.ADMIN_EMAIL||"").toLowerCase(),name:"Admin",role:"admin",password:ap}));save("users.json",users);
  console.log(`\n  Admin account created → username: ${au}  (password from ADMIN_PASS or default). Change it!\n`)}
const pub=u=>({id:u.id,name:u.name,email:u.email||"",admin:u.role==="admin"});
const tries={};const limited=(k,max,ms)=>{const n=Date.now();tries[k]=(tries[k]||[]).filter(t=>n-t<ms);if(tries[k].length>=max)return true;tries[k].push(n);return false};
const can=(op,col,id,u)=>{const adm=u&&u.role==="admin";if(col==="catalog")return op==="read"?!!u:!!adm;if(!u)return false;if(adm&&op==="read")return true;const own=id===u.id;
  if(col==="orders"||col==="cmsg")return own;if(["ostat","amsg","ctl"].includes(col))return op==="read"?own:!!adm;return false};
const body=(req,max=6e6)=>new Promise((ok,no)=>{let b=[],n=0;req.on("data",c=>{n+=c.length;if(n>max){no(new Error("big"));req.destroy()}else b.push(c)});req.on("end",()=>ok(Buffer.concat(b)));req.on("error",no)});
const send=(res,code,o,h={})=>{res.writeHead(code,{"content-type":"application/json",...h});res.end(JSON.stringify(o))};
const MT={".html":"text/html;charset=utf-8",".js":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".gif":"image/gif"};
function who(req){const m=/(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie||"");const s=m&&sess[m[1]];return s?users.find(u=>u.id===s):null}
function login(res,u){const t=rid(24);sess[t]=u.id;save("sessions.json",sess);send(res,200,pub(u),{"set-cookie":`sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`})}
if(+process.versions.node.split(".")[0]<18){console.log("Node 18+ required. Install the latest from https://nodejs.org");process.exit(1)}
const srv=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,"http://x"),p=url.pathname,u=who(req),ip=req.socket.remoteAddress;
  if(p==="/api/register"&&req.method==="POST"){if(limited("r"+ip,10,36e5))return send(res,429,{error:"Too many attempts"});
    const b=JSON.parse(await body(req)),email=String(b.email||"").trim().toLowerCase(),name=String(b.name||"").trim().slice(0,40);
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return send(res,400,{error:"Enter a valid email"});if(!name)return send(res,400,{error:"Enter your name"});
    if(String(b.password||"").length<6)return send(res,400,{error:"Password must be 6+ characters"});if(users.some(x=>x.email===email))return send(res,400,{error:"Email already registered"});
    const nu=mk({email,name,role:"user",password:String(b.password)});users.push(nu);save("users.json",users);return login(res,nu)}
  if(p==="/api/login"&&req.method==="POST"){if(limited("l"+ip,15,6e5))return send(res,429,{error:"Too many attempts, wait 10 minutes"});
    const b=JSON.parse(await body(req)),k=String(b.login||"").trim().toLowerCase(),x=users.find(v=>v.email===k||v.username===k);
    if(!x||!same(hash(String(b.password||""),x.salt),x.hash))return send(res,401,{error:"Wrong email/username or password"});return login(res,x)}
  if(p==="/api/logout"){const m=/sid=([a-f0-9]+)/.exec(req.headers.cookie||"");if(m){delete sess[m[1]];save("sessions.json",sess)}return send(res,200,{ok:1},{"set-cookie":"sid=; Max-Age=0; Path=/"})}
  if(p==="/api/me")return u?send(res,200,pub(u)):send(res,401,{error:"no"});
  let m=/^\/api\/db\/(\w+)(?:\/([\w-]+))?$/.exec(p);
  if(m){const[,col,id]=m;
    if(!id){if(!u||u.role!=="admin")return send(res,403,{error:"forbidden"});return send(res,200,{docs:Object.entries(store[col]||{}).map(([i,d])=>({id:i,data:d}))})}
    const op=req.method==="GET"?"read":"write";if(!can(op,col,id,u))return send(res,403,{error:"forbidden"});
    store[col]=store[col]||{};
    if(req.method==="GET"){const d=store[col][id];return send(res,200,{exists:d!==undefined,data:d})}
    if(req.method==="DELETE"){delete store[col][id];save("db.json",store);return send(res,200,{ok:1})}
    if(req.method==="PUT"){const b=JSON.parse(await body(req));store[col][id]=b.merge?{...(store[col][id]||{}),...b.data}:b.data;save("db.json",store);return send(res,200,{ok:1})}}
  if(p==="/api/upload"&&req.method==="POST"){if(!u||u.role!=="admin")return send(res,403,{error:"forbidden"});
    const ext={"image/png":".png","image/jpeg":".jpg","image/webp":".webp","image/gif":".gif"}[req.headers["content-type"]];if(!ext)return send(res,400,{error:"Images only"});
    const id=rid(12)+ext;fs.writeFileSync(path.join(UP,id),await body(req,5e6));return send(res,200,{id,url:"/_blob/"+id})}
  if((m=/^\/_blob\/([a-f0-9]+\.(?:png|jpg|webp|gif))$/.exec(p))){const f=path.join(UP,m[1]);if(!fs.existsSync(f))return send(res,404,{});res.writeHead(200,{"content-type":MT[path.extname(f)],"cache-control":"public,max-age=86400"});return fs.createReadStream(f).pipe(res)}
  if(p==="/api/ai"&&req.method==="POST"){if(!u)return send(res,401,{error:"login"});if(!KEY)return send(res,503,{error:"Set ANTHROPIC_API_KEY to enable the AI assistant"});
    if(limited("a"+u.id,20,6e4))return send(res,429,{error:"slow down"});const b=JSON.parse(await body(req));
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:MODEL,max_tokens:700,messages:b.messages,tools:b.tools})});
    return send(res,r.status,await r.json())}
  // static
  let f=path.normalize(path.join(PUB,p==="/"?"index.html":p));if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return send(res,404,{error:"not found"});
  res.writeHead(200,{"content-type":MT[path.extname(f)]||"application/octet-stream"});fs.createReadStream(f).pipe(res)
}catch(e){send(res,500,{error:"server error"})}});
let port=PORT;
srv.on("error",e=>{if(e.code==="EADDRINUSE"&&port<PORT+10){console.log("Port "+port+" is busy, trying "+(port+1)+"...");srv.listen(++port)}else{console.log("Cannot start:",e.message);process.exit(1)}});
srv.on("listening",()=>console.log(`\n  NEPSHOPWEB is running.\n  Open this in your browser →  http://localhost:${port}\n  ${KEY?"AI assistant: ON":"AI assistant: OFF (set ANTHROPIC_API_KEY)"}\n  Keep this window open. Press Ctrl+C to stop.\n`));
srv.listen(port);
