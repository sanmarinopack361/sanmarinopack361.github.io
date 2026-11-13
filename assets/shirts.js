/* Pack 361 T-shirt order form. Same form as the Apps Script app (?page=shirts); orders go to the app behind the scenes. */
(function(){
  var ROOT_ID = "shirts";

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

let B = null;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '$' + (Math.round(n * 100) / 100).toLocaleString('en-US');
const state = { parent: { name: '', email: '', cell: '' }, items: [], zelleName: '', ref: '', sending: false, error: '' };
function blank(prev) { return { first: prev ? prev.first : '', last: prev ? prev.last : '', den: prev ? prev.den : '', fit: (B && B.fits[0]) || 'Youth', size: '', other: '', qty: 1 }; }

function total() { return state.items.reduce((a, i) => a + (parseInt(i.qty, 10) || 0) * B.price, 0); }

function render() {
  const app = $('#app');
  if (!B.open) {
    app.innerHTML = '<section class="panel"><h1>T-shirt orders are closed</h1><p class="lede">We are not taking pack T-shirt orders right now. Watch BAND for the next order window, or email <a href="mailto:' + esc(B.contact) + '">' + esc(B.contact) + '</a> with questions.</p></section>';
    return;
  }
  app.innerHTML = `
  <section class="panel">
    <div class="stack">
      <p class="eyebrow">${esc(B.pack)}</p>
      <h1>Order pack T-shirts</h1>
      <p class="lede">${esc(B.label)}s are <b>${money(B.price)}</b> each. Order by <b>${esc(B.deadlineText)}</b>.${B.pickup ? ' ' + esc(B.pickup) : ''}</p>
    </div>

    <div class="stack">
      <h2>Your info</h2>
      <div class="grid3">
        <label class="f"><span>Your name <span class="req">*</span></span><input type="text" id="pname" autocomplete="name" value="${esc(state.parent.name)}"></label>
        <label class="f"><span>Email <span class="req">*</span></span><input type="email" id="pemail" autocomplete="email" value="${esc(state.parent.email)}"></label>
        <label class="f"><span>Cell <span class="req">*</span></span><input type="tel" id="pcell" autocomplete="tel" value="${esc(state.parent.cell)}"></label>
      </div>
    </div>

    <div class="stack">
      <h2>Shirts</h2>
      <p class="muted">One line per scout and size. Ordering two sizes for the same scout? Use "+ Add another shirt" and the scout's name carries over.</p>
      <div class="stack" id="lines">${state.items.map(line).join('')}</div>
      <div><button type="button" class="btn ghost small" id="add">+ Add another shirt</button></div>
    </div>

    <div class="big-total"><span>Total to send by Zelle</span><strong id="tot">${money(total())}</strong></div>

    <div class="callout">
      <h3>Pay by Zelle</h3>
      <p>Send <b id="tot2">${money(total())}</b> to</p>
      <div class="copyline"><code>${esc(B.zelle)}</code> <button type="button" class="linkbtn" id="copy">Copy</button></div>
      <p class="muted">Put the scout's name in the Zelle memo. Then enter the confirmation number below.</p>
    </div>
    <div class="grid2">
      <label class="f"><span>Name on the Zelle account <span class="req">*</span></span><input type="text" id="zname" value="${esc(state.zelleName)}"></label>
      <label class="f"><span>Zelle confirmation number <span class="req">*</span></span><input type="text" id="zref" value="${esc(state.ref)}"></label>
    </div>

    ${state.error ? '<p class="errmsg" role="alert">' + esc(state.error) + '</p>' : ''}
    <div class="btnrow"><span class="muted">Questions? <a href="mailto:${esc(B.contact)}">${esc(B.contact)}</a></span>
      <button type="button" class="btn" id="send" ${state.sending ? 'disabled' : ''}>${state.sending ? 'Sending…' : 'Place order'}</button></div>
  </section>`;
  bind();
}

function line(i, n) {
  const sizes = B.sizes.map(s => `<option ${s === i.size ? 'selected' : ''}>${esc(s)}</option>`).join('');
  const fits = B.fits.map(f => `<option ${f === i.fit ? 'selected' : ''}>${esc(f)}</option>`).join('');
  return `<div class="shirtline" data-n="${n}">
    <header><span class="eyebrow">Shirt ${n + 1}</span>${state.items.length > 1 ? `<button type="button" class="linkbtn" data-rm="${n}">Remove</button>` : ''}</header>
    <label class="f"><span>Scout first name <span class="req">*</span></span><input type="text" data-k="first" value="${esc(i.first)}"></label>
    <label class="f"><span>Scout last name <span class="req">*</span></span><input type="text" data-k="last" value="${esc(i.last)}"></label>
    <label class="f"><span>Den or grade <span class="req">*</span></span><input type="text" data-k="den" placeholder="e.g. Wolf or 2nd" value="${esc(i.den)}"></label>
    <div class="sub">
      <label class="f"><span>Fit</span><select data-k="fit">${fits}</select></label>
      <label class="f"><span>Size <span class="req">*</span></span><select data-k="size"><option value="">Choose…</option>${sizes}</select></label>
      <label class="f"><span>How many</span><input type="number" min="1" max="20" data-k="qty" value="${esc(i.qty)}"></label>
    </div>
    ${i.size === 'Other' ? `<label class="f other"><span>Describe the size <span class="req">*</span></span><input type="text" data-k="other" value="${esc(i.other)}"></label>` : ''}
    <div class="linetot">${money((parseInt(i.qty, 10) || 0) * B.price)}</div>
  </div>`;
}

function bind() {
  const map = { pname: v => state.parent.name = v, pemail: v => state.parent.email = v, pcell: v => state.parent.cell = v, zname: v => state.zelleName = v, zref: v => state.ref = v };
  Object.keys(map).forEach(id => $('#' + id).addEventListener('input', e => map[id](e.target.value)));
  document.querySelectorAll('.shirtline').forEach(el => {
    const n = +el.dataset.n;
    el.querySelectorAll('[data-k]').forEach(inp => {
      const ev = inp.tagName === 'SELECT' ? 'change' : 'input';
      inp.addEventListener(ev, () => {
        state.items[n][inp.dataset.k] = inp.value;
        if (inp.dataset.k === 'size') render();
        if (inp.dataset.k === 'qty') { el.querySelector('.linetot').textContent = money((parseInt(inp.value, 10) || 0) * B.price); $('#tot').textContent = $('#tot2').textContent = money(total()); }
      });
    });
  });
  document.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { state.items.splice(+b.dataset.rm, 1); render(); }));
  $('#add').addEventListener('click', () => { state.error = ''; state.items.push(blank(state.items[state.items.length - 1])); render(); });
  $('#copy').addEventListener('click', () => { try { navigator.clipboard.writeText(B.zelle); } catch (e) {} });
  $('#send').addEventListener('click', send);
}

function problems() {
  const p = [];
  if (!state.parent.name.trim()) p.push('your name');
  if (!/^\S+@\S+\.\S+$/.test(state.parent.email.trim())) p.push('a valid email');
  if (state.parent.cell.replace(/\D/g, '').length < 10) p.push('a 10-digit cell number');
  state.items.forEach((i, n) => {
    if (!i.first.trim() || !i.last.trim()) p.push('the scout name on shirt ' + (n + 1));
    if (!i.den.trim()) p.push('the den or grade on shirt ' + (n + 1));
    if (!i.size || (i.size === 'Other' && !i.other.trim())) p.push('the size on shirt ' + (n + 1));
    if (!(parseInt(i.qty, 10) >= 1)) p.push('how many on shirt ' + (n + 1));
  });
  if (!state.zelleName.trim()) p.push('the name on the Zelle account');
  if (!state.ref.trim()) p.push('the Zelle confirmation number');
  return p;
}

function send() {
  const p = problems();
  if (p.length) { state.error = 'Please add ' + p.join(', ') + '.'; render(); return; }
  state.error = ''; state.sending = true; render();
  apiPost('shirts', { parent: state.parent, items: state.items, zelleName: state.zelleName, ref: state.ref })
    .then(r => { done(r); toTop(); })
    .catch(err => { state.sending = false; state.error = (err && err.message) || String(err); render(); });
}

function done(r) {
  $('#app').innerHTML = `<section class="panel">
    <div class="callout ok"><h3>Order received</h3><p>Your order number is <b class="mono">${esc(r.id)}</b>. Total ${money(r.total)}.</p></div>
    <table class="fees"><tbody>${state.items.map(i => `<tr><td>${esc(i.first + ' ' + i.last)} <span class="desc">${esc(i.den)}</span></td><td>${esc(i.qty)} × ${esc(i.fit)} ${esc(i.size === 'Other' ? 'Other: ' + i.other : i.size)}</td></tr>`).join('')}</tbody></table>
    <p>We emailed a confirmation to <b>${esc(state.parent.email)}</b>.${B.pickup ? ' ' + esc(B.pickup) : ''}</p>
    <div><button type="button" class="btn ghost" id="again">Place another order</button></div>
  </section>`;
  $('#again').addEventListener('click', () => { state.items = [blank()]; state.zelleName = ''; state.ref = ''; state.sending = false; render(); });
}

document.getElementById("app").innerHTML = '<div class="loading">Loading the T-shirt order form…</div>';
if (!/^https:\/\/script\.google\.com\//.test(API)) loadFailed("The T-shirt order form isn't connected yet.");
else apiGet("shirts").then(function (b) { B = b; state.items = [blank()]; render(); })
  .catch(function () { loadFailed("We couldn't reach the T-shirt order form."); });

})();
