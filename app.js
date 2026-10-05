/* =====================================================================
   Operative System — الواجهة
   ===================================================================== */
(() => {
'use strict';

// ---------------- ثوابت ----------------
const STATUS = {
  new:              { label: 'جديد',            color: 'gray'   },
  processing:       { label: 'قيد التجهيز',     color: 'blue'   },
  shipped:          { label: 'سُلِّم لشركة الشحن', color: 'indigo' },
  out_for_delivery: { label: 'خرج للتوصيل',      color: 'amber'  },
  delivered:        { label: 'تم التسليم',       color: 'green'  },
  returned:         { label: 'مرتجع',            color: 'red'    },
  cancelled:        { label: 'ملغى',             color: 'muted'  },
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
const govOptions = sel => opt('', '— اختر —', sel) + GOVS.map(g => opt(g, g, sel)).join('');
const orderNo = o => `#${o.order_no}`;

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3800);
}
function errMsg(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (/already registered|already been registered/i.test(m)) return 'يوجد حساب مسجّل بهذا البريد الإلكتروني';
  if (/Password should be/i.test(m)) return 'يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام';
  if (/duplicate key.*login_email/i.test(m)) return 'بريد الدخول هذا مستخدم لعميل آخر';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'تعذّر الاتصال بالخادم، تحقق من اتصالك بالإنترنت';
  if (/rate limit/i.test(m)) return 'محاولات كثيرة متتالية، انتظر دقيقة ثم أعد المحاولة';
  if (/مفيش أوردرات/.test(m)) return 'لا توجد طلبات جاهزة للتسوية';
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
  ${opt('today', 'اليوم', sel)}${opt('7d', 'آخر 7 أيام', sel)}${opt('month', 'هذا الشهر', sel)}
  ${opt('last', 'الشهر الماضي', sel)}${opt('all', 'كل الفترات', sel)}</select>`;

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
  const t = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'جارٍ التنفيذ...';
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
    <p>لم يُربط النظام بقاعدة البيانات بعد.</p>
    <div class="alert">افتح ملف <b class="ltr">config.js</b> وأدخل فيه رابط مشروع Supabase ومفتاحه.</div></div></div>`;
}

function renderLogin(msg = '') {
  $('#modals').innerHTML = '';
  $('#root').innerHTML = `<div class="login"><form class="box" id="loginForm">
    <h2>Operative</h2><p>تسجيل الدخول إلى النظام</p>
    <div class="grid">
      <label class="f"><span>البريد الإلكتروني</span><input name="email" type="email" required autocomplete="username" dir="ltr"></label>
      <label class="f"><span>كلمة المرور</span><input name="password" type="password" required autocomplete="current-password" dir="ltr"></label>
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
    return renderLogin('هذا الحساب غير مرتبط بأي عميل بعد، يُرجى التواصل مع إدارة Operative');
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
const NAV_ADMIN = [['dashboard', 'لوحة التحكم'], ['orders', 'الطلبات'], ['clients', 'العملاء'], ['settlements', 'التسويات']];
const NAV_CLIENT = [['dashboard', 'لوحة التحكم'], ['orders', 'طلباتي'], ['settlements', 'التسويات']];

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
  $('#view').innerHTML = '<div class="empty">جارٍ التحميل...</div>';
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
      ['إجمالي الطلبات', s.total], ['قيد التجهيز', s.new], ['في الطريق', s.in_transit, 'indigo'],
      ['تم التسليم', s.delivered, 'green'], ['مرتجع', s.returned, 'red'], ['نسبة التسليم', `${rate}%`],
      ['تحصيل متوقع (طلبات مفتوحة)', egp(s.cod_pending)], ['المحصّل', egp(s.collected), 'green'],
      [S.isAdmin ? 'إيرادات الشركة' : 'إجمالي التكلفة', egp(s.fees)],
      [S.isAdmin ? 'مستحقات العملاء غير المسوّاة' : 'رصيدك المستحق غير المسوّى', egp(all.unsettled_net), 'primary'],
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
      <table class="t"><thead><tr><th>العميل</th><th>الطلبات</th><th>في الطريق</th><th>تم التسليم</th><th>مرتجع</th>
      <th class="hide-sm">نسبة التسليم</th><th class="hide-sm">المحصّل</th><th>مستحق غير مسوّى</th></tr></thead><tbody>
      ${(data || []).map(r => { const c = +r.delivered + +r.returned;
        return `<tr><td><b>${esc(r.name)}</b></td><td class="num">${r.total}</td><td class="num">${r.in_transit}</td>
        <td class="num">${r.delivered}</td><td class="num">${r.returned}</td><td class="num hide-sm">${c ? Math.round(r.delivered * 100 / c) : 0}%</td>
        <td class="num hide-sm">${money(r.collected)}</td><td>${signed(r.unsettled_net)}</td></tr>`; }).join('')
        || '<tr><td colspan="8" class="empty">لا يوجد عملاء بعد، ابدأ من صفحة العملاء</td></tr>'}
      </tbody></table></div></div>`;
  } else {
    const c = S.myClient || {};
    const { data: rates } = await sb.from('client_shipping_rates').select('*').eq('client_id', c.id).order('governorate');
    $('#dExtra').innerHTML = `<div class="panel"><div class="panel-h">أسعار الخدمة الخاصة بك</div><div class="panel-b">
      <dl class="kv"><dt>التجهيز والتغليف</dt><dd>${egp(c.fulfillment_fee)} / طلب</dd>
      <dt>المرتجع (أساسي)</dt><dd>${egp(c.return_fee)}</dd>
      <dt>الشحن (أساسي)</dt><dd>${egp(c.default_shipping_fee)}</dd></dl>
      <p class="hint" style="margin:10px 0 0">الطلب المسلَّم: الصافي = المبلغ المحصّل − (الشحن + التجهيز). الطلب المرتجع: الصافي = المبلغ المحصّل إن وُجد − (المرتجع + التجهيز).</p>
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
  setTitle(S.isAdmin ? 'الطلبات' : 'طلباتي');
  $('#pageActions').innerHTML = `${S.isAdmin ? `<button class="btn" id="qpSyncBtn" title="جلب آخر حالات الشحنات من QP">تحديث حالات QP</button>
    <button class="btn ghost" id="qpSetBtn">إعدادات QP</button>` : ''}
    <button class="btn" id="exportBtn">تصدير إلى Excel</button>
    <button class="btn" id="importBtn">رفع طلبات من Excel</button>
    <button class="btn primary" id="addOrderBtn">+ طلب جديد</button>`;
  if (S.isAdmin) {
    $('#qpSyncBtn').onclick = e => busy(e.currentTarget, qpSyncNow);
    $('#qpSetBtn').onclick = openQpSettings;
  }
  $('#addOrderBtn').onclick = () => openOrder(null);
  $('#importBtn').onclick = openImport;
  $('#exportBtn').onclick = e => busy(e.currentTarget, exportOrders);
  selected = new Set();
  $('#view').innerHTML = `<div class="toolbar">
      <input class="grow" id="oQ" placeholder="بحث: الاسم، الهاتف، رقم الطلب، رقم التتبع" value="${esc(OF.q)}">
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
    <th>رقم</th>${A ? '<th class="hide-sm">العميل</th>' : ''}<th>المستلم</th><th class="hide-sm">المحافظة</th><th>التحصيل</th><th>الحالة</th>
    <th class="hide-sm">رقم التتبع</th><th class="hide-sm">التاريخ</th></tr></thead><tbody>
    ${rows.map(o => `<tr class="click ${selected.has(o.id) ? 'selected' : ''}" data-id="${o.id}">
      ${A ? `<td><input type="checkbox" class="sel" ${selected.has(o.id) ? 'checked' : ''}></td>` : ''}
      <td class="num"><b>${orderNo(o)}</b>${o.client_ref ? `<div class="muted small">${esc(o.client_ref)}</div>` : ''}</td>
      ${A ? `<td class="hide-sm">${esc(clientName(o.client_id))}</td>` : ''}
      <td>${esc(o.customer_name)}<div class="muted small"><span class="ltr">${esc(o.customer_phone)}</span></div></td>
      <td class="hide-sm">${esc(o.governorate)}<div class="muted small">${esc(o.city || '')}</div></td>
      <td class="num">${money(o.cod_amount)}</td><td>${badge(o.status)}</td>
      <td class="small hide-sm"><span class="ltr">${esc(o.qp_tracking || '')}</span>${o.qp_status ? `<div class="muted small">${esc(o.qp_status)}</div>` : ''}</td><td class="num small hide-sm">${dt(o.created_at)}</td></tr>`).join('')
      || `<tr><td colspan="9" class="empty">لا توجد طلبات${OF.q || OF.status || OF.client ? ' مطابقة للبحث' : ' بعد'}</td></tr>`}
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
  el.innerHTML = `<div class="bulkbar"><b>تم تحديد ${selected.size} طلب</b>
    <button class="btn primary sm" id="bulkQp">إرسال إلى QP</button>
    <span class="sep"></span>
    <span>تغيير الحالة إلى:</span><select id="bulkStatus">${statusOptions('shipped')}</select>
    <button class="btn sm" id="bulkApply">تطبيق</button>
    <button class="btn ghost sm" id="bulkClear">إلغاء التحديد</button></div>`;
  $('#bulkClear').onclick = () => { selected.clear(); loadOrders(); };
  $('#bulkQp').onclick = sendToQp;
  $('#bulkApply').onclick = e => busy(e.currentTarget, async () => {
    const st = $('#bulkStatus').value;
    const { error } = await sb.from('orders').update({ status: st }).in('id', [...selected]);
    if (error) return fail(error);
    toast(`تم تغيير حالة ${selected.size} طلب`, 'ok'); selected.clear(); loadOrders();
  });
}

// =====================================================================
//  الربط مع QP Express
// =====================================================================
const sleep = ms => new Promise(r => setTimeout(r, ms));

// تجهيز جلسة QP (تسجيل الدخول يتم في الخلفية، نكرر السؤال حتى يجهز)
async function qpEnsureLogin() {
  for (let i = 0; i < 40; i++) {
    const { data, error } = await sb.rpc('qp_login');
    if (error) throw error;
    if (data.state === 'ready') return data;
    if (data.state === 'error') throw new Error(data.msg);
    await sleep(i < 5 ? 600 : 1200);
  }
  throw new Error('انتهت مهلة الاتصال بـ QP، حاول مرة أخرى');
}

async function sendToQp() {
  const ids = [...selected];
  const { data, error } = await sb.from('orders').select('id, order_no, status, qp_tracking, customer_name, governorate')
    .in('id', ids).order('order_no');
  if (error) return fail(error);
  const ok = (data || []).filter(o => ['new', 'processing'].includes(o.status) && !o.qp_tracking);
  const skip = (data || []).length - ok.length;
  if (!ok.length) return toast('لا توجد طلبات صالحة للإرسال — يُرسل فقط الطلب الجديد أو قيد التجهيز الذي ليس له رقم تتبع', 'err');
  if (!await confirmBox(`سيتم إرسال <b>${ok.length}</b> طلب إلى QP${skip ? ` (وسيتم تخطي ${skip} طلب سبق إرساله أو حالته لا تسمح)` : ''}. هل تريد المتابعة؟`, 'إرسال')) return;

  const m = modal({ title: 'إرسال الطلبات إلى QP', wide: true,
    body: `<div class="qp-prog"><div class="bar"><i id="qpBar"></i></div><div id="qpCount" class="muted small">جارٍ الاتصال بـ QP...</div></div>
      <div class="table-wrap"><table class="t"><thead><tr><th>الطلب</th><th>المستلم</th><th>النتيجة</th></tr></thead>
      <tbody id="qpRes">${ok.map(o => `<tr data-id="${o.id}"><td class="num"><b>${orderNo(o)}</b></td><td>${esc(o.customer_name)}
        <div class="muted small">${esc(o.governorate)}</div></td><td class="r muted">في الانتظار...</td></tr>`).join('')}</tbody></table></div>`,
    footer: `<button class="btn primary" id="qpDone" disabled>إغلاق</button>` });
  const cell = id => $(`#qpRes tr[data-id="${id}"] .r`, m.el);
  const setCell = (id, cls, html) => { const c = cell(id); if (c) { c.className = 'r ' + cls; c.innerHTML = html; } };
  const progress = (n, label) => { $('#qpBar', m.el).style.width = `${Math.round(n * 100 / ok.length)}%`; $('#qpCount', m.el).innerHTML = label; };
  const finish = () => {
    const btn = $('#qpDone', m.el); btn.disabled = false;
    btn.onclick = () => { m.close(); selected.clear(); loadOrders(); };
    $('.x', m.el).onclick = btn.onclick;
  };

  try { await qpEnsureLogin(); }
  catch (e) {
    $$('#qpRes .r', m.el).forEach(c => { c.className = 'r err-txt'; c.textContent = 'لم يُرسل'; });
    progress(0, `<span class="err-txt">${esc(errMsg(e))}</span>`); return finish();
  }

  // 1) إرسال الطلبات (تُرسل في الخلفية)
  const queued = [];
  for (const o of ok) {
    setCell(o.id, 'muted', 'جارٍ الإرسال...');
    try {
      const { data: r, error: e } = await sb.rpc('qp_send_order', { p_id: o.id });
      if (e) throw e;
      if (r && r.ok) queued.push(o.id); else setCell(o.id, 'err-txt', esc((r && r.msg) || 'فشل'));
    } catch (e) { setCell(o.id, 'err-txt', esc(errMsg(e))); }
  }
  progress(0, `بانتظار رد QP... (0 / ${queued.length})`);

  // 2) متابعة الردود حتى تكتمل
  let good = 0, done = 0;
  for (let i = 0; i < 60 && queued.length; i++) {
    await sleep(i < 3 ? 800 : 1500);
    const { data: rs, error: e } = await sb.rpc('qp_send_results', { p_ids: queued });
    if (e) { fail(e); break; }
    good = 0; done = 0;
    rs.forEach(r => {
      if (r.pending) return;
      done++;
      if (r.ok) { good++; setCell(r.id, 'ok-txt', `تم ✓ رقم التتبع <span class="ltr"><b>${esc(r.serial)}</b></span>`); }
      else setCell(r.id, 'err-txt', esc(r.msg || 'فشل'));
    });
    progress(done, `بانتظار رد QP... (${done} / ${queued.length})`);
    if (done >= queued.length) break;
  }
  progress(ok.length, `<b>تم إرسال ${good} من ${ok.length} طلب</b>${done < queued.length ? ' — باقي الردود ستُحدَّث تلقائيًا' : ''}`);
  finish();
}

async function qpSyncNow() {
  try { await qpEnsureLogin(); } catch (e) { return toast('تعذّر الاتصال بـ QP: ' + errMsg(e), 'err'); }
  const { data, error } = await sb.rpc('qp_sync_now');
  if (error) return fail(error);
  if (!data.ok) return toast('تعذّر التحديث: ' + data.msg, 'err');
  toast(data.active ? `تم تحديث حالات ${data.found} شحنة من QP` : 'لا توجد شحنات نشطة لتحديثها', 'ok');
  loadOrders();
}

async function openQpSettings() {
  const { data: s, error } = await sb.rpc('qp_get_settings');
  if (error) return fail(error);
  const m = modal({ title: 'إعدادات الربط مع QP',
    body: `<form id="qpForm" class="grid">
      <p class="hint" style="margin:0">أدخل بيانات حساب الشركة على موقع QP Express. تُحفظ كلمة المرور مشفّرة ولا يمكن عرضها مرة أخرى.</p>
      <label class="f"><span>اسم المستخدم / البريد في QP *</span><input name="username" dir="ltr" required autocomplete="off" value="${esc(s.username || '')}"></label>
      <label class="f"><span>كلمة المرور ${s.has_password ? '<span class="hint">(محفوظة — اتركها فارغة إن لم تتغير)</span>' : '*'}</span>
        <input name="password" type="password" dir="ltr" autocomplete="new-password" ${s.has_password ? '' : 'required'}></label>
      <label class="chk"><input type="checkbox" name="auto_sync" ${s.auto_sync !== false ? 'checked' : ''}> تحديث حالات الشحنات تلقائيًا كل ساعة</label>
      <dl class="kv small"><dt>رقم الحساب في QP</dt><dd class="ltr">${esc(s.customer_id || '—')}</dd>
        <dt>آخر تحديث</dt><dd>${s.last_sync_at ? dtt(s.last_sync_at) : '—'}</dd>
        <dt>النتيجة</dt><dd>${esc(s.last_sync_msg || '—')}</dd></dl>
    </form>`,
    footer: `<button class="btn primary" id="qpSave">حفظ واختبار الاتصال</button><button class="btn" id="qpClose">إغلاق</button>` });
  $('#qpClose', m.el).onclick = m.close;
  $('#qpSave', m.el).onclick = e => {
    const form = $('#qpForm', m.el);
    if (!form.reportValidity()) return;
    const f = formValues(form);
    busy(e.currentTarget, async () => {
      const { error: e1 } = await sb.rpc('qp_save_settings', { p_username: f.username.trim(), p_password: form.elements.password.value || null, p_auto_sync: f.auto_sync });
      if (e1) return fail(e1);
      try {
        const t = await qpEnsureLogin();
        toast(`تم الاتصال بـ QP بنجاح (رقم الحساب ${t.customer_id})`, 'ok'); m.close();
      } catch (e2) { toast('تم الحفظ، لكن ' + errMsg(e2), 'err'); }
    });
  };
}

async function exportOrders() {
  const { data, error } = await ordersQuery('*', false).range(0, 9999);
  if (error) return fail(error);
  const cols = [['order_no', 'رقم الطلب'], ['client', 'العميل'], ['client_ref', 'مرجع العميل'], ['customer_name', 'المستلم'],
    ['customer_phone', 'الهاتف'], ['customer_phone2', 'هاتف آخر'], ['governorate', 'المحافظة'], ['city', 'المنطقة'],
    ['address', 'العنوان'], ['items', 'المحتوى'], ['pieces', 'القطع'], ['cod_amount', 'التحصيل'], ['allow_open', 'مسموح بالفتح'],
    ['notes', 'ملاحظات'], ['status', 'الحالة'], ['qp_tracking', 'رقم التتبع'], ['collected_amount', 'المحصّل'],
    ['shipping_fee', 'الشحن'], ['fulfillment_fee', 'التجهيز'], ['return_fee', 'المرتجع'],
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
      ${opt('', '— اختر العميل —', o.client_id)}${S.clients.filter(c => c.active || c.id === o.client_id).map(c => opt(c.id, c.name, o.client_id)).join('')}</select></label>` : ''}
    <label class="f"><span>اسم المستلم *</span><input name="customer_name" required value="${esc(o.customer_name)}" ${dis}></label>
    <label class="f"><span>رقم الطلب لديك</span><input name="client_ref" value="${esc(o.client_ref)}" ${dis}></label>
    <label class="f"><span>رقم الهاتف *</span><input name="customer_phone" required inputmode="tel" dir="ltr" value="${esc(o.customer_phone)}" ${dis}></label>
    <label class="f"><span>رقم هاتف آخر</span><input name="customer_phone2" inputmode="tel" dir="ltr" value="${esc(o.customer_phone2)}" ${dis}></label>
    <label class="f"><span>المحافظة *</span><select name="governorate" required ${dis}>${govOptions(o.governorate)}</select></label>
    <label class="f"><span>المنطقة / المدينة</span><input name="city" value="${esc(o.city)}" ${dis}></label>
    <label class="f span-all"><span>العنوان بالتفصيل *</span><input name="address" required value="${esc(o.address)}" ${dis}></label>
    <label class="f"><span>المحتوى</span><input name="items" value="${esc(o.items)}" ${dis}></label>
    <div class="grid g2"><label class="f"><span>عدد القطع</span><input name="pieces" type="number" min="1" value="${esc(o.pieces)}" ${dis}></label>
      <label class="f"><span>المطلوب تحصيله *</span><input name="cod_amount" type="number" min="0" step="0.01" required value="${esc(o.cod_amount)}" ${dis}></label></div>
    <label class="f span-all"><span>ملاحظات</span><input name="notes" value="${esc(o.notes)}" ${dis}></label>
    <label class="chk span-all"><input type="checkbox" name="allow_open" ${o.allow_open ? 'checked' : ''} ${dis}> يُسمح للمستلم بفتح الشحنة</label>
    ${A && !isNew ? `<div class="section-title span-all">الشحن والتحصيل</div>
      <label class="f"><span>الحالة</span><select name="status">${statusOptions(o.status)}</select></label>
      <label class="f"><span>رقم التتبع (QP)</span><input name="qp_tracking" dir="ltr" value="${esc(o.qp_tracking)}"></label>
      <label class="f"><span>حالة الشحنة عند QP</span><input name="qp_status" value="${esc(o.qp_status)}"></label>
      <label class="f"><span>المبلغ المحصّل <span class="hint">(المسلَّم: إذا تُرك فارغًا = المطلوب — المرتجع: ما دفعه المستلم إن وُجد)</span></span><input name="collected_amount" type="number" step="0.01" value="${esc(o.collected_amount)}"></label>
      <div class="section-title span-all">الرسوم <span class="hint">— تُحسب تلقائيًا من أسعار العميل، ويمكن تعديلها هنا</span></div>
      <div class="grid g3 span-all">
        <label class="f"><span>الشحن</span><input name="shipping_fee" type="number" step="0.01" value="${esc(o.shipping_fee)}"></label>
        <label class="f"><span>التجهيز والتغليف</span><input name="fulfillment_fee" type="number" step="0.01" value="${esc(o.fulfillment_fee)}"></label>
        <label class="f"><span>المرتجع</span><input name="return_fee" type="number" step="0.01" value="${esc(o.return_fee)}"></label>
      </div>` : ''}
    ${!isNew ? `<div class="section-title span-all">متابعة الطلب</div>
      <div class="span-all grid g2"><div><ul class="timeline" id="oEvents"><li class="muted">...</li></ul></div>
      <dl class="kv small"><dt>الحالة</dt><dd>${badge(o.status)}</dd>
        ${o.qp_tracking ? `<dt>رقم التتبع</dt><dd><span class="ltr">${esc(o.qp_tracking)}</span></dd>` : ''}
        ${o.qp_status ? `<dt>عند شركة الشحن</dt><dd>${esc(o.qp_status)}</dd>` : ''}
        ${o.status === 'returned' ? `<dt>التكلفة (المرتجع + التجهيز)</dt><dd>${egp(+o.return_fee + +o.fulfillment_fee)}</dd>`
          : `<dt>التكلفة (الشحن + التجهيز)</dt><dd>${egp(+o.shipping_fee + +o.fulfillment_fee)}</dd>`}
        ${['delivered', 'returned'].includes(o.status) ? `<dt>المحصّل</dt><dd>${egp(o.collected_amount)}</dd>` : ''}
        ${['delivered', 'returned'].includes(o.status) ? `<dt>الصافي</dt><dd>${signed(o.net_amount)} ج</dd>` : ''}
        <dt>التسوية</dt><dd>${o.settlement_id ? 'تمت التسوية' : 'لم تتم بعد'}</dd></dl></div>` : ''}
  </form>`;
  const footer = `${editable ? `<button class="btn primary" id="oSave">${isNew ? 'إضافة الطلب' : 'حفظ'}</button>` : ''}
    <span class="spacer"></span>
    ${!isNew && !A && o.status === 'new' ? '<button class="btn danger" id="oCancel">إلغاء الطلب</button>' : ''}
    ${!isNew && A && !o.settlement_id ? '<button class="btn danger" id="oDelete">حذف</button>' : ''}`;
  const m = modal({ title: isNew ? 'طلب جديد' : `الطلب ${orderNo(o)}${A ? ' — ' + esc(clientName(o.client_id)) : ''}`, body, footer, wide: true });

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
    if (!/^\+?\d{10,13}$/.test(phone)) return toast('رقم الهاتف غير صحيح', 'err');
    const rec = {
      client_ref: nz(f.client_ref), customer_name: f.customer_name, customer_phone: phone,
      customer_phone2: nz(f.customer_phone2.replace(/\s|-/g, '')), governorate: f.governorate, city: nz(f.city),
      address: f.address, items: nz(f.items), pieces: parseInt(f.pieces) || 1, cod_amount: num(f.cod_amount),
      allow_open: f.allow_open, notes: nz(f.notes),
    };
    if (A && !isNew) Object.assign(rec, {
      status: f.status, qp_tracking: nz(f.qp_tracking), qp_status: nz(f.qp_status),
      collected_amount: num(f.collected_amount), shipping_fee: num(f.shipping_fee), fulfillment_fee: num(f.fulfillment_fee),
      return_fee: num(f.return_fee),
    });
    if (isNew) rec.client_id = A ? f.client_id : S.profile.client_id;
    busy(save, async () => {
      const { data, error } = isNew
        ? await sb.from('orders').insert(rec).select().single()
        : await sb.from('orders').update(rec).eq('id', o.id).select().single();
      if (error) return fail(error);
      toast(isNew ? `تمت إضافة الطلب ${orderNo(data)}` : 'تم الحفظ', 'ok'); m.close(); loadOrders();
    });
  };
  const cancel = $('#oCancel', m.el);
  if (cancel) cancel.onclick = async () => {
    if (!await confirmBox('هل تريد إلغاء هذا الطلب؟', 'إلغاء الطلب', true)) return;
    const { error } = await sb.from('orders').update({ status: 'cancelled' }).eq('id', o.id);
    if (error) return fail(error);
    toast('تم إلغاء الطلب', 'ok'); m.close(); loadOrders();
  };
  const del = $('#oDelete', m.el);
  if (del) del.onclick = async () => {
    if (!await confirmBox(`هل تريد حذف الطلب ${orderNo(o)} نهائيًا؟`, 'حذف', true)) return;
    const { error } = await sb.from('orders').delete().eq('id', o.id);
    if (error) return fail(error);
    toast('تم الحذف', 'ok'); m.close(); loadOrders();
  };
}

// =====================================================================
//  رفع الطلبات من Excel
// =====================================================================
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
let xlsxReady = null;
function loadXLSX() {
  if (window.XLSX) return Promise.resolve();
  return xlsxReady || (xlsxReady = new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = XLSX_URL;
    sc.onload = () => res();
    sc.onerror = () => { xlsxReady = null; rej(new Error('تعذّر تحميل مكتبة Excel، تحقق من الاتصال بالإنترنت')); };
    document.head.appendChild(sc);
  }));
}
const toLatinDigits = v => String(v ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const normAr = v => toLatinDigits(v).trim().toLowerCase().replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/[ً-ْـ]/g, '').replace(/[_\-–—:\.\*\(\)"']/g, ' ').replace(/\s+/g, ' ').trim();
const IMPORT_COLS = [
  { key: 'customer_name', label: 'اسم المستلم', req: true, alias: ['اسم المستلم', 'الاسم', 'اسم العميل', 'المستلم', 'الاسم بالكامل', 'full name', 'name', 'customer name', 'receiver name', 'consignee'] },
  { key: 'customer_phone', label: 'رقم الهاتف', req: true, alias: ['رقم الهاتف', 'الهاتف', 'الموبايل', 'موبايل', 'التليفون', 'رقم الموبايل', 'رقم التليفون', 'phone', 'mobile', 'phone number', 'mobile number'] },
  { key: 'customer_phone2', label: 'رقم هاتف آخر', alias: ['رقم هاتف آخر', 'هاتف آخر', 'موبايل 2', 'هاتف 2', 'رقم هاتف اخر', 'هاتف اخر', 'phone2', 'phone 2', 'second phone', 'other phone'] },
  { key: 'governorate', label: 'المحافظة', req: true, alias: ['المحافظة', 'محافظة', 'المدينة', 'city', 'governorate', 'state', 'province'] },
  { key: 'city', label: 'المنطقة', alias: ['المنطقة', 'منطقة', 'الحي', 'area', 'district', 'zone', 'region'] },
  { key: 'address', label: 'العنوان', req: true, alias: ['العنوان', 'العنوان بالتفصيل', 'عنوان', 'address', 'full address'] },
  { key: 'items', label: 'المحتوى', alias: ['المحتوى', 'محتوى الشحنة', 'المنتج', 'المنتجات', 'الصنف', 'shipment contents', 'contents', 'items', 'product', 'products', 'description'] },
  { key: 'pieces', label: 'عدد القطع', alias: ['عدد القطع', 'الكمية', 'القطع', 'عدد', 'pieces', 'quantity', 'qty'] },
  { key: 'cod_amount', label: 'المبلغ المطلوب تحصيله', req: true, alias: ['المبلغ المطلوب تحصيله', 'المطلوب تحصيله', 'المبلغ', 'مبلغ التحصيل', 'التحصيل', 'الاجمالي', 'السعر', 'total amount', 'cod amount', 'amount', 'total', 'price'] },
  { key: 'client_ref', label: 'رقم الطلب لديك', alias: ['رقم الطلب لديك', 'رقم الطلب', 'رقم الاوردر', 'مرجع', 'reference id', 'reference', 'order id', 'order number', 'order no'] },
  { key: 'notes', label: 'ملاحظات', alias: ['ملاحظات', 'ملاحظه', 'notes', 'note', 'comments', 'comment'] },
  { key: 'allow_open', label: 'يسمح بالفتح', alias: ['يسمح بالفتح', 'مسموح بالفتح', 'فتح الشحنه', 'السماح بالفتح', 'allow open', 'open package'] },
];
const GOV_ALIAS = {
  'cairo': 'القاهرة', 'giza': 'الجيزة', 'alexandria': 'الإسكندرية', 'alex': 'الإسكندرية', 'qalyubia': 'القليوبية', 'qalubia': 'القليوبية',
  'sharqia': 'الشرقية', 'sharkia': 'الشرقية', 'dakahlia': 'الدقهلية', 'gharbia': 'الغربية', 'monufia': 'المنوفية', 'menoufia': 'المنوفية',
  'beheira': 'البحيرة', 'kafr el sheikh': 'كفر الشيخ', 'damietta': 'دمياط', 'port said': 'بورسعيد', 'ismailia': 'الإسماعيلية',
  'suez': 'السويس', 'fayoum': 'الفيوم', 'faiyum': 'الفيوم', 'beni suef': 'بني سويف', 'minya': 'المنيا', 'assiut': 'أسيوط', 'asyut': 'أسيوط',
  'sohag': 'سوهاج', 'qena': 'قنا', 'luxor': 'الأقصر', 'aswan': 'أسوان', 'red sea': 'البحر الأحمر', 'new valley': 'الوادي الجديد',
  'matrouh': 'مطروح', 'north sinai': 'شمال سيناء', 'south sinai': 'جنوب سيناء',
  'اكتوبر': 'الجيزة', '6 اكتوبر': 'الجيزة', 'السادس من اكتوبر': 'الجيزة', 'الشيخ زايد': 'الجيزة', 'شرم الشيخ': 'جنوب سيناء', 'الغردقه': 'البحر الأحمر',
};
const govKey = v => normAr(v).replace(/^محافظه\s*/, '').split(' ').map(w => w.replace(/^ال/, '')).join('');
const GOV_INDEX = (() => {
  const m = {};
  GOVS.forEach(g => { m[govKey(g)] = g; });
  Object.entries(GOV_ALIAS).forEach(([k, g]) => { m[govKey(k)] = g; m[normAr(k)] = g; });
  return m;
})();
const matchGov = v => GOV_INDEX[normAr(v)] || GOV_INDEX[govKey(v)] || null;
const normPhone = v => {
  let p = toLatinDigits(v).replace(/[^\d+]/g, '');
  if (p.startsWith('+20')) p = '0' + p.slice(3);
  else if (p.startsWith('0020')) p = '0' + p.slice(4);
  else if (p.startsWith('20') && p.length === 12) p = '0' + p.slice(2);
  if (/^1\d{9}$/.test(p)) p = '0' + p;
  return p;
};
const parseAmount = v => { const n = parseFloat(toLatinDigits(v).replace(/[^\d.\-]/g, '')); return isNaN(n) ? null : n; };
const parseYes = v => /^(نعم|ايوه|اه|yes|y|true|1|مسموح|يسمح)$/.test(normAr(v));

function downloadTemplate() {
  const head = IMPORT_COLS.map(c => c.label);
  const ex = ['محمد أحمد', '01012345678', '', 'القاهرة', 'مدينة نصر', '10 شارع عباس العقاد، الدور الثالث', 'سلسلة فضة', 1, 450, '1001', 'الاتصال قبل التوصيل', 'لا'];
  const ws = XLSX.utils.aoa_to_sheet([head, ex]);
  ws['!cols'] = head.map((h, i) => ({ wch: i === 5 ? 40 : Math.max(14, h.length + 4) }));
  const gs = XLSX.utils.aoa_to_sheet([['المحافظات المتاحة'], ...GOVS.map(g => [g])]);
  gs['!cols'] = [{ wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الطلبات');
  XLSX.utils.book_append_sheet(wb, gs, 'المحافظات');
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(wb, 'operative-orders-template.xlsx');
}

function readSheetRows(buf) {
  const wb = XLSX.read(buf, { type: 'array' });
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
    for (let h = 0; h < Math.min(rows.length, 6); h++) {
      const map = {};
      rows[h].forEach((cell, i) => {
        const n = normAr(cell); if (!n) return;
        const col = IMPORT_COLS.find(c => !(c.key in map) && c.alias.some(a => normAr(a) === n));
        if (col) map[col.key] = i;
      });
      if (Object.keys(map).length >= 3) return { map, rows: rows.slice(h + 1).filter(r => r.some(x => String(x).trim() !== '')) };
    }
  }
  return null;
}

function buildImportRows(sheet) {
  const { map, rows } = sheet;
  const get = (r, k) => map[k] === undefined ? '' : String(r[map[k]] ?? '').trim();
  return rows.map((r, i) => {
    const o = {
      line: i + 1,
      customer_name: get(r, 'customer_name'),
      customer_phone: normPhone(get(r, 'customer_phone')),
      customer_phone2: normPhone(get(r, 'customer_phone2')) || null,
      govRaw: get(r, 'governorate'),
      governorate: matchGov(get(r, 'governorate')),
      city: get(r, 'city') || null,
      address: get(r, 'address').replace(/\s+/g, ' ').replace(/^["'«]+|["'»]+$/g, '').trim(),
      items: get(r, 'items') || null,
      pieces: parseInt(toLatinDigits(get(r, 'pieces'))) || 1,
      cod_amount: parseAmount(get(r, 'cod_amount')),
      client_ref: get(r, 'client_ref') || null,
      notes: get(r, 'notes') || null,
      allow_open: parseYes(get(r, 'allow_open')),
    };
    validateImportRow(o);
    return o;
  });
}
function validateImportRow(o) {
  const e = [];
  if (!o.customer_name) e.push('الاسم ناقص');
  if (!/^0\d{9,10}$/.test(o.customer_phone)) e.push('رقم الهاتف غير صحيح');
  if (!o.address) e.push('العنوان ناقص');
  if (o.cod_amount === null) e.push('المبلغ غير صحيح');
  if (!o.governorate) e.push(o.govRaw ? 'اختر المحافظة' : 'المحافظة ناقصة');
  o.errors = e;
}

function openImport() {
  const A = S.isAdmin;
  const m = modal({ title: 'رفع طلبات من ملف Excel', wide: true, body: `
    <div class="import-steps">
      <div class="alert info">
        <b>الخطوات:</b> ١) نزّل النموذج واملأه بالطلبات، صف لكل طلب. ٢) ارفع الملف. ٣) راجع الطلبات واضغط "إضافة".
        <div class="small" style="margin-top:6px">يمكنك أيضًا رفع ملف بأعمدة مختلفة؛ سيتعرّف النظام على الأعمدة المعروفة مثل الاسم والهاتف والعنوان والمحافظة والمبلغ.</div>
      </div>
      <div class="toolbar">
        ${A ? clientSelect('impClient', '— اختر العميل —', OF.client) : ''}
        <button class="btn" id="impTpl">تنزيل النموذج</button>
        <label class="btn primary" style="cursor:pointer">اختيار الملف<input type="file" id="impFile" accept=".xlsx,.xls,.csv" hidden></label>
        <span class="muted small" id="impName"></span>
      </div>
      <div id="impBody"></div>
    </div>`,
    footer: '<button class="btn primary" id="impSave" disabled>إضافة الطلبات</button><span class="spacer"></span><span class="muted small" id="impCount"></span>' });
  let rows = [];
  const render = () => {
    const ok = rows.filter(r => !r.errors.length), bad = rows.length - ok.length;
    $('#impCount', m.el).textContent = rows.length ? `${ok.length} جاهز${bad ? ` — ${bad} يحتاج تصحيح` : ''}` : '';
    $('#impSave', m.el).disabled = !ok.length;
    $('#impSave', m.el).textContent = ok.length ? `إضافة ${ok.length} طلب` : 'إضافة الطلبات';
    if (!rows.length) return;
    $('#impBody', m.el).innerHTML = `
      ${bad ? `<div class="alert">يوجد ${bad} صف يحتاج تصحيحًا (باللون الأحمر). الصفوف الصحيحة فقط هي التي ستُضاف — يمكنك تصحيح الملف ورفعه من جديد.</div>` : '<div class="alert ok">كل الصفوف سليمة ✓</div>'}
      <div class="table-wrap" style="max-height:52vh;overflow:auto;border:1px solid var(--border);border-radius:8px">
      <table class="t"><thead><tr><th>#</th><th>المستلم</th><th>الهاتف</th><th>المحافظة</th><th class="hide-sm">العنوان</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${r.errors.length ? 'row-err' : ''}">
        <td class="num muted">${r.line}</td><td>${esc(r.customer_name)}</td><td><span class="ltr">${esc(r.customer_phone)}</span></td>
        <td>${r.governorate && !r.govFixed ? esc(r.governorate)
          : `<select class="impGov" data-i="${i}" style="min-width:120px">${govOptions(r.governorate)}</select>${r.govRaw ? `<div class="muted small">في الملف: ${esc(r.govRaw)}</div>` : ''}`}</td>
        <td class="hide-sm small">${esc(r.address).slice(0, 60)}</td><td class="num">${r.cod_amount ?? ''}</td>
        <td>${r.errors.length ? `<span class="neg small">${r.errors.join('، ')}</span>` : '<span class="pos">✓</span>'}</td></tr>`).join('')}
      </tbody></table></div>`;
    $$('.impGov', m.el).forEach(sel => sel.onchange = () => {
      const r = rows[+sel.dataset.i]; r.governorate = sel.value || null; r.govFixed = true; validateImportRow(r); render();
    });
  };
  $('#impTpl', m.el).onclick = e => busy(e.currentTarget, async () => { try { await loadXLSX(); downloadTemplate(); } catch (err) { fail(err); } });
  $('#impFile', m.el).onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    $('#impName', m.el).textContent = file.name;
    $('#impBody', m.el).innerHTML = '<div class="empty">جارٍ قراءة الملف...</div>';
    try {
      await loadXLSX();
      const sheet = readSheetRows(await file.arrayBuffer());
      if (!sheet) { rows = []; render(); $('#impBody', m.el).innerHTML = '<div class="alert">لم يتم التعرّف على أعمدة الملف. استخدم النموذج، أو تأكد أن أول صف فيه عناوين الأعمدة (الاسم، الهاتف، العنوان، المحافظة، المبلغ).</div>'; return; }
      rows = buildImportRows(sheet);
      rows.forEach(r => { if (!r.governorate) r.govFixed = true; });
      if (!rows.length) { $('#impBody', m.el).innerHTML = '<div class="alert">الملف لا يحتوي على طلبات.</div>'; }
      render();
    } catch (err) { fail(err); $('#impBody', m.el).innerHTML = ''; }
    e.target.value = '';
  };
  $('#impSave', m.el).onclick = e => {
    const clientId = A ? $('#impClient', m.el).value : S.profile.client_id;
    if (!clientId) return toast('اختر العميل أولًا', 'err');
    const ok = rows.filter(r => !r.errors.length);
    const btn = e.currentTarget;
    busy(btn, async () => {
      let done = 0;
      for (let i = 0; i < ok.length; i += 100) {
        const chunk = ok.slice(i, i + 100).map(r => ({
          client_id: clientId, customer_name: r.customer_name, customer_phone: r.customer_phone, customer_phone2: r.customer_phone2,
          governorate: r.governorate, city: r.city, address: r.address, items: r.items, pieces: r.pieces,
          cod_amount: r.cod_amount, client_ref: r.client_ref, notes: r.notes, allow_open: r.allow_open }));
        const { error } = await sb.from('orders').insert(chunk);
        if (error) { fail(error); if (done) toast(`تمت إضافة ${done} طلب قبل حدوث الخطأ`, 'ok'); loadOrders(); return; }
        done += chunk.length; btn.textContent = `جارٍ الإضافة... ${done}/${ok.length}`;
      }
      toast(`تمت إضافة ${done} طلب`, 'ok'); m.close(); loadOrders();
    });
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
    <th class="hide-sm">الرمز</th><th>العلامة التجارية</th><th class="hide-sm">المسؤول</th><th class="hide-sm">الهاتف</th><th class="hide-sm">التجهيز</th>
    <th class="hide-sm">المرتجع الأساسي</th><th class="hide-sm">الشحن الأساسي</th><th>حساب الدخول</th><th></th></tr></thead><tbody>
    ${S.clients.map(c => `<tr data-id="${c.id}">
      <td class="num muted hide-sm">${c.code}</td>
      <td><b>${esc(c.name)}</b>${c.active ? '' : ' <span class="badge b-muted">موقوف</span>'}</td>
      <td class="hide-sm">${esc(c.contact_name || '')}</td><td class="hide-sm"><span class="ltr">${esc(c.phone || '')}</span></td>
      <td class="num hide-sm">${money(c.fulfillment_fee)}</td>
      <td class="num hide-sm">${money(c.return_fee)}</td><td class="num hide-sm">${money(c.default_shipping_fee)}</td>
      <td>${hasLogin.has(c.id) ? `<span class="badge b-green">مفعّل</span> <span class="muted small ltr">${esc(c.login_email)}</span>`
        : `<button class="btn sm" data-login>إنشاء حساب</button>`}</td>
      <td><button class="btn sm" data-edit>تعديل</button></td></tr>`).join('')
      || '<tr><td colspan="9" class="empty">لا يوجد عملاء بعد، اضغط "عميل جديد"</td></tr>'}
    </tbody></table></div></div>`;
  $$('#view tr[data-id]').forEach(tr => {
    const c = S.clients.find(x => x.id === tr.dataset.id);
    $('[data-edit]', tr).onclick = () => openClient(c);
    const l = $('[data-login]', tr); if (l) l.onclick = () => openLogin(c);
  });
}

async function openClient(c) {
  const isNew = !c; c = c || { active: true, fulfillment_fee: 0, return_fee: 0, default_shipping_fee: 0 };
  let rates = {};
  if (!isNew) {
    const { data } = await sb.from('client_shipping_rates').select('*').eq('client_id', c.id);
    (data || []).forEach(r => rates[r.governorate] = r);
  }
  const body = `<form id="clientForm">
    <div class="grid g2">
      <label class="f"><span>اسم العلامة التجارية *</span><input name="name" required value="${esc(c.name)}"></label>
      <label class="f"><span>اسم المسؤول</span><input name="contact_name" value="${esc(c.contact_name)}"></label>
      <label class="f"><span>رقم الهاتف</span><input name="phone" dir="ltr" value="${esc(c.phone)}"></label>
      <label class="f"><span>عنوان الاستلام</span><input name="pickup_address" value="${esc(c.pickup_address)}"></label>
      <label class="f span-all"><span>ملاحظات</span><input name="notes" value="${esc(c.notes)}"></label>
      <label class="chk"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}> العميل نشط</label>
    </div>
    <div class="section-title">الأسعار الخاصة بالعميل (بالجنيه)</div>
    <div class="grid g3">
      <label class="f"><span>التجهيز والتغليف / طلب</span><input name="fulfillment_fee" type="number" step="0.01" min="0" value="${esc(c.fulfillment_fee)}"></label>
      <label class="f"><span>سعر المرتجع الأساسي</span><input name="return_fee" type="number" step="0.01" min="0" value="${esc(c.return_fee)}"></label>
      <label class="f"><span>سعر الشحن الأساسي</span><input name="default_shipping_fee" type="number" step="0.01" min="0" value="${esc(c.default_shipping_fee)}"></label>
    </div>
    <p class="hint">الطلب المسلَّم: التكلفة = الشحن + التجهيز. الطلب المرتجع: التكلفة = المرتجع + التجهيز. الصافي للعميل = المبلغ المحصّل − التكلفة.</p>
    <div class="section-title">أسعار كل محافظة <span class="hint">— الخانة الفارغة تأخذ السعر الأساسي</span></div>
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
      notes: nz(f.notes), active: f.active, fulfillment_fee: num(f.fulfillment_fee),
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
      toast(isNew ? 'تمت إضافة العميل' : 'تم الحفظ', 'ok'); m.close();
      await viewClients();
      if (isNew && await confirmBox(`هل تريد إنشاء حساب دخول لـ <b>${esc(res.data.name)}</b> الآن؟`, 'نعم، أنشئ الحساب')) openLogin(res.data);
    });
  };
}

function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let p = ''; const a = crypto.getRandomValues(new Uint32Array(10));
  a.forEach(x => p += chars[x % chars.length]); return p;
}

function openLogin(c) {
  const body = `<div class="alert info">سيدخل العميل بهذا البريد الإلكتروني وكلمة المرور، ولن يرى إلا طلباته وتسوياته.</div>
    <form id="loginMk" class="grid">
      <label class="f"><span>بريد الدخول *</span><input name="email" type="email" required dir="ltr" value="${esc(c.login_email)}"></label>
      <label class="f"><span>كلمة المرور *</span><input name="password" required minlength="6" dir="ltr" value="${genPassword()}"></label>
    </form><div id="loginDone"></div>`;
  const m = modal({ title: `حساب دخول — ${esc(c.name)}`, body, footer: '<button class="btn primary" id="mkBtn">إنشاء الحساب</button>' });
  $('#mkBtn', m.el).onclick = e => {
    const form = $('#loginMk', m.el);
    if (!form.reportValidity()) return;
    const f = formValues(form); const btn = e.currentTarget;
    busy(btn, async () => {
      // 1) ربط البريد بالعميل أولًا  2) إنشاء الحساب — الخادم يربطهما تلقائيًا
      const u = await sb.from('clients').update({ login_email: f.email.toLowerCase() }).eq('id', c.id);
      if (u.error) return fail(u.error);
      const tmp = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'op-tmp' } });
      const { data, error } = await tmp.auth.signUp({ email: f.email.toLowerCase(), password: f.password });
      if (error) return fail(error);
      const needsConfirm = data.user && !data.session;
      const link = location.origin + location.pathname;
      const msg = `مرحبًا ${c.contact_name || c.name}،\nهذه بيانات حسابك على نظام Operative:\nالرابط: ${link}\nالبريد الإلكتروني: ${f.email.toLowerCase()}\nكلمة المرور: ${f.password}`;
      form.remove(); setTimeout(() => btn.closest('.modal-f')?.remove());
      $('#loginDone', m.el).innerHTML = `<div class="alert ok">تم إنشاء الحساب ✓</div>
        ${needsConfirm ? '<div class="alert">يجب على العميل تفعيل الحساب من بريده الإلكتروني أولًا (أو أوقف تأكيد البريد من إعدادات Supabase).</div>' : ''}
        <p class="small muted">أرسل هذه الرسالة إلى العميل:</p><div class="copybox" id="cpy">${esc(msg)}</div>
        <p><button class="btn sm" id="cpyBtn">نسخ الرسالة</button></p>`;
      $('#cpyBtn', m.el).onclick = () => navigator.clipboard.writeText(msg).then(() => toast('تم النسخ', 'ok'));
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
      <th class="hide-sm">التاريخ</th><th class="hide-sm">الطلبات</th><th class="hide-sm">المحصّل</th><th class="hide-sm">التكلفة</th><th>الصافي للعميل</th><th>الحالة</th></tr></thead><tbody>
      ${(data || []).map(s => `<tr class="click" data-id="${s.id}"><td class="num"><b>${s.settlement_no}</b></td>
        ${S.isAdmin ? `<td>${esc(clientName(s.client_id))}</td>` : ''}<td class="num hide-sm">${dt(s.created_at)}</td>
        <td class="num hide-sm">${s.orders_count}</td><td class="num hide-sm">${money(s.total_collected)}</td><td class="num hide-sm">${money(s.total_fees)}</td>
        <td>${signed(s.net_amount)}</td>
        <td>${s.status === 'paid' ? `<span class="badge b-green">مدفوعة</span> <span class="muted small">${dt(s.paid_at)}</span>` : '<span class="badge b-amber">غير مدفوعة</span>'}</td></tr>`).join('')
        || `<tr><td colspan="8" class="empty">لا توجد تسويات بعد</td></tr>`}</tbody></table></div>`;
    $$('#sPanel tr[data-id]').forEach(tr => tr.onclick = () => openSettlement((data || []).find(s => s.id === tr.dataset.id), load));
  };
  if (S.isAdmin) $('#sClient').onchange = load;
  await load();
}

const orderCost = o => o.status === 'returned' ? +o.return_fee + +o.fulfillment_fee : +o.shipping_fee + +o.fulfillment_fee;
const feeRow = o => `<td class="num">${money(o.collected_amount)}</td>
  <td class="num">${o.status === 'delivered' ? money(o.shipping_fee) : '—'}</td>
  <td class="num">${o.status === 'returned' ? money(o.return_fee) : '—'}</td>
  <td class="num">${money(o.fulfillment_fee)}</td>
  <td class="num">${money(orderCost(o))}</td><td>${signed(o.net_amount)}</td>`;
const feeHead = '<th>المحصّل</th><th>الشحن</th><th>المرتجع</th><th>التجهيز</th><th>التكلفة</th><th>الصافي</th>';

function newSettlement() {
  const m = modal({ title: 'تسوية جديدة', wide: true,
    body: `<div class="toolbar">${clientSelect('nsClient', '— اختر العميل —')}</div><div id="nsBody"><p class="muted">اختر العميل لعرض الطلبات المسلّمة والمرتجعة التي لم تُسوَّ بعد.</p></div>`,
    footer: '<button class="btn primary" id="nsSave" disabled>تأكيد التسوية</button>' });
  let rows = [];
  const recalc = () => {
    const ids = $$('.nsSel:checked', m.el).map(c => c.value);
    const sel = rows.filter(r => ids.includes(r.id));
    const col = sel.reduce((a, o) => a + +o.collected_amount, 0);
    const net = sel.reduce((a, o) => a + +o.net_amount, 0);
    $('#nsTot', m.el).innerHTML = `<div><span class="muted small">عدد الطلبات</span><b>${sel.length}</b></div>
      <div><span class="muted small">المحصّل</span><b>${egp(col)}</b></div><div><span class="muted small">التكلفة</span><b>${egp(col - net)}</b></div>
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
    if (!rows.length) { $('#nsBody', m.el).innerHTML = '<div class="empty">لا توجد طلبات جاهزة للتسوية لهذا العميل</div>'; return; }
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
    toast('تم إنشاء التسوية', 'ok'); m.close();
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
      <dt>التاريخ</dt><dd>${dt(s.created_at)}</dd><dt>الحالة</dt><dd>${s.status === 'paid' ? `مدفوعة ${dt(s.paid_at)}${s.payment_ref ? ' — ' + esc(s.payment_ref) : ''}` : 'غير مدفوعة'}</dd></dl></div>
    <div class="stmt-totals"><div><span class="muted small">عدد الطلبات</span><b>${s.orders_count}</b></div>
      <div><span class="muted small">إجمالي المحصّل</span><b>${egp(s.total_collected)}</b></div>
      <div><span class="muted small">إجمالي التكلفة</span><b>${egp(s.total_fees)}</b></div>
      <div><span class="muted small">الصافي للعميل</span><b>${egp(s.net_amount)}</b></div></div>
    <table class="t"><thead><tr><th>رقم</th><th>المستلم</th><th>المحافظة</th><th>الحالة</th>${feeHead}</tr></thead>
    <tbody>${(orders || []).map(o => `<tr><td class="num">${orderNo(o)}${o.client_ref ? ` <span class="muted small">(${esc(o.client_ref)})</span>` : ''}</td>
      <td>${esc(o.customer_name)}</td><td>${esc(o.governorate)}</td><td>${badge(o.status)}</td>${feeRow(o)}</tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="4">الإجمالي</td><td class="num">${money(s.total_collected)}</td><td colspan="4"></td><td>${signed(s.net_amount)}</td></tr></tfoot></table>
    ${s.notes ? `<p class="small"><b>ملاحظات:</b> ${esc(s.notes)}</p>` : ''}`;
  const A = S.isAdmin;
  const m = modal({ title: `تسوية رقم ${s.settlement_no}`, body: `<div class="table-wrap">${stmt}</div>`, wide: true,
    footer: `<button class="btn primary" id="stPrint">طباعة / حفظ PDF</button>
      ${A && s.status !== 'paid' ? '<button class="btn" id="stPaid">تسجيل الدفع</button>' : ''}
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
      <label class="f"><span>طريقة / مرجع الدفع</span><input name="payment_ref" placeholder="مثال: إنستاباي، تحويل بنكي، نقدًا"></label>
      <label class="f"><span>ملاحظات</span><input name="notes" value="${esc(s.notes)}"></label></form>`,
      footer: '<button class="btn primary" id="payOk">تأكيد</button>' });
    $('#payOk', pm.el).onclick = e => busy(e.currentTarget, async () => {
      const f = formValues($('#payF', pm.el));
      const { error } = await sb.from('settlements').update({ status: 'paid', paid_at: new Date().toISOString(),
        payment_ref: nz(f.payment_ref), notes: nz(f.notes) }).eq('id', s.id);
      if (error) return fail(error);
      toast('تم تسجيل الدفع', 'ok'); pm.close(); m.close(); reload();
    });
  };
  const del = $('#stDel', m.el);
  if (del) del.onclick = async () => {
    if (!await confirmBox('سيؤدي إلغاء التسوية إلى إعادة طلباتها إلى حالة "غير مسوّاة". هل تريد المتابعة؟', 'إلغاء التسوية', true)) return;
    const { error } = await sb.from('settlements').delete().eq('id', s.id);
    if (error) return fail(error);
    toast('تم إلغاء التسوية', 'ok'); m.close(); reload();
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
