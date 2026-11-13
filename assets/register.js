/* Pack 361 registration form. Same form as the Apps Script app; it now runs on the website
   and sends registrations to the app behind the scenes. Prices, dens and settings still come
   from the Registration Sheet. */
(function(){
  var ROOT_ID = "reg";

  /* ---- talking to the registration app (Apps Script) ---- */
  var API = (window.PACK361 && window.PACK361.registrationAppUrl) || "";
  function apiGet(what){
    return fetch(API + "?api=" + encodeURIComponent(what), { method: "GET" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }
  function apiPost(action, payload){
    return fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: action, payload: payload }) })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (res) { if (!res || !res.ok) throw new Error((res && res.error) || "Unknown error."); return res.result; });
  }
  function toTop(){ var el = document.getElementById(ROOT_ID); if (el) el.scrollIntoView({ block: "start" }); }
  function loadFailed(msg){
    document.getElementById("app").innerHTML = '<section class="panel"><h2>The form didn\'t load</h2><p>' + msg + '</p><p>Please try again in a minute. If it keeps happening, email info@sanmarinopack361.org.</p></section>';
  }

const TALENT = {
  "Willing to help with": ["Help with meeting or special event","Teach a Cub Scout skill","Lead special event or activity","Be volunteer leader","Come early to help set up","Stay after to help clean up","Help pick up craft supplies or refreshments","Live/work by Scout Shop for advancements/paperwork"],
  "Subjects or skills": ["Arts and crafts","Fishing","Cycling","Hiking","Camping","Conservation","U.S. history","Science","Technology","Engineering","Math","Woodworking","Sports","Health and nutrition"],
  "Events or activities": ["Banquets or potlucks","Award ceremonies","Camping","Hiking","Aquatics","Cycling","Fishing","Boating","Service projects","Pinewood Derby","Raingutter Regatta","Fundraising for Scouting","Product sales"],
  "Leadership interests": ["Work with my child's age group with another adult","Support other adults working directly with Scouts","Administrative tasks (records/communications)"],
  "Resources I can offer": ["Truck or large SUV","Classic car for parades/events","Home space for adult meetings","Outdoor space for adult meetings","Home space for den meetings (12 or fewer)","Access to a den meeting location","Home space for large outdoor pack events","Access to a large outdoor event location","Access to a large indoor event location","Extra camping gear","Woodworking workshop","A/V equipment","Large kitchen"]
};

/* ---------- settings from the Registration Sheet (injected by the server) ---------- */
let store = null;

/* ---------- CSV ---------- */
function parseCSV(text){
  const rows=[]; let row=[], f="", q=false;
  for(let i=0;i<text.length;i++){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else if(c==='"') q=true; else if(c===','){row.push(f);f="";}
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=""; }
    else f+=c; }
  if(f!==""||row.length){row.push(f);rows.push(row);}
  const clean = rows.filter(r=>r.some(v=>v.trim()!==""));
  const head = (clean.shift()||[]).map(h=>h.trim());
  return clean.map(r=>Object.fromEntries(head.map((h,i)=>[h,(r[i]??"").trim()])));
}
function toCSV(rows, cols){
  const esc=v=>{ v=v==null?"":String(v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
  return [cols.map(esc).join(",")].concat(rows.map(r=>cols.map(c=>esc(r[c])).join(","))).join("\n");
}

/* ---------- config ---------- */
let CFG;
function buildConfig(){
  const allCharges = parseCSV(store.chargesCsv).map(c=>({...c, amount:Number(c.amount)||0, includes_shirts:Number(c.includes_shirts)||0, required:/^y/i.test(c.required), external:/scouting america/i.test(c.paid_to||"")}));
  const charges = allCharges.filter(c=>!c.external);
  const national = allCharges.filter(c=>c.external);
  const s = Object.fromEntries(parseCSV(store.settingsCsv).map(r=>[r.key,r.value]));
  const dens = parseCSV(store.densCsv);
  CFG = { charges, national, nationalPerScout: national.filter(c=>c.unit==="per scout"&&c.required).reduce((a,c)=>a+c.amount,0), s, dens,
    perScoutAll: charges.filter(c=>c.unit==="per scout" && c.required),
    perScout: charges.filter(c=>c.unit==="per scout" && c.required && isActive(c)),
    perFamily: charges.filter(c=>c.unit==="per family" && c.required && isActive(c)),
    shirt: charges.find(c=>c.unit==="per shirt"),
    fits:(s.shirt_fits||"Youth|Adult").split("|"), sizes:(s.shirt_sizes||"S|M|L").split("|"),
    methods: (()=>{ const m=(s.payment_methods||"Zelle").split("|").map(x=>x.trim()).filter(x=>x==="Zelle"||x==="Check"); return m.length?m:["Zelle"]; })(),
    shirtsIncluded: charges.filter(c=>c.unit==="per scout"&&c.required&&c.amount>0).reduce((a,c)=>a+c.includes_shirts,0) };
}
const money = n => (n<0?"−":"") + "$" + (Math.round(Math.abs(n)*100)/100).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:2});
/* dates: "today" is the calendar day in Pacific time; a charge with valid_until applies through the end of that day */
function todayPT(){ try{ return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()); }catch(e){ return new Date().toISOString().slice(0,10); } }
function isActive(c, asOf){ if(!c.valid_until) return true; if(!/^\d{4}-\d{2}-\d{2}$/.test(c.valid_until)) return false; return (asOf||todayPT()) <= c.valid_until; }
function niceDate(d){ const [y,m,dd]=d.split("-").map(Number); return new Date(y,m-1,dd).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}); }
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const denLabel = d => { const x=CFG.dens.find(r=>r.den===String(d)); return x?`Den ${x.den} · ${x.name} (${x.grade} ${x.gender})`:(d?`Den ${d}`:""); };

/* ---------- totals ---------- */
function computeLines(sub){
  const lines=[];
  const asOf = sub.submitted || todayPT();
  sub.scouts.forEach(sc=>CFG.perScoutAll.filter(c=>isActive(c,asOf)).forEach(c=>lines.push({scout:`${sc.first} ${sc.last}`.trim(), label:c.label, category:c.category, amount:c.amount, qty:1, discount:c.amount<0, until:c.valid_until||""})));
  const first = sub.scouts[0]; const firstName = first?`${first.first} ${first.last}`.trim():"";
  CFG.perFamily.forEach(c=>lines.push({scout:firstName,label:c.label,category:c.category,amount:c.amount,qty:1}));
  const qty = sub.extras.reduce((a,e)=>a+(Number(e.qty)||0),0);
  if(qty && CFG.shirt) lines.push({scout:firstName,label:CFG.shirt.label,category:CFG.shirt.category,amount:CFG.shirt.amount*qty,qty});
  return lines;
}
const totalOf = sub => computeLines(sub).reduce((a,l)=>a+l.amount,0);
const sizeText = o => o.size==="Other" ? `Other: ${o.other||"?"}` : o.size;

/* ---------- parent flow ---------- */
const STEPS = ["Welcome","Family","Scouts","T-shirts","Talent survey","Review & pay","National registration"];
let step = 0, errors = {};
const blankScout = () => ({first:"",preferred:"",last:"",den:"",status:"",fit:"Youth",size:"",other:""});
let draft = freshDraft();
function freshDraft(){ return { p1:{name:"",email:"",cell:""}, p2:{name:"",email:"",cell:""}, mailing:true, scouts:[blankScout()], extras:[], talent:{occupation:"",hobbies:"",other:""}, skipTalent:false, method:"", zelleName:"", ref:"" }; }

function renderParent(){
  const pct = Math.round(step/(STEPS.length-1)*100);
  document.getElementById("app").innerHTML = `
  <div class="flow">
    <ol class="steps">${STEPS.map((s,i)=>`<li class="${i<step?"done":i===step?"cur":""}"><span class="n">${i<step?"✓":i+1}</span><span>${s}${i===4?' <span class="opt">optional</span>':""}</span></li>`).join("")}</ol>
    <section class="panel" aria-live="polite">
      <div class="mobile-progress"><span>Step ${step+1} of ${STEPS.length}</span><span class="bar"><i style="width:${pct}%"></i></span><span>${STEPS[step]}</span></div>
      ${[stepWelcome,stepFamily,stepScouts,stepShirts,stepTalent,stepPay,stepDone][step]()}
    </section>
  </div>`;
  bindParent();
}
function nav(backLabel, nextLabel, nextId="next"){
  return `<div class="btnrow">${step>0&&step<6?`<button class="btn ghost" id="back">← ${backLabel||"Back"}</button>`:"<span></span>"}${nextLabel?`<button class="btn" id="${nextId}">${nextLabel} →</button>`:""}</div>`;
}
function stepWelcome(){
  const rows = CFG.perScout.map(c=>`<tr class="${c.amount<0?"disc":""}"><td>${esc(c.label)}${c.valid_until?` <span class="pill new">until ${esc(niceDate(c.valid_until))}</span>`:""}<span class="desc">${esc(c.description)}${c.valid_until?`: ${esc(niceDate(c.valid_until))}.`:""}</span></td><td>${esc(c.unit)}</td><td class="amt">${money(c.amount)}</td></tr>`).join("")
    + CFG.perFamily.map(c=>`<tr><td>${esc(c.label)}<span class="desc">${esc(c.description)}</span></td><td>per family</td><td class="amt">${money(c.amount)}</td></tr>`).join("");
  const natl = CFG.national.filter(c=>c.required);
  return `
  <div class="stack"><p class="eyebrow">Scouting year ${esc(CFG.s.scouting_year)}</p><h1>Welcome to ${esc(CFG.s.pack_name||"Pack 361")}!</h1>
  <p class="lede">We're glad you're joining us, whether this is your first year or you're coming back. This form takes about 5 minutes. You can register all of your scouts at once and pay with ${CFG.methods.length>1?"one Zelle or one check":"one Zelle payment"}.</p></div>
  <div class="stack"><h2>What it costs</h2>
    <div class="tablewrap" style="border:0"><table class="fees"><thead><tr><th>Charge</th><th>Unit</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="callout"><h3>Scouting America membership is separate</h3>${natl.length?`<p><b>About ${money(CFG.nationalPerScout)} per scout.</b> ${natl.map(c=>esc(c.description)).join(" ")}</p>`:`<p>National dues are set by Scouting America and paid on their website, not to the local Carver pack. We'll send you there at the end of this form.</p>`}</div>
  </div>
  <div class="stack"><h2>What you'll do</h2>
    <div class="grid3">
      <div class="callout"><h3>1. Register here</h3><p>Family contacts, each scout's den, and T-shirt sizes.</p></div>
      <div class="callout"><h3>2. Pay the pack</h3><p>${CFG.methods.length>1?"Zelle or check to the treasurer, then enter your confirmation or check number.":"Zelle to the treasurer, then enter your Zelle confirmation number."}</p></div>
      <div class="callout"><h3>3. Register nationally</h3><p>Finish on the Scouting America website.</p></div>
    </div>
  </div>
  <div class="callout gold"><h3>Medical form (paper only)</h3><p>Download the Pack medical form, fill out Parts A and B for each scout, and bring it to your first pack or den event. Don't enter any medical information online.</p>
    <p><a class="btn small" href="${esc(CFG.s.medical_form_url)}" target="_blank" rel="noopener">Download medical form (PDF)</a></p></div>
  ${nav(null,"Start registration")}`;
}
function field(id,label,val,{type="text",req=false,ph=""}={}){
  return `<label class="f" for="${id}"><span>${label}${req?' <span class="req">*</span>':""}</span><input type="${type}" id="${id}" value="${esc(val)}" placeholder="${esc(ph)}" class="${errors[id]?"invalid":""}"></label>`;
}
function stepFamily(){
  return `<div class="stack"><h2>Parent / guardian contacts</h2><p class="muted">We use these for the pack roster, den communication, and payment questions.</p></div>
  <fieldset class="stack"><legend class="eyebrow">Parent / guardian 1</legend>
    <div class="grid3">${field("p1name","Full name",draft.p1.name,{req:true})}${field("p1email","Email",draft.p1.email,{type:"email",req:true})}${field("p1cell","Cell phone",draft.p1.cell,{type:"tel",req:true,ph:"626-555-0123"})}</div></fieldset>
  <fieldset class="stack"><legend class="eyebrow">Parent / guardian 2 (optional)</legend>
    <div class="grid3">${field("p2name","Full name",draft.p2.name)}${field("p2email","Email",draft.p2.email,{type:"email"})}${field("p2cell","Cell phone",draft.p2.cell,{type:"tel"})}</div></fieldset>
  <label class="check"><input type="checkbox" id="mailing" ${draft.mailing?"checked":""}><span><b>Add us to the pack mailing list.</b> Newsletters, event announcements and reminders.</span></label>
  ${errors._msg?`<p class="errmsg">${errors._msg}</p>`:""}
  ${nav(null,"Next: scouts")}`;
}
function stepScouts(){
  const denOpts = d => `<option value="">Choose a den…</option>`+CFG.dens.map(r=>`<option value="${esc(r.den)}" ${String(d)===r.den?"selected":""}>Den ${esc(r.den)} · ${esc(r.name)} (${esc(r.grade)} ${esc(r.gender)})</option>`).join("");
  const sizeOpts = s => `<option value="">Size…</option>`+CFG.sizes.map(z=>`<option ${s===z?"selected":""}>${esc(z)}</option>`).join("");
  return `<div class="stack"><h2>Your scouts</h2><p class="muted">Add each child you're registering this year. ${CFG.shirtsIncluded?`Each registration includes ${CFG.shirtsIncluded===1?"one pack T-shirt":CFG.shirtsIncluded+" pack T-shirts"}; pick the size here.`:""}</p></div>
  ${draft.scouts.map((sc,i)=>`<div class="scoutcard"><header><span class="tag">Scout ${i+1}</span>${draft.scouts.length>1?`<button class="linkbtn" data-rm-scout="${i}">Remove</button>`:""}</header>
    <div class="grid3">${field(`s${i}first`,"First name",sc.first,{req:true})}${field(`s${i}pref`,'Preferred name <span class="muted" style="font-weight:400">(optional)</span>',sc.preferred||"")}${field(`s${i}last`,"Last name",sc.last,{req:true})}</div>
    <label class="f" for="s${i}den"><span>Den for ${esc(CFG.s.scouting_year)} <span class="req">*</span></span><select id="s${i}den" class="${errors[`s${i}den`]?"invalid":""}">${denOpts(sc.den)}</select></label>
    <div class="stack" style="gap:6px"><span class="f" style="font-weight:600;font-size:.92rem">New or returning to Pack 361? <span class="req">*</span></span>
      <div class="seg ${errors[`s${i}status`]?"invalid":""}">${["New","Returning"].map(v=>`<label><input type="radio" name="s${i}status" value="${v}" ${sc.status===v?"checked":""}>${v}</label>`).join("")}</div></div>
    ${CFG.shirtsIncluded?`<div class="grid3">
      <label class="f" for="s${i}fit"><span>Included T-shirt fit</span><select id="s${i}fit">${CFG.fits.map(f=>`<option ${sc.fit===f?"selected":""}>${esc(f)}</option>`).join("")}</select></label>
      <label class="f" for="s${i}size"><span>Size <span class="req">*</span></span><select id="s${i}size" class="${errors[`s${i}size`]?"invalid":""}">${sizeOpts(sc.size)}</select></label>
      ${sc.size==="Other"?field(`s${i}other`,"Describe size",sc.other,{req:true,ph:"e.g. Youth XXS"}):"<span></span>"}</div>`:""}
  </div>`).join("")}
  <div><button class="btn ghost small" id="addScout">+ Add another scout</button></div>
  ${errors._msg?`<p class="errmsg">${errors._msg}</p>`:""}
  ${nav(null,"Next: T-shirts")}`;
}
function stepShirts(){
  const sizeOpts = s => `<option value="">Size…</option>`+CFG.sizes.map(z=>`<option ${s===z?"selected":""}>${esc(z)}</option>`).join("");
  const inc = draft.scouts.map(s=>`<li>${esc(s.first||"Scout")} ${esc(s.last)}: ${esc(s.fit)} ${esc(sizeText(s))} <span class="pill yes">included</span></li>`).join("");
  return `<div class="stack"><h2>${CFG.shirtsIncluded?"Extra T-shirts":"Pack T-shirts"}</h2><p class="muted">${CFG.shirtsIncluded?"Want shirts for siblings or parents? Add them here":"Want pack T-shirts for your scouts or family? Add them here"}${CFG.shirt?` at ${money(CFG.shirt.amount)} each`:""}. Skip this step if you don't need any.</p></div>
  ${CFG.shirtsIncluded?`<div class="callout"><h3>Already included</h3><ul style="margin:0;padding-left:18px">${inc}</ul></div>`:""}
  <div class="stack">${draft.extras.map((e,i)=>`<div class="shirtrow">
    <label class="f" for="x${i}fit">Fit<select id="x${i}fit">${CFG.fits.map(f=>`<option ${e.fit===f?"selected":""}>${esc(f)}</option>`).join("")}</select></label>
    <label class="f" for="x${i}size">Size<select id="x${i}size" class="${errors[`x${i}size`]?"invalid":""}">${sizeOpts(e.size)}</select></label>
    ${e.size==="Other"?field(`x${i}other`,"Describe size",e.other,{req:true}):"<span></span>"}
    <label class="f" for="x${i}qty">Qty<input type="number" min="1" max="20" id="x${i}qty" value="${esc(e.qty)}"></label>
    <button class="linkbtn" data-rm-extra="${i}" style="padding-bottom:10px">Remove</button></div>`).join("")}
    <div><button class="btn ghost small" id="addExtra">+ Add a shirt</button></div></div>
  ${errors._msg?`<p class="errmsg">${errors._msg}</p>`:""}
  ${nav(null, draft.extras.length?"Next: talent survey":(CFG.shirtsIncluded?"No extras, continue":"No shirts, continue"))}`;
}
function stepTalent(){
  const t = draft.talent;
  return `<div class="stack"><h2>Family talent survey <span class="muted" style="font-size:1rem;font-family:var(--f-body)">optional</span></h2>
    <p class="muted">The pack runs on parent help. Check anything you'd be open to. It doesn't commit you to anything, and it helps den leaders know who to ask.</p></div>
  <div class="grid2">${field("toccupation","Occupation / job title",t.occupation)}${field("thobbies","Hobbies or talents",t.hobbies)}</div>
  ${Object.entries(TALENT).map(([g,opts],gi)=>`<fieldset class="fitset"><legend>${esc(g)}</legend><div class="chips">${opts.map((o,oi)=>`<label><input type="checkbox" data-talent="${gi}" value="${esc(o)}" ${(t[g]||[]).includes(o)?"checked":""}>${esc(o)}</label>`).join("")}</div></fieldset>`).join("")}
  <label class="f" for="tother">Anything else? (other skills, events, resources)<input type="text" id="tother" value="${esc(t.other)}"></label>
  <div class="btnrow"><button class="btn ghost" id="back">← Back</button><span style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn ghost" id="skipTalent">Skip survey</button><button class="btn" id="next">Save and continue →</button></span></div>`;
}
function stepPay(){
  const lines = computeLines(draft); const total = lines.reduce((a,l)=>a+l.amount,0);
  if(CFG.methods.length===1) draft.method = CFG.methods[0];
  const m = draft.method;
  return `<div class="stack"><h2>Review and pay</h2><p class="muted">${CFG.methods.length>1?"Pay the pack with one Zelle or one check for the total below, then enter the confirmation or check number.":"Pay the pack with one Zelle payment for the total below, then enter the Zelle confirmation number."} We use it to match your payment to our bank records.</p></div>
  <div class="tablewrap" style="border:0"><table class="fees"><thead><tr><th>Item</th><th>For</th><th style="text-align:right">Amount</th></tr></thead><tbody>
    ${lines.map(l=>`<tr class="${l.discount?"disc":""}"><td>${esc(l.label)}${l.qty>1?` × ${l.qty}`:""}</td><td>${esc(l.label===CFG.shirt?.label?"Family":l.scout)}</td><td class="amt">${money(l.amount)}</td></tr>`).join("")}
  </tbody></table></div>
  <div class="big-total"><span><b>Total to pay ${esc(CFG.s.pack_name)}</b><br><span style="font-size:.9rem">${draft.scouts.length} scout${draft.scouts.length>1?"s":""}</span></span><strong>${money(total)}</strong></div>
  ${lines.some(l=>l.discount)?`<div class="callout gold"><h3>${esc(lines.find(l=>l.discount).label)}</h3><p>This total includes the ${esc(lines.find(l=>l.discount).label.toLowerCase())}. It applies when your payment is sent by <b>${esc(niceDate(lines.find(l=>l.discount).until))}</b>. The treasurer checks payment dates against the bank records.</p></div>`:""}
  ${CFG.nationalPerScout?`<p class="muted" style="font-size:.9rem">Not included: about ${money(CFG.nationalPerScout)} per scout for Scouting America membership, paid on their website in the last step.</p>`:""}
  ${CFG.methods.length>1?`<div class="stack" style="gap:6px"><span class="f" style="font-weight:600">How are you paying? <span class="req">*</span></span>
    <div class="seg ${errors.method?"invalid":""}">${CFG.methods.map(v=>`<label><input type="radio" name="method" value="${v}" ${m===v?"checked":""}>${v}</label>`).join("")}</div></div>`:""}
  ${m==="Zelle"?`<div class="callout"><h3>Send ${money(total)} by Zelle</h3>
      <div class="copyline"><span>To:</span><code id="zto">${esc(CFG.s.zelle_recipient)}</code><button class="btn ghost small" data-copy="zto">Copy</button></div>
      <p class="muted" style="font-size:.9rem">In the Zelle memo, write your scout's name(s). After you send it, your bank shows a confirmation number. Enter it below.</p></div>
    <div class="grid2">${field("zelleName","Name on the Zelle account",draft.zelleName,{req:true,ph:"As it appears in Zelle"})}${field("ref","Zelle confirmation number",draft.ref,{req:true,ph:"e.g. JPM99…"})}</div>`:""}
  ${m==="Check"?`<div class="callout"><h3>Write a check for ${money(total)}</h3><p>Payable to: <b>${esc(CFG.s.check_payable_to)}</b></p>${CFG.s.check_address?`<div class="copyline" style="align-items:flex-start"><span>Mail or deliver to:</span><address id="caddr" style="font-style:normal;user-select:all;line-height:1.4">${(CFG.s.check_address).split("|").map(esc).join("<br>")}</address><button class="btn ghost small" data-copyaddr="1">Copy</button></div>`:""}<p class="muted" style="font-size:.9rem">${esc(CFG.s.check_instructions)}</p></div>
    <div class="grid2">${field("ref","Check number",draft.ref,{req:true})}</div>`:""}
  ${errors._msg?`<p class="errmsg">${errors._msg}</p>`:""}
  ${nav(null,"Submit registration","submit")}`;
}
let lastSub=null;
function stepDone(){
  const s = lastSub; const anyNew = s.scouts.some(x=>x.status==="New"), anyRet = s.scouts.some(x=>x.status==="Returning");
  return `<div class="stack"><p class="eyebrow">Registration ${esc(s.id)} received</p><h2>One last step: register with Scouting America</h2>
    <p class="lede">You've paid the pack. Each scout also has to be registered with Scouting America, and national dues are paid there${CFG.nationalPerScout?` (about ${money(CFG.nationalPerScout)} per scout)`:""}. Use the link for each scout below.</p></div>
  <div class="natl">${s.scouts.map(x=>`<div class="row"><span><b>${esc(x.first)} ${esc(x.last)}</b> <span class="pill ${x.status==="New"?"new":"ret"}">${x.status}</span><br><span class="muted" style="font-size:.9rem">${x.status==="New"?"Fill out a new youth application and pay national dues online.":"Renew through the email from Scouting America, or sign in to my.scouting.org."}</span></span>
    <a class="btn small" target="_blank" rel="noopener" href="${esc(x.status==="New"?CFG.s.national_new_url:CFG.s.national_returning_url)}">${x.status==="New"?"New scout application":"Renew at my.scouting.org"} ↗</a></div>`).join("")}</div>
  <div class="callout ok"><h3>What we recorded</h3><p>${money(s.total)} by ${esc(s.method)} · ${s.method==="Zelle"?"confirmation":"check"} <span class="mono">${esc(s.ref)}</span>. The treasurer will match it against the bank statement.</p></div>
  <div class="callout gold"><h3>Don't forget the medical form</h3><p>Fill out Parts A and B for each scout and bring the paper copy to your first pack or den event.</p><p><a class="btn small" href="${esc(CFG.s.medical_form_url)}" target="_blank" rel="noopener">Download medical form (PDF)</a></p></div>
  <div class="callout"><h3>Confirmation email</h3><p>A copy of this registration, with the amount, payment details, Scouting America links and the medical form, goes to <b>${esc([s.p1.email,s.p2.email].filter(Boolean).join(" and "))}</b>. <span class="muted">If you don't see it in a few minutes, check your spam folder.</span></p></div>
  <p class="muted">Questions? Email <span class="mono" style="user-select:all">${esc(CFG.s.contact_email)}</span></p>
  <div class="btnrow"><span></span><button class="btn ghost" id="again">Register another family</button></div>`;
}

function readStep(){
  const v = id => (document.getElementById(id)?.value ?? "").trim();
  if(step===1){ draft.p1={name:v("p1name"),email:v("p1email"),cell:v("p1cell")}; draft.p2={name:v("p2name"),email:v("p2email"),cell:v("p2cell")}; draft.mailing=document.getElementById("mailing").checked; }
  if(step===2){ draft.scouts = draft.scouts.map((sc,i)=>({first:v(`s${i}first`),preferred:v(`s${i}pref`),last:v(`s${i}last`),den:v(`s${i}den`),status:(document.querySelector(`input[name=s${i}status]:checked`)||{}).value||"",fit:v(`s${i}fit`)||sc.fit,size:v(`s${i}size`),other:v(`s${i}other`)})); }
  if(step===3){ draft.extras = draft.extras.map((e,i)=>({fit:v(`x${i}fit`),size:v(`x${i}size`),other:v(`x${i}other`),qty:Math.max(1,parseInt(v(`x${i}qty`))||1)})); }
  if(step===4){ const t={occupation:v("toccupation"),hobbies:v("thobbies"),other:v("tother")}; Object.keys(TALENT).forEach((g,gi)=>t[g]=[...document.querySelectorAll(`input[data-talent="${gi}"]:checked`)].map(i=>i.value)); draft.talent=t; }
  if(step===5){ draft.method=CFG.methods.length===1?CFG.methods[0]:((document.querySelector("input[name=method]:checked")||{}).value||""); draft.zelleName=v("zelleName"); draft.ref=v("ref"); }
}
function validate(){
  errors={}; const need=(id,ok)=>{ if(!ok) errors[id]=1; };
  if(step===1){ need("p1name",draft.p1.name); need("p1email",/^\S+@\S+\.\S+$/.test(draft.p1.email)); need("p1cell",draft.p1.cell.replace(/\D/g,"").length>=10);
    if(draft.p2.email) need("p2email",/^\S+@\S+\.\S+$/.test(draft.p2.email)); }
  if(step===2){ draft.scouts.forEach((s,i)=>{ need(`s${i}first`,s.first); need(`s${i}last`,s.last); need(`s${i}den`,s.den); need(`s${i}status`,s.status); if(CFG.shirtsIncluded){ need(`s${i}size`,s.size); if(s.size==="Other") need(`s${i}other`,s.other);} }); }
  if(step===3){ draft.extras.forEach((e,i)=>{ need(`x${i}size`,e.size); if(e.size==="Other") need(`x${i}other`,e.other); }); }
  if(step===5){ need("method",draft.method); if(draft.method){ need("ref",draft.ref); if(draft.method==="Zelle") need("zelleName",draft.zelleName); } }
  if(Object.keys(errors).length) errors._msg = step===1?"Fill in the highlighted fields. Parent 1 needs a name, a valid email, and a 10-digit cell number.":step===5&&!draft.method?"Choose Zelle or Check.":"Fill in the highlighted fields to continue.";
  return !Object.keys(errors).length;
}
function bindParent(){
  const on=(id,fn)=>{ const el=document.getElementById(id); if(el) el.onclick=fn; };
  on("back",()=>{ readStep(); errors={}; step=Math.max(0,step-1); renderParent(); toTop(); });
  on("next",()=>{ readStep(); if(step===4) draft.skipTalent=false; if(!validate()){ renderParent(); return;} step++; renderParent(); toTop(); });
  on("skipTalent",()=>{ draft.skipTalent=true; errors={}; step++; renderParent(); toTop(); });
  on("addScout",()=>{ readStep(); errors={}; draft.scouts.push(blankScout()); renderParent(); });
  on("addExtra",()=>{ readStep(); errors={}; draft.extras.push({fit:"Youth",size:"",other:"",qty:1}); renderParent(); });
  document.querySelectorAll("[data-rm-scout]").forEach(b=>b.onclick=()=>{ readStep(); errors={}; draft.scouts.splice(+b.dataset.rmScout,1); renderParent(); });
  document.querySelectorAll("[data-rm-extra]").forEach(b=>b.onclick=()=>{ readStep(); errors={}; draft.extras.splice(+b.dataset.rmExtra,1); renderParent(); });
  document.querySelectorAll("select[id$=size]").forEach(s=>s.onchange=()=>{ readStep(); renderParent(); document.getElementById(s.id)?.focus(); });
  document.querySelectorAll("input[name=method]").forEach(r=>r.onchange=()=>{ readStep(); errors={}; renderParent(); });
  document.querySelectorAll("[data-copyaddr]").forEach(b=>b.onclick=()=>copyText((CFG.s.check_address||"").split("|").join("\n")));
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>copyText(document.getElementById(b.dataset.copy).textContent, document.getElementById(b.dataset.copy)));
  on("submit",()=>{ readStep(); if(!validate()){ renderParent(); return; }
    const btn=document.getElementById("submit"); btn.disabled=true; btn.textContent="Saving…";
    const payload = { p1:draft.p1, p2:draft.p2, mailing:draft.mailing, scouts:draft.scouts, extras:draft.extras, method:draft.method, zelleName:draft.zelleName, ref:draft.ref, talent:draft.skipTalent?null:draft.talent };
    apiPost("register", payload)
      .then(res=>{ lastSub=Object.assign({}, payload, {id:res.id, submitted:res.submitted, total:res.total}); step=6; renderParent(); toTop(); })
      .catch(err=>{ errors={_msg:"We couldn't save your registration: "+((err&&err.message)||err)+" Please try again. If it keeps happening, email "+(CFG.s.contact_email||"the pack")+"."}; renderParent(); });
  });
  on("again",()=>{ draft=freshDraft(); step=0; errors={}; renderParent(); toTop(); });
}

/* ---------- utils ---------- */
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2200); }
function copyText(text, selectEl){
  const fallback=()=>{ const ta=document.createElement("textarea"); ta.value=text; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); let ok=false; try{ ok=document.execCommand("copy"); }catch(e){} ta.remove(); toast(ok?"Copied":"Copy blocked here. Select the text and copy it manually."); };
  try{ navigator.clipboard.writeText(text).then(()=>toast("Copied"),fallback); }catch(e){ fallback(); }
}
document.getElementById("app").innerHTML = '<div class="loading">Loading the registration form…</div>';
if (!/^https:\/\/script\.google\.com\//.test(API)) loadFailed("The registration form isn't connected yet.");
else apiGet("boot").then(function (b) { store = b; buildConfig(); renderParent(); })
  .catch(function () { loadFailed("We couldn't reach the registration form."); });

})();
