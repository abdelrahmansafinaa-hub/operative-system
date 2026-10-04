/* =====================================================================
   Operative System — الواجهة
   ===================================================================== */
(() => {
'use strict';

// ---------------- ثوابت ----------------
const STATUS = {
  new:              { label: 'جديد',            color: 'gray'   },
  processing:       { label: 'جاري التجهيز',     color: 'blue'   },
  shipped:          { label: 'اتسلّم لشركة الشحن', color: 'indigo' },
  out_for_delivery: { label: 'خرج للتوصيل',      color: 'amber'  },
  delivered:        { label: 'تم التسليم',       color: 'green'  },
  returned:         { label: 'مرتجع',            color: 'red'    },
  cancelled:        { label: 'ملغي',             color: 'muted'  },
};
const GOVS = ['القاهرة','الجيزة','الإسكندرية','القليوبية','الشرقية','الدقهلية','الغربية','المنوفية',
  'البحيرة','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الفيوم','بني سويف','المنيا',
  'أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مطروح','شمال سيناء','جنوب سيناء'];
const PAGE = 50;

// ---------------- أدوات ----------------
const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => (v ?? '').toString().replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const money = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const egp = n => `<span class="ltr">${money(n)}</span> ج`;
const dt = d => d ? new Date(d).toLocaleDateString('en-GB') : '';
const dtt = d => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const badge = s => { const x = STATUS[s] || { label: s, color: 'gray' }; return `<span class="badge b-${x.color}">${esc(x.label)}</span>`; };
const signed = n => `<span class="num ltr ${n > 0 ? 'pos' : n < 0 ? 'neg' : ''}">${money(n)}</span>`;
const opt = (v, l, sel) => `<option value="${esc(v)}" ${String(sel ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
const statusOptions = (sel, withAll) => (withAll ? opt('', 'كل الحالات', sel) : '') +
  Object.entries(STATUS).map(([k, v]) => opt(k, v.label, sel)).join('');
const govOptions = sel => opt('', '— اختار —', sel) + GOVS.map(g => opt(g, g, sel)).join('');
const orderNo = o => `#${o.order_no}`;

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3800);
}
function errMsg(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'الإيميل أو الباسورد غلط';
  if (/already registered|already been registered/i.test(m)) return 'الإيميل ده عليه حساب بالفعل';
  if (/Password should be/i.test(m)) return 'الباسورد لازم يكون 6 حروف أو أرقام على الأقل';
  if (/duplicate key.*login_email/i.test(m)) return 'إيميل الدخول ده مستخدم لعميل تاني';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'مفيش اتصال بالسيرفر — اتأكد من النت';
  if (/rate limit/i.test(m)) return 'محاولات كتير ورا بعض — استنى دقيقة وجرب تاني';
  return m;
}
function fail(e) { console.error(e); toast(errMsg(e), 'err'); }
function formValues(form) {
  const o = {};
  $$('[name]', form).forEach(el => {
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else o[el.name] = el.value.trim();
  });
  return o;
}
const nz = v => (v === '' || v == null) ? null : v;

function periodRange(p) {
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
  switch (p) {
    case 'today': { const s = new Date(now); s.setHours(0, 0, 0, 0); return [s, null]; }
    case '7d':    return [new Date(Date.now() - 7 * 864e5), null];
    case 'month': return [new Date(y, m, 1), null];
    case 'last':  return [new Date(y, m - 1, 1), new Date(y, m, 1)];
    default:      return [null, null];
  }
}
const periodSelect = (id, sel = 'month') => `<select id="${id}">
  ${opt('today', 'النهارده', sel)}${opt('7d', 'آخر 7 أيام', sel)}${opt('month', 'الشهر ده', sel)}
  ${opt('last', 'الشهر اللي فات', sel)}${opt('all', 'كل الفترات', sel)}</select>`;

// ---------------- Modal ----------------
function modal({ title, body, footer = '', wide = false }) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog">
    <div class="modal-h"><h3>${title}</h3><button class="x" aria-label="إغلاق">&times;</button></div>
    <div class="modal-b">${body}</div>${footer ? `<div class="modal-f">${footer}</div>` : ''}</div>`;
  const close = () => bg.remove();
  $('.x', bg).onclick = close;
  bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
  $('#modals').appendChild(bg);
  const first = $('input:not([type=checkbox]):not(:disabled),select:not(:disabled)', bg);
  if (first) setTimeout(() => first.focus(), 30);
  return { el: bg, close };
}
function confirmBox(text, okLabel = 'تأكيد', danger = false) {
  return new Promise(res => {
    const m = modal({ title: 'تأكيد', body: `<p style="margin:0">${text}</p>`,
      footer: `<button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${okLabel}</button><button class="btn" data-no>رجوع</button>` });
    $('[data-ok]', m.el).onclick = () => { m.close(); res(true); };
    $('[data-no]', m.el).onclick = () => { m.close(); res(false); };
  });
}
async function busy(btn, fn) {
  const t = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'جاري...';
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = t; }
}

// ---------------- Supabase ----------------
const cfg = window.OPERATIVE_CONFIG || {};
const configured = cfg.SUPABASE_URL && !/YOUR-PROJECT/.test(cfg.SUPABASE_URL) && cfg.SUPABASE_ANON_KEY && !/YOUR-ANON/.test(cfg.SUPABASE_ANON_KEY);
const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
const S = { user: null, profile: null, isAdmin: false, clients: [], myClient: null };
const clientName = id => (S.clients.find(c => c.id === id) || {}).name || '';
const clientSelect = (id, allLabel, sel = '') =>
  `<select id="${id}">${allLabel ? opt('', allLabel, sel) : ''}${S.clients.map(c => opt(c.id, c.name, sel)).join('')}</select>`;

// ---------------- Icons ----------------
const ICON = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  clients: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M16 4a4 4 0 010 8M22 21c0-3-2-5-4-5.6"/></svg>',
  settlements: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
};

// =====================================================================
//  الدخول
// =====================================================================
function renderSetupNeeded() {
  $('#root').innerHTML = `<div class="login"><div class="box"><h2>Operative</h2>
    <p>السيستم لسه محتاج يتربط بقاعدة البيانات.</p>
    <div class="alert">افتح ملف <b class="ltr">config.js</b> وحط فيه رابط ومفتاح مشروع Supabase.</div></div></div>`;
}

function renderLogin(msg = '') {
  $('#modals').innerHTML = '';
  $('#root').innerHTML = `<div class="login"><form class="box" id="loginForm">
    <h2>Operative</h2><p>تسجيل الدخول للسيستم</p>
    <div class="grid">
      <label class="f"><span>الإيميل</span><input name="email" type="email" required autocomplete="username" dir="ltr"></label>
      <label class="f"><span>الباسورد</span><input name="password" type="password" required autocomplete="current-password" dir="ltr"></label>
      <div class="err" id="loginErr">${esc(msg)}</div>
      <button class="btn primary" style="justify-content:center;padding:10px">دخول</button>
    </div></form></div>`;
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const f = formValues(e.target); const btn = $('button', e.target);
    await busy(btn, async () => {
      const { data, error } = await sb.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) { $('#loginErr').textContent = errMsg(error); return; }
      await start(data.user);
    });
  };
}

async function logout() { await sb.auth.signOut(); S.user = null; location.hash = ''; renderLogin(); }

async function start(user) {
  S.user = user;
  const { data: p, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) return renderLogin(errMsg(error));
  if (!p || (p.role !== 'admin' && !p.client_id)) {
    await sb.auth.signOut();
    return renderLogin('الحساب ده لسه مش مربوط بعميل — كلّم إدارة Operative');
  }
  S.profile = p; S.isAdmin = p.role === 'admin';
  if (S.isAdmin) await loadClients();
  else {
    const { data } = await sb.from('clients').select('*').eq('id', p.client_id).single();
    S.myClient = data; S.clients = data ? [data] : [];
  }
  renderShell(); route();
}

async function loadClients() {
  const { data, error } = await sb.from('clients').select('*').order('name');
  if (error) return fail(error);
  S.clients = data || [];
}

// =====================================================================
//  الهيكل والتنقل
// =====================================================================
const NAV_ADMIN = [['dashboard', 'لوحة التحكم'], ['orders', 'الأوردرات'], ['clients', 'العملاء'], ['settlements', 'التسويات']];
const NAV_CLIENT = [['dashboard', 'لوحة التحكم'], ['orders', 'أوردراتي'], ['settlements', 'التسويات']];

function renderShell() {
  const nav = S.isAdmin ? NAV_ADMIN : NAV_CLIENT;
  $('#root').innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="brand"><b>Operative</b><div>${S.isAdmin ? 'لوحة إدارة الشركة' : esc(S.myClient?.name || '')}</div></div>
      <nav class="nav">${nav.map(([k, l]) => `<a href="#/${k}" data-k="${k}">${ICON[k]}<span>${l}</span></a>`).join('')}</nav>
      <div class="userbox"><div class="who ltr">${esc(S.user.email)}</div><button id="logoutBtn">خروج</button></div>
    </aside>
    <div class="main"><div class="topbar"><h1 id="pageTitle"></h1><div id="pageActions" style="display:flex;gap:8px;flex-wrap:wrap"></div></div>
    <section class="view" id="view"></section></div></div>`;
  $('#logoutBtn').onclick = logout;
}

function route() {
  if (!S.user) return;
  const nav = S.isAdmin ? NAV_ADMIN : NAV_CLIENT;
  let page = (location.hash.match(/^#\/(\w+)/) || [])[1];
  if (!nav.some(([k]) => k === page)) page = 'dashboard';
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.k === page));
  $('#pageActions').innerHTML = '';
  $('#view').innerHTML = '<div class="empty">جاري التحميل...</div>';
  ({ dashboard: viewDashboard, orders: viewOrders, clients: viewClients, settlements: viewSettlements })[page]();
}
window.addEventListener('hashchange', route);
const setTitle = t => { $('#pageTitle').textContent = t; document.title = `${t} — Operative`; };

// =====================================================================
//  لوحة التحكم
// =====================================================================
async function viewDashboard() {
  setTitle('لوحة التحكم');
  $('#view').innerHTML = `<div class="toolbar">${periodSelect('dPeriod')}
    ${S.isAdmin ? clientSelect('dClient', 'كل العملاء') : ''}</div>
    <div class="cards" id="dCards"></div><div id="dExtra"></div>`;
  const load = async () => {
    const [from, to] = periodRange($('#dPeriod').value);
    const client = S.isAdmin ? nz($('#dClient').value) : S.profile.client_id;
    const [a, b] = await Promise.all([
      sb.rpc('dashboard_stats', { p_from: from, p_to: to, p_client: client }),
      sb.rpc('dashboard_stats', { p_client: client }),
    ]);
    if (a.error) return fail(a.error);
    const s = a.data, all = b.data || {};
    const closed = s.delivered + s.returned;
    const rate = closed ? Math.round(s.delivered * 100 / closed) : 0;
    const cards = [
      ['إجمالي الأوردرات', s.total], ['تحت التجهيز', s.new], ['في الطريق', s.in_transit, 'indigo'],
      ['تم التسليم', s.delivered, 'green'], ['مرتجع', s.returned, 'red'], ['نسبة التسليم', `${rate}%`],
      ['تحصيل متوقع (أوردرات مفتوحة)', egp(s.cod_pending)], ['المحصّل', egp(s.collected), 'green'],
      [S.isAdmin ? 'إيرادات الشركة' : 'إجمالي الرسوم', egp(s.fees)],
      [S.isAdmin ? 'مستحق للعملاء (لسه متسوّاش)' : 'رصيدك المستحق (لسه متسوّاش)', egp(all.unsettled_net), 'primary'],
    ];
    $('#dCards').innerHTML = cards.map(([l, v, c]) =>
      `<div class="card ${c || ''}"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
  };
  $('#dPeriod').onchange = load;
  if (S.isAdmin) $('#dClient').onchange = load;
  await load();

  if (S.isAdmin) {
    const { data, error } = await sb.rpc('clients_summary');
    if (error) return fail(error);
    $('#dExtra').innerHTML = `<div class="panel"><div class="panel-h">ملخص العملاء (كل الفترات)</div><div class="table-wrap">
      <table class="t"><thead><tr><th>العميل</th><th>الأوردرات</th><th>في الطريق</th><th>تم التسليم</th><th>مرتجع</th>
      <th>نسبة التسليم</th><th>المحصّل</th><th>مستحق غير مسوّى</th></tr></thead><tbody>
      ${(data || []).map(r => { const c = +r.delivered + +r.returned;
        return `<tr><td><b>${esc(r.name)}</b></td><td class="num">${r.total}</td><td class="num">${r.in_transit}</td>
        <td class="num">${r.delivered}</td><td class="num">${r.returned}</td><td class="num">${c ? Math.round(r.delivered * 100 / c) : 0}%</td>
        <td class="num">${money(r.collected)}</td><td>${signed(r.unsettled_net)}</td></tr>`; }).join('')
        || '<tr><td colspan="8" class="empty">لسه مفيش عملاء — ابدأ من صفحة العملاء</td></tr>'}
      </tbody></table></div></div>`;
  } else {
    const c = S.myClient || {};
    const { data: rates } = await sb.from('client_shipping_rates').select('*').eq('client_id', c.id).order('governorate');
    $('#dExtra').innerHTML = `<div class="panel"><div class="panel-h">أسعار الخدمة الخاصة بيك</div><div class="panel-b">
      <dl class="kv"><dt>التجهيز والتغليف</dt><dd>${egp(c.fulfillment_fee)} / أوردر</dd>
      <dt>عمولة التحصيل</dt><dd>${money(c.cod_fee_percent)}% من المبلغ المحصّل</dd>
      <dt>المرتجع (أساسي)</dt><dd>${egp(c.return_fee)}</dd>
      <dt>الشحن (أساسي)</dt><dd>${egp(c.default_shipping_fee)}</dd></dl>
      ${rates && rates.length ? `<div class="section-title">الأسعار حسب المحافظة</div>
        <div class="table-wrap"><table class="t"><thead><tr><th>المحافظة</th><th>الشحن</th><th>المرتجع</th></tr></thead><tbody>
        ${rates.map(r => `<tr><td>${esc(r.governorate)}</td><td>${egp(r.price ?? c.default_shipping_fee)}</td><td>${egp(r.return_price ?? c.return_fee)}</td></tr>`).join('')}
        </tbody></table></div>` : ''}
    </div></div>`;
  }
}

// =====================================================================
//  الأوردرات
// =====================================================================
const OF = { q: '', status: '', client: '', page: 0 };
let selected = new Set();

function ordersQuery(select = '*', withCount = true) {
  let q = sb.from('orders').select(select, withCount ? { count: 'exact' } : undefined).order('created_at', { ascending: false });
  if (OF.status) q = q.eq('status', OF.status);
  if (OF.client) q = q.eq('client_id', OF.client);
  const t = OF.q.replace(/[,()*%"\\]/g, ' ').trim();
  if (t) {
    const parts = ['customer_name', 'customer_phone', 'qp_tracking', 'client_ref'].map(c => `${c}.ilike."*${t}*"`);
    const n = t.replace(/^#/, '');
    if (/^\d+$/.test(n) && n.length < 10) parts.push(`order_no.eq.${n}`);
    q = q.or(parts.join(','));
  }
  return q;
}

async function viewOrders() {
  setTitle(S.isAdmin ? 'الأوردرات' : 'أوردراتي');
  $('#pageActions').innerHTML = `<button class="btn" id="exportBtn">تصدير Excel</button>
    <button class="btn primary" id="addOrderBtn">+ أوردر جديد</button>`;
  $('#addOrderBtn').onclick = () => openOrder(null);
  $('#exportBtn').onclick = e => busy(e.currentTarget, exportOrders);
  selected = new Set();
  $('#view').innerHTML = `<div class="toolbar">
      <input class="grow" id="oQ" placeholder="بحث: اسم، موبايل، رقم أوردر، رقم تتبع" value="${esc(OF.q)}">
      <select id="oStatus">${statusOptions(OF.status, true)}</select>
      ${S.isAdmin ? clientSelect('oClient', 'كل العملاء', OF.client) : ''}
    </div><div id="bulk"></div><div class="panel" id="oPanel"></div>`;
  let timer;
  $('#oQ').oninput = e => { clearTimeout(timer); timer = setTimeout(() => { OF.q = e.target.value; OF.page = 0; loadOrders(); }, 350); };
  $('#oStatus').onchange = e => { OF.status = e.target.value; OF.page = 0; loadOrders(); };
  if (S.isAdmin) $('#oClient').onchange = e => { OF.client = e.target.value; OF.page = 0; loadOrders(); };
  await loadOrders();
}

async function loadOrders() {
  const from = OF.page * PAGE;
  const { data, count, error } = await ordersQuery().range(from, from + PAGE - 1);
  if (error) return fail(error);
  const rows = data || [];
  const A = S.isAdmin;
  $('#oPanel').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr>
    ${A ? '<th class="w1"><input type="checkbox" id="selAll"></th>' : ''}
    <th>رقم</th>${A ? '<th>العميل</th>' : ''}<th>المستلم</th><th>المحافظة</th><th>التحصيل</th><th>الحالة</th>
    <th>رقم التتبع</th><th>التاريخ</th></tr></thead><tbody>
    ${rows.map(o => `<tr class="click ${selected.has(o.id) ? 'selected' : ''}" data-id="${o.id}">
      ${A ? `<td><input type="checkbox" class="sel" ${selected.has(o.id) ? 'checked' : ''}></td>` : ''}
      <td class="num"><b>${orderNo(o)}</b>${o.client_ref ? `<div class="muted small">${esc(o.client_ref)}</div>` : ''}</td>
      ${A ? `<td>${esc(clientName(o.client_id))}</td>` : ''}
      <td>${esc(o.customer_name)}<div class="muted small"><span class="ltr">${esc(o.customer_phone)}</span></div></td>
      <td>${esc(o.governorate)}<div class="muted small">${esc(o.city || '')}</div></td>
      <td class="num">${money(o.cod_amount)}</td><td>${badge(o.status)}</td>
      <td class="small"><span class="ltr">${esc(o.qp_tracking || '')}</span></td><td class="num small">${dt(o.created_at)}</td></tr>`).join('')
      || `<tr><td colspan="9" class="empty">مفيش أوردرات${OF.q || OF.status || OF.client ? ' بالفلتر ده' : ' لسه'}</td></tr>`}
    </tbody></table></div>
    <div class="pager"><span>${count ? `${from + 1}–${from + rows.length} من ${count}` : ''}</span>
      <span><button class="btn sm" id="pgPrev" ${OF.page === 0 ? 'disabled' : ''}>السابق</button>
      <button class="btn sm" id="pgNext" ${from + rows.length >= (count || 0) ? 'disabled' : ''}>التالي</button></span></div>`;
  $('#pgPrev').onclick = () => { OF.page--; loadOrders(); };
  $('#pgNext').onclick = () => { OF.page++; loadOrders(); };
  $$('#oPanel tbody tr[data-id]').forEach(tr => {
    tr.onclick = e => {
      if (e.target.closest('.sel')) return;
      const o = rows.find(r => r.id === tr.dataset.id); openOrder(o);
    };
    const cb = $('.sel', tr);
    if (cb) cb.onchange = () => { cb.checked ? selected.add(tr.dataset.id) : selected.delete(tr.dataset.id); tr.classList.toggle('selected', cb.checked); renderBulk(); };
  });
  const all = $('#selAll');
  if (all) all.onchange = () => { $$('#oPanel .sel').forEach(cb => { cb.checked = all.checked; cb.onchange(); }); };
  renderBulk();
}

function renderBulk() {
  const el = $('#bulk'); if (!el) return;
  if (!S.isAdmin || !selected.size) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="bulkbar"><b>${selected.size} أوردر متحدد</b>
    <span>غيّر الحالة إلى:</span><select id="bulkStatus">${statusOptions('shipped')}</select>
    <button class="btn primary sm" id="bulkApply">تطبيق</button>
    <button class="btn ghost sm" id="bulkClear">إلغاء التحديد</button></div>`;
  $('#bulkClear').onclick = () => { selected.clear(); loadOrders(); };
  $('#bulkApply').onclick = e => busy(e.currentTarget, async () => {
    const st = $('#bulkStatus').value;
    const { error } = await sb.from('orders').update({ status: st }).in('id', [...selected]);
    if (error) return fail(error);
    toast(`اتغيّرت حالة ${selected.size} أوردر`, 'ok'); selected.clear(); loadOrders();
  });
}

async function exportOrders() {
  const { data, error } = await ordersQuery('*', false).range(0, 9999);
  if (error) return fail(error);
  const cols = [['order_no', 'رقم الأوردر'], ['client', 'العميل'], ['client_ref', 'رقم العميل'], ['customer_name', 'المستلم'],
    ['customer_phone', 'موبايل'], ['customer_phone2', 'موبايل 2'], ['governorate', 'المحافظة'], ['city', 'المنطقة'],
    ['address', 'العنوان'], ['items', 'المحتوى'], ['pieces', 'القطع'], ['cod_amount', 'التحصيل'], ['allow_open', 'مسموح بالفتح'],
    ['notes', 'ملاحظات'], ['status', 'الحالة'], ['qp_tracking', 'رقم التتبع'], ['collected_amount', 'المحصّل'],
    ['shipping_fee', 'الشحن'], ['fulfillment_fee', 'التجهيز'], ['cod_fee', 'عمولة التحصيل'], ['return_fee', 'رسوم المرتجع'],
    ['net_amount', 'الصافي'], ['created_at', 'التاريخ']];
  const val = (o, k) => k === 'client' ? clientName(o.client_id) : k === 'status' ? STATUS[o.status]?.label
    : k === 'allow_open' ? (o.allow_open ? 'نعم' : 'لا') : k === 'created_at' ? dtt(o.created_at) : o[k];
  const csv = [cols.map(c => c[1]), ...(data || []).map(o => cols.map(([k]) => val(o, k)))]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}

async function openOrder(o) {
  const isNew = !o; o = o || { pieces: 1, allow_open: false, status: 'new' };
  const A = S.isAdmin;
  const editable = A || isNew || o.status === 'new';
  const dis = editable ? '' : 'disabled';
  const body = `<form id="orderForm" class="grid g2">
    ${A ? `<label class="f span-all"><span>العميل *</span><select name="client_id" required ${isNew ? '' : 'disabled'}>
      ${opt('', '— اختار العميل —', o.client_id)}${S.clients.filter(c => c.active || c.id === o.client_id).map(c => opt(c.id, c.name, o.client_id)).join('')}</select></label>` : ''}
    <label class="f"><span>اسم المستلم *</span><input name="customer_name" required value="${esc(o.customer_name)}" ${dis}></label>
    <label class="f"><span>رقم الأوردر عندك</span><input name="client_ref" value="${esc(o.client_ref)}" ${dis}></label>
    <label class="f"><span>الموبايل *</span><input name="customer_phone" required inputmode="tel" dir="ltr" value="${esc(o.customer_phone)}" ${dis}></label>
    <label class="f"><span>موبايل تاني</span><input name="customer_phone2" inputmode="tel" dir="ltr" value="${esc(o.customer_phone2)}" ${dis}></label>
    <label class="f"><span>المحافظة *</span><select name="governorate" required ${dis}>${govOptions(o.governorate)}</select></label>
    <label class="f"><span>المنطقة / المدينة</span><input name="city" value="${esc(o.city)}" ${dis}></label>
    <label class="f span-all"><span>العنوان بالتفصيل *</span><input name="address" required value="${esc(o.address)}" ${dis}></label>
    <label class="f"><span>المحتوى</span><input name="items" value="${esc(o.items)}" ${dis}></label>
    <div class="grid g2"><label class="f"><span>عدد القطع</span><input name="pieces" type="number" min="1" value="${esc(o.pieces)}" ${dis}></label>
      <label class="f"><span>المطلوب تحصيله *</span><input name="cod_amount" type="number" min="0" step="0.01" required value="${esc(o.cod_amount)}" ${dis}></label></div>
    <label class="f span-all"><span>ملاحظات</span><input name="notes" value="${esc(o.notes)}" ${dis}></label>
    <label class="chk span-all"><input type="checkbox" name="allow_open" ${o.allow_open ? 'checked' : ''} ${dis}> مسموح للعميل يفتح الشحنة</label>
    ${A && !isNew ? `<div class="section-title span-all">الشحن والتحصيل</div>
      <label class="f"><span>الحالة</span><select name="status">${statusOptions(o.status)}</select></label>
      <label class="f"><span>رقم التتبع (QP)</span><input name="qp_tracking" dir="ltr" value="${esc(o.qp_tracking)}"></label>
      <label class="f"><span>حالة الشحنة عند QP</span><input name="qp_status" value="${esc(o.qp_status)}"></label>
      <label class="f"><span>المبلغ المحصّل <span class="hint">(لو فاضي = المطلوب)</span></span><input name="collected_amount" type="number" step="0.01" value="${esc(o.collected_amount)}"></label>
      <div class="section-title span-all">الرسوم <span class="hint">— بتتحسب تلقائي من أسعار العميل، وتقدر تعدّلها هنا</span></div>
      <div class="grid g4 span-all">
        <label class="f"><span>الشحن</span><input name="shipping_fee" type="number" step="0.01" value="${esc(o.shipping_fee)}"></label>
        <label class="f"><span>التجهيز</span><input name="fulfillment_fee" type="number" step="0.01" value="${esc(o.fulfillment_fee)}"></label>
        <label class="f"><span>عمولة التحصيل</span><input name="cod_fee" type="number" step="0.01" value="${esc(o.cod_fee)}"></label>
        <label class="f"><span>رسوم المرتجع</span><input name="return_fee" type="number" step="0.01" value="${esc(o.return_fee)}"></label>
      </div>` : ''}
    ${!isNew ? `<div class="section-title span-all">متابعة الأوردر</div>
      <div class="span-all grid g2"><div><ul class="timeline" id="oEvents"><li class="muted">...</li></ul></div>
      <dl class="kv small"><dt>الحالة</dt><dd>${badge(o.status)}</dd>
        ${o.qp_tracking ? `<dt>رقم التتبع</dt><dd><span class="ltr">${esc(o.qp_tracking)}</span></dd>` : ''}
        ${o.qp_status ? `<dt>عند شركة الشحن</dt><dd>${esc(o.qp_status)}</dd>` : ''}
        <dt>الشحن + التجهيز</dt><dd>${egp(+o.shipping_fee + +o.fulfillment_fee)}</dd>
        ${['delivered', 'returned'].includes(o.status) ? `<dt>الصافي</dt><dd>${signed(o.net_amount)} ج</dd>` : ''}
        <dt>التسوية</dt><dd>${o.settlement_id ? 'اتسوّى' : 'لسه'}</dd></dl></div>` : ''}
  </form>`;
  const footer = `${editable ? `<button class="btn primary" id="oSave">${isNew ? 'إضافة الأوردر' : 'حفظ'}</button>` : ''}
    <span class="spacer"></span>
    ${!isNew && !A && o.status === 'new' ? '<button class="btn danger" id="oCancel">إلغاء الأوردر</button>' : ''}
    ${!isNew && A && !o.settlement_id ? '<button class="btn danger" id="oDelete">حذف</button>' : ''}`;
  const m = modal({ title: isNew ? 'أوردر جديد' : `أوردر ${orderNo(o)}${A ? ' — ' + esc(clientName(o.client_id)) : ''}`, body, footer, wide: true });

  if (!isNew) {
    sb.from('order_events').select('*').eq('order_id', o.id).order('created_at').then(({ data }) => {
      const el = $('#oEvents', m.el); if (!el) return;
      el.innerHTML = (data || []).map(e => `<li>${badge(e.status)}<span class="muted num">${dtt(e.created_at)}</span></li>`).join('') || '<li class="muted">—</li>';
    });
  }

  const save = $('#oSave', m.el);
  if (save) save.onclick = () => {
    const form = $('#orderForm', m.el);
    if (!form.reportValidity()) return;
    const f = formValues(form);
    const phone = f.customer_phone.replace(/\s|-/g, '');
    if (!/^\+?\d{10,13}$/.test(phone)) return toast('رقم الموبايل مش مظبوط', 'err');
    const rec = {
      client_ref: nz(f.client_ref), customer_name: f.customer_name, customer_phone: phone,
      customer_phone2: nz(f.customer_phone2.replace(/\s|-/g, '')), governorate: f.governorate, city: nz(f.city),
      address: f.address, items: nz(f.items), pieces: parseInt(f.pieces) || 1, cod_amount: num(f.cod_amount),
      allow_open: f.allow_open, notes: nz(f.notes),
    };
    if (A && !isNew) Object.assign(rec, {
      status: f.status, qp_tracking: nz(f.qp_tracking), qp_status: nz(f.qp_status),
      collected_amount: num(f.collected_amount), shipping_fee: num(f.shipping_fee), fulfillment_fee: num(f.fulfillment_fee),
      cod_fee: num(f.cod_fee), return_fee: num(f.return_fee),
    });
    if (isNew) rec.client_id = A ? f.client_id : S.profile.client_id;
    busy(save, async () => {
      const { data, error } = isNew
        ? await sb.from('orders').insert(rec).select().single()
        : await sb.from('orders').update(rec).eq('id', o.id).select().single();
      if (error) return fail(error);
      toast(isNew ? `اتضاف الأوردر ${orderNo(data)}` : 'اتحفظ', 'ok'); m.close(); loadOrders();
    });
  };
  const cancel = $('#oCancel', m.el);
  if (cancel) cancel.onclick = async () => {
    if (!await confirmBox('متأكد إنك عايز تلغي الأوردر ده؟', 'إلغاء الأوردر', true)) return;
    const { error } = await sb.from('orders').update({ status: 'cancelled' }).eq('id', o.id);
    if (error) return fail(error);
    toast('اتلغى الأوردر', 'ok'); m.close(); loadOrders();
  };
  const del = $('#oDelete', m.el);
  if (del) del.onclick = async () => {
    if (!await confirmBox(`حذف الأوردر ${orderNo(o)} نهائيًا؟`, 'حذف', true)) return;
    const { error } = await sb.from('orders').delete().eq('id', o.id);
    if (error) return fail(error);
    toast('اتحذف', 'ok'); m.close(); loadOrders();
  };
}

// =====================================================================
//  العملاء (للأدمن)
// =====================================================================
async function viewClients() {
  setTitle('العملاء');
  $('#pageActions').innerHTML = '<button class="btn primary" id="addClientBtn">+ عميل جديد</button>';
  $('#addClientBtn').onclick = () => openClient(null);
  await loadClients();
  const { data: profs } = await sb.from('profiles').select('client_id,email').eq('role', 'client');
  const hasLogin = new Set((profs || []).map(p => p.client_id).filter(Boolean));
  $('#view').innerHTML = `<div class="panel"><div class="table-wrap"><table class="t"><thead><tr>
    <th>كود</th><th>البراند</th><th>المسؤول</th><th>الموبايل</th><th>التجهيز</th><th>عمولة التحصيل</th>
    <th>المرتجع الأساسي</th><th>الشحن الأساسي</th><th>حساب الدخول</th><th></th></tr></thead><tbody>
    ${S.clients.map(c => `<tr data-id="${c.id}">
      <td class="num muted">${c.code}</td>
      <td><b>${esc(c.name)}</b>${c.active ? '' : ' <span class="badge b-muted">موقوف</span>'}</td>
      <td>${esc(c.contact_name || '')}</td><td><span class="ltr">${esc(c.phone || '')}</span></td>
      <td class="num">${money(c.fulfillment_fee)}</td><td class="num">${money(c.cod_fee_percent)}%</td>
      <td class="num">${money(c.return_fee)}</td><td class="num">${money(c.default_shipping_fee)}</td>
      <td>${hasLogin.has(c.id) ? `<span class="badge b-green">مفعّل</span> <span class="muted small ltr">${esc(c.login_email)}</span>`
        : `<button class="btn sm" data-login>إنشاء حساب</button>`}</td>
      <td><button class="btn sm" data-edit>تعديل</button></td></tr>`).join('')
      || '<tr><td colspan="10" class="empty">لسه مفيش عملاء — دوس "عميل جديد"</td></tr>'}
    </tbody></table></div></div>`;
  $$('#view tr[data-id]').forEach(tr => {
    const c = S.clients.find(x => x.id === tr.dataset.id);
    $('[data-edit]', tr).onclick = () => openClient(c);
    const l = $('[data-login]', tr); if (l) l.onclick = () => openLogin(c);
  });
}

async function openClient(c) {
  const isNew = !c; c = c || { active: true, fulfillment_fee: 0, cod_fee_percent: 0, return_fee: 0, default_shipping_fee: 0 };
  let rates = {};
  if (!isNew) {
    const { data } = await sb.from('client_shipping_rates').select('*').eq('client_id', c.id);
    (data || []).forEach(r => rates[r.governorate] = r);
  }
  const body = `<form id="clientForm">
    <div class="grid g2">
      <label class="f"><span>اسم البراند *</span><input name="name" required value="${esc(c.name)}"></label>
      <label class="f"><span>اسم المسؤول</span><input name="contact_name" value="${esc(c.contact_name)}"></label>
      <label class="f"><span>الموبايل</span><input name="phone" dir="ltr" value="${esc(c.phone)}"></label>
      <label class="f"><span>عنوان الاستلام</span><input name="pickup_address" value="${esc(c.pickup_address)}"></label>
      <label class="f span-all"><span>ملاحظات</span><input name="notes" value="${esc(c.notes)}"></label>
      <label class="chk"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}> العميل شغال</label>
    </div>
    <div class="section-title">الأسعار الخاصة بالعميل (بالجنيه)</div>
    <div class="grid g4">
      <label class="f"><span>التجهيز والتغليف / أوردر</span><input name="fulfillment_fee" type="number" step="0.01" min="0" value="${esc(c.fulfillment_fee)}"></label>
      <label class="f"><span>عمولة التحصيل %</span><input name="cod_fee_percent" type="number" step="0.01" min="0" value="${esc(c.cod_fee_percent)}"></label>
      <label class="f"><span>سعر المرتجع الأساسي</span><input name="return_fee" type="number" step="0.01" min="0" value="${esc(c.return_fee)}"></label>
      <label class="f"><span>سعر الشحن الأساسي</span><input name="default_shipping_fee" type="number" step="0.01" min="0" value="${esc(c.default_shipping_fee)}"></label>
    </div>
    <p class="hint">سعر المرتجع = إجمالي المبلغ اللي بيتخصم من العميل على الأوردر المرتجع.</p>
    <div class="section-title">أسعار كل محافظة <span class="hint">— الخانة الفاضية بتاخد السعر الأساسي</span></div>
    <div class="table-wrap" style="max-height:46vh;overflow:auto;border:1px solid var(--border);border-radius:8px">
    <table class="t rates"><thead><tr><th>المحافظة</th><th>الشحن</th><th>المرتجع</th></tr></thead><tbody>
    ${GOVS.map(g => `<tr data-gov="${esc(g)}"><td>${g}</td>
      <td><input type="number" step="0.01" min="0" class="r-ship" value="${rates[g]?.price ?? ''}" placeholder="${esc(c.default_shipping_fee)}"></td>
      <td><input type="number" step="0.01" min="0" class="r-ret" value="${rates[g]?.return_price ?? ''}" placeholder="${esc(c.return_fee)}"></td></tr>`).join('')}
    </tbody></table></div>
  </form>`;
  const m = modal({ title: isNew ? 'عميل جديد' : `تعديل — ${esc(c.name)}`, body, wide: true,
    footer: `<button class="btn primary" id="cSave">${isNew ? 'إضافة العميل' : 'حفظ'}</button>` });
  $('[name=default_shipping_fee]', m.el).oninput = e => $$('.r-ship', m.el).forEach(i => i.placeholder = e.target.value);
  $('[name=return_fee]', m.el).oninput = e => $$('.r-ret', m.el).forEach(i => i.placeholder = e.target.value);
  $('#cSave', m.el).onclick = e => {
    const form = $('#clientForm', m.el);
    if (!form.reportValidity()) return;
    const f = formValues(form);
    const rec = { name: f.name, contact_name: nz(f.contact_name), phone: nz(f.phone), pickup_address: nz(f.pickup_address),
      notes: nz(f.notes), active: f.active, fulfillment_fee: num(f.fulfillment_fee), cod_fee_percent: num(f.cod_fee_percent),
      return_fee: num(f.return_fee), default_shipping_fee: num(f.default_shipping_fee) };
    busy(e.currentTarget, async () => {
      const res = isNew ? await sb.from('clients').insert(rec).select().single()
                        : await sb.from('clients').update(rec).eq('id', c.id).select().single();
      if (res.error) return fail(res.error);
      const id = res.data.id;
      const newRates = $$('tr[data-gov]', m.el).map(tr => {
        const sp = $('.r-ship', tr).value, rp = $('.r-ret', tr).value;
        return (sp === '' && rp === '') ? null : { client_id: id, governorate: tr.dataset.gov,
          price: sp === '' ? null : num(sp), return_price: rp === '' ? null : num(rp) };
      }).filter(Boolean);
      const d = await sb.from('client_shipping_rates').delete().eq('client_id', id);
      if (d.error) return fail(d.error);
      if (newRates.length) { const r = await sb.from('client_shipping_rates').insert(newRates); if (r.error) return fail(r.error); }
      toast(isNew ? 'اتضاف العميل' : 'اتحفظ', 'ok'); m.close();
      await viewClients();
      if (isNew && await confirmBox(`تحب تعمل حساب دخول لـ <b>${esc(res.data.name)}</b> دلوقتي؟`, 'أيوه، اعمل حساب')) openLogin(res.data);
    });
  };
}

function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let p = ''; const a = crypto.getRandomValues(new Uint32Array(10));
  a.forEach(x => p += chars[x % chars.length]); return p;
}

function openLogin(c) {
  const body = `<div class="alert info">العميل هيدخل بالإيميل والباسورد دول ويشوف أوردراته وتسوياته بس.</div>
    <form id="loginMk" class="grid">
      <label class="f"><span>إيميل الدخول *</span><input name="email" type="email" required dir="ltr" value="${esc(c.login_email)}"></label>
      <label class="f"><span>الباسورد *</span><input name="password" required minlength="6" dir="ltr" value="${genPassword()}"></label>
    </form><div id="loginDone"></div>`;
  const m = modal({ title: `حساب دخول — ${esc(c.name)}`, body, footer: '<button class="btn primary" id="mkBtn">إنشاء الحساب</button>' });
  $('#mkBtn', m.el).onclick = e => {
    const form = $('#loginMk', m.el);
    if (!form.reportValidity()) return;
    const f = formValues(form); const btn = e.currentTarget;
    busy(btn, async () => {
      // 1) نربط الإيميل بالعميل الأول  2) نعمل الحساب — السيرفر بيربطهم تلقائي
      const u = await sb.from('clients').update({ login_email: f.email.toLowerCase() }).eq('id', c.id);
      if (u.error) return fail(u.error);
      const tmp = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'op-tmp' } });
      const { data, error } = await tmp.auth.signUp({ email: f.email.toLowerCase(), password: f.password });
      if (error) return fail(error);
      const needsConfirm = data.user && !data.session;
      const link = location.origin + location.pathname;
      const msg = `أهلًا ${c.contact_name || c.name}،\nده حسابك على سيستم Operative:\nالرابط: ${link}\nالإيميل: ${f.email.toLowerCase()}\nالباسورد: ${f.password}`;
      form.remove(); setTimeout(() => btn.closest('.modal-f')?.remove());
      $('#loginDone', m.el).innerHTML = `<div class="alert ok">اتعمل الحساب ✓</div>
        ${needsConfirm ? '<div class="alert">العميل لازم يفعّل الحساب من الإيميل الأول (أو اقفل تأكيد الإيميل من إعدادات Supabase).</div>' : ''}
        <p class="small muted">ابعت الرسالة دي للعميل:</p><div class="copybox" id="cpy">${esc(msg)}</div>
        <p><button class="btn sm" id="cpyBtn">نسخ الرسالة</button></p>`;
      $('#cpyBtn', m.el).onclick = () => navigator.clipboard.writeText(msg).then(() => toast('اتنسخت', 'ok'));
      viewClients();
    });
  };
}

// =====================================================================
//  التسويات
// =====================================================================
async function viewSettlements() {
  setTitle('التسويات');
  if (S.isAdmin) {
    $('#pageActions').innerHTML = '<button class="btn primary" id="newSetBtn">+ تسوية جديدة</button>';
    $('#newSetBtn').onclick = newSettlement;
  }
  $('#view').innerHTML = `${S.isAdmin ? `<div class="toolbar">${clientSelect('sClient', 'كل العملاء')}</div>` : ''}<div class="panel" id="sPanel"></div>`;
  const load = async () => {
    let q = sb.from('settlements').select('*').order('created_at', { ascending: false }).limit(300);
    if (S.isAdmin && $('#sClient').value) q = q.eq('client_id', $('#sClient').value);
    const { data, error } = await q;
    if (error) return fail(error);
    $('#sPanel').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>رقم</th>${S.isAdmin ? '<th>العميل</th>' : ''}
      <th>التاريخ</th><th>الأوردرات</th><th>المحصّل</th><th>الرسوم</th><th>الصافي للعميل</th><th>الحالة</th></tr></thead><tbody>
      ${(data || []).map(s => `<tr class="click" data-id="${s.id}"><td class="num"><b>${s.settlement_no}</b></td>
        ${S.isAdmin ? `<td>${esc(clientName(s.client_id))}</td>` : ''}<td class="num">${dt(s.created_at)}</td>
        <td class="num">${s.orders_count}</td><td class="num">${money(s.total_collected)}</td><td class="num">${money(s.total_fees)}</td>
        <td>${signed(s.net_amount)}</td>
        <td>${s.status === 'paid' ? `<span class="badge b-green">اتدفعت</span> <span class="muted small">${dt(s.paid_at)}</span>` : '<span class="badge b-amber">لسه متدفعتش</span>'}</td></tr>`).join('')
        || `<tr><td colspan="8" class="empty">لسه مفيش تسويات</td></tr>`}</tbody></table></div>`;
    $$('#sPanel tr[data-id]').forEach(tr => tr.onclick = () => openSettlement((data || []).find(s => s.id === tr.dataset.id), load));
  };
  if (S.isAdmin) $('#sClient').onchange = load;
  await load();
}

const feeRow = o => `<td class="num">${money(o.status === 'delivered' ? o.collected_amount : 0)}</td>
  <td class="num">${o.status === 'delivered' ? money(o.shipping_fee) : '—'}</td>
  <td class="num">${o.status === 'delivered' ? money(o.fulfillment_fee) : '—'}</td>
  <td class="num">${o.status === 'delivered' ? money(o.cod_fee) : '—'}</td>
  <td class="num">${o.status === 'returned' ? money(o.return_fee) : '—'}</td><td>${signed(o.net_amount)}</td>`;
const feeHead = '<th>المحصّل</th><th>الشحن</th><th>التجهيز</th><th>عمولة</th><th>مرتجع</th><th>الصافي</th>';

function newSettlement() {
  const m = modal({ title: 'تسوية جديدة', wide: true,
    body: `<div class="toolbar">${clientSelect('nsClient', '— اختار العميل —')}</div><div id="nsBody"><p class="muted">اختار العميل عشان يظهر الأوردرات المسلّمة والمرتجعة اللي لسه متسوّتش.</p></div>`,
    footer: '<button class="btn primary" id="nsSave" disabled>تأكيد التسوية</button>' });
  let rows = [];
  const recalc = () => {
    const ids = $$('.nsSel:checked', m.el).map(c => c.value);
    const sel = rows.filter(r => ids.includes(r.id));
    const col = sel.reduce((a, o) => a + (o.status === 'delivered' ? +o.collected_amount : 0), 0);
    const net = sel.reduce((a, o) => a + +o.net_amount, 0);
    $('#nsTot', m.el).innerHTML = `<div><span class="muted small">عدد الأوردرات</span><b>${sel.length}</b></div>
      <div><span class="muted small">المحصّل</span><b>${egp(col)}</b></div><div><span class="muted small">الرسوم</span><b>${egp(col - net)}</b></div>
      <div><span class="muted small">الصافي للعميل</span><b>${egp(net)}</b></div>`;
    $('#nsSave', m.el).disabled = !sel.length;
  };
  $('#nsClient', m.el).onchange = async e => {
    const cid = e.target.value; $('#nsSave', m.el).disabled = true;
    if (!cid) { $('#nsBody', m.el).innerHTML = ''; return; }
    const { data, error } = await sb.from('orders').select('*').eq('client_id', cid).is('settlement_id', null)
      .in('status', ['delivered', 'returned']).order('closed_at');
    if (error) return fail(error);
    rows = data || [];
    if (!rows.length) { $('#nsBody', m.el).innerHTML = '<div class="empty">مفيش أوردرات جاهزة للتسوية للعميل ده</div>'; return; }
    $('#nsBody', m.el).innerHTML = `<div class="stmt-totals" id="nsTot"></div><div class="table-wrap" style="max-height:50vh;overflow:auto">
      <table class="t"><thead><tr><th class="w1"><input type="checkbox" id="nsAll" checked></th><th>رقم</th><th>المستلم</th><th>الحالة</th><th>تاريخ الإقفال</th>${feeHead}</tr></thead>
      <tbody>${rows.map(o => `<tr><td><input type="checkbox" class="nsSel" value="${o.id}" checked></td><td class="num">${orderNo(o)}</td>
        <td>${esc(o.customer_name)}</td><td>${badge(o.status)}</td><td class="num small">${dt(o.closed_at)}</td>${feeRow(o)}</tr>`).join('')}</tbody></table></div>`;
    $$('.nsSel', m.el).forEach(c => c.onchange = recalc);
    $('#nsAll', m.el).onchange = ev => { $$('.nsSel', m.el).forEach(c => c.checked = ev.target.checked); recalc(); };
    recalc();
  };
  $('#nsSave', m.el).onclick = e => busy(e.currentTarget, async () => {
    const ids = $$('.nsSel:checked', m.el).map(c => c.value);
    const { data, error } = await sb.rpc('create_settlement', { p_client: $('#nsClient', m.el).value, p_order_ids: ids });
    if (error) return fail(error);
    toast('اتعملت التسوية', 'ok'); m.close();
    await viewSettlements();
    const { data: s } = await sb.from('settlements').select('*').eq('id', data).single();
    if (s) openSettlement(s, viewSettlements);
  });
}

async function openSettlement(s, reload) {
  const { data: orders, error } = await sb.from('orders').select('*').eq('settlement_id', s.id).order('order_no');
  if (error) return fail(error);
  const client = S.clients.find(c => c.id === s.client_id) || {};
  const stmt = `<div class="stmt-head"><div><div class="logo">Operative</div><div class="muted small">كشف تسوية حساب</div></div>
      <dl class="kv small"><dt>رقم التسوية</dt><dd>${s.settlement_no}</dd><dt>العميل</dt><dd>${esc(client.name || '')}</dd>
      <dt>التاريخ</dt><dd>${dt(s.created_at)}</dd><dt>الحالة</dt><dd>${s.status === 'paid' ? `اتدفعت ${dt(s.paid_at)}${s.payment_ref ? ' — ' + esc(s.payment_ref) : ''}` : 'لسه متدفعتش'}</dd></dl></div>
    <div class="stmt-totals"><div><span class="muted small">عدد الأوردرات</span><b>${s.orders_count}</b></div>
      <div><span class="muted small">إجمالي المحصّل</span><b>${egp(s.total_collected)}</b></div>
      <div><span class="muted small">إجمالي الرسوم</span><b>${egp(s.total_fees)}</b></div>
      <div><span class="muted small">الصافي للعميل</span><b>${egp(s.net_amount)}</b></div></div>
    <table class="t"><thead><tr><th>رقم</th><th>المستلم</th><th>المحافظة</th><th>الحالة</th>${feeHead}</tr></thead>
    <tbody>${(orders || []).map(o => `<tr><td class="num">${orderNo(o)}${o.client_ref ? ` <span class="muted small">(${esc(o.client_ref)})</span>` : ''}</td>
      <td>${esc(o.customer_name)}</td><td>${esc(o.governorate)}</td><td>${badge(o.status)}</td>${feeRow(o)}</tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="4">الإجمالي</td><td class="num">${money(s.total_collected)}</td><td colspan="4"></td><td>${signed(s.net_amount)}</td></tr></tfoot></table>
    ${s.notes ? `<p class="small"><b>ملاحظات:</b> ${esc(s.notes)}</p>` : ''}`;
  const A = S.isAdmin;
  const m = modal({ title: `تسوية رقم ${s.settlement_no}`, body: `<div class="table-wrap">${stmt}</div>`, wide: true,
    footer: `<button class="btn primary" id="stPrint">طباعة / حفظ PDF</button>
      ${A && s.status !== 'paid' ? '<button class="btn" id="stPaid">تسجيل إنها اتدفعت</button>' : ''}
      <span class="spacer"></span>
      ${A && s.status !== 'paid' ? '<button class="btn danger" id="stDel">إلغاء التسوية</button>' : ''}` });
  $('#stPrint', m.el).onclick = () => {
    $('#printArea').innerHTML = stmt; document.body.classList.add('printing');
    window.print();
    setTimeout(() => { document.body.classList.remove('printing'); $('#printArea').innerHTML = ''; }, 300);
  };
  const paid = $('#stPaid', m.el);
  if (paid) paid.onclick = () => {
    const pm = modal({ title: 'تسجيل الدفع', body: `<form class="grid" id="payF">
      <label class="f"><span>طريقة / مرجع الدفع</span><input name="payment_ref" placeholder="مثال: إنستاباي — تحويل بنكي — كاش"></label>
      <label class="f"><span>ملاحظات</span><input name="notes" value="${esc(s.notes)}"></label></form>`,
      footer: '<button class="btn primary" id="payOk">تأكيد</button>' });
    $('#payOk', pm.el).onclick = e => busy(e.currentTarget, async () => {
      const f = formValues($('#payF', pm.el));
      const { error } = await sb.from('settlements').update({ status: 'paid', paid_at: new Date().toISOString(),
        payment_ref: nz(f.payment_ref), notes: nz(f.notes) }).eq('id', s.id);
      if (error) return fail(error);
      toast('اتسجّل الدفع', 'ok'); pm.close(); m.close(); reload();
    });
  };
  const del = $('#stDel', m.el);
  if (del) del.onclick = async () => {
    if (!await confirmBox('إلغاء التسوية هيرجّع الأوردرات بتاعتها لـ"لسه متسوّتش". متأكد؟', 'إلغاء التسوية', true)) return;
    const { error } = await sb.from('settlements').delete().eq('id', s.id);
    if (error) return fail(error);
    toast('اتلغت التسوية', 'ok'); m.close(); reload();
  };
}

// =====================================================================
//  تشغيل
// =====================================================================
(async () => {
  if (!configured) return renderSetupNeeded();
  const { data: { session } } = await sb.auth.getSession();
  if (session) await start(session.user); else renderLogin();
  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && S.user) { S.user = null; renderLogin(); } });
})();

})();
