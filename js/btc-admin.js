/* ==========================================================================
   Beneath the Crescent — Store Insights (mockup UI)
   Hash-routed single page: #/dashboard, #/inventory, #/orders, #/customers,
   #/calls, #/reports/<name>
   ========================================================================== */
(function () {
  "use strict";
  const B = window.BTC;
  const R = window.BTCReports;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const view = $("#view");

  // ---------- formatting ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n, cents = false) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  const money2 = (n) => money(n, true);
  const pct = (n, d = 0) => (n * 100).toFixed(d) + "%";
  const num = (n, d = 0) => Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
  const fDate = (d) => d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
  const fDateY = (d) => d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const fTime = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const fDow = (d) => d.toLocaleDateString("en-US", { weekday: "short" });
  const ago = (d) => {
    if (!d) return "never";
    const n = R.ageDays(d);
    return n === 0 ? "today" : n === 1 ? "yesterday" : n + " days ago";
  };
  const change = (cur, prev) => {
    if (!prev) return "";
    const c = (cur - prev) / prev;
    return `<span class="${c >= 0 ? "up" : "down"}">${c >= 0 ? "↑" : "↓"} ${pct(Math.abs(c))}</span>`;
  };
  const statusTag = (item) => {
    const s = R.stockStatus(item);
    return `<span class="tag ${s}">${R.STATUS_LABEL[s]}</span>`;
  };
  const dot = (cat) => `<span class="dot" style="background:${B.catColor(cat)};color:${B.catColor(cat)}"></span>`;

  // ---------- small persistent state (per tablet) ----------
  const store = {
    get(k, def) { try { const v = localStorage.getItem("btc-" + k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) { try { localStorage.setItem("btc-" + k, JSON.stringify(v)); } catch { /* storage unavailable: keep in memory only */ } },
  };
  const memory = {};
  const getState = (k, def) => (k in memory ? memory[k] : (memory[k] = store.get(k, def)));
  const setState = (k, v) => { memory[k] = v; store.set(k, v); };

  // ---------- charts ----------
  let charts = [];
  const killCharts = () => { charts.forEach((c) => c.destroy()); charts = []; };
  if (window.Chart) {
    Chart.defaults.color = "#c4bdd9";
    Chart.defaults.borderColor = "rgba(155,134,234,0.14)";
    Chart.defaults.font.family = "Outfit, system-ui, sans-serif";
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.tooltip.backgroundColor = "#403a5c";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(155,134,234,0.4)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.maintainAspectRatio = false;
  }
  function chart(id, config) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    charts.push(new Chart(el, config));
  }
  const moneyTick = (v) => "$" + Number(v).toLocaleString();

  // ---------- toast / modal ----------
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }
  let modalCharts = [];
  function openModal(html, narrow = false) {
    modalCharts.forEach((c) => c.destroy()); modalCharts = [];
    const m = $("#modal"); m.className = "modal" + (narrow ? " narrow" : ""); m.innerHTML = html;
    $("#modalBg").classList.add("show");
    $("#modalBg").scrollTop = 0;
  }
  function closeModal() { $("#modalBg").classList.remove("show"); modalCharts.forEach((c) => c.destroy()); modalCharts = []; }
  $("#modalBg").addEventListener("click", (e) => { if (e.target.id === "modalBg" || e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  const modalHead = (title, sub = "") => `
    <div class="modal-head">
      <div><div class="panel-title">${title}</div>${sub ? `<div class="panel-sub">${sub}</div>` : ""}</div>
      <button class="x" data-close aria-label="Close">×</button>
    </div>`;

  // ---------- receipt ----------
  function showReceipt(orderId) {
    const o = B.orders.find((x) => x.id === orderId);
    if (!o) return;
    const c = o.customerId ? R.custById[o.customerId] : null;
    const lines = o.lines.map((l) => `
      <div class="r-row"><span>${esc(l.name)}</span><span>${money2(l.qty * l.unitPrice)}</span></div>
      ${l.qty > 1 ? `<div class="r-sub">${l.qty} @ ${money2(l.unitPrice)}</div>` : ""}`).join("");
    const pay = o.payment.method === "Card"
      ? `<div class="r-row"><span>${esc(o.payment.brand)} •••• ${o.payment.last4} (${o.payment.entry})</span><span>${money2(o.total)}</span></div>`
      : `<div class="r-row"><span>Cash tendered</span><span>${money2(o.payment.tendered)}</span></div>
         <div class="r-row"><span>Change</span><span>${money2(o.payment.change)}</span></div>`;
    openModal(`
      ${modalHead("Receipt #" + o.number, fDateY(o.createdAt) + " · " + fTime(o.createdAt))}
      <div class="modal-body">
        <div class="receipt" id="receiptPaper">
          <div class="r-center">
            <div class="r-store">${esc(B.store.name)}</div>
            <div>${esc(B.store.city)} · ${esc(B.store.phone)}</div>
          </div>
          <hr />
          <div class="r-row"><span>Order</span><span>#${o.number}</span></div>
          <div class="r-row"><span>Clover ID</span><span>${o.id}</span></div>
          <div class="r-row"><span>${fDateY(o.createdAt)}</span><span>${fTime(o.createdAt)}</span></div>
          <div class="r-row"><span>Served by</span><span>${esc(o.employeeName)}</span></div>
          <div class="r-row"><span>Customer</span><span>${c ? esc(c.name) : "Walk-in"}</span></div>
          <hr />
          ${lines}
          <hr />
          <div class="r-row"><span>Subtotal</span><span>${money2(o.subtotal)}</span></div>
          ${o.discount ? `<div class="r-row"><span>Discount: ${esc(o.discount.name)}</span><span>-${money2(o.discount.amount)}</span></div>` : ""}
          <div class="r-row"><span>NJ Sales Tax (6.625%)</span><span>${money2(o.tax)}</span></div>
          <div class="r-row r-total"><span>TOTAL</span><span>${money2(o.total)}</span></div>
          <hr />
          ${pay}
          ${o.refund ? `<hr /><div class="r-row r-refund"><span>REFUNDED ${fDate(new Date(o.createdAt.getTime() + o.refund.daysLater * 864e5))}: ${esc(R.itemById[o.refund.itemId]?.name || "item")}</span><span>-${money2(o.refund.amount)}</span></div>
             <div class="r-sub r-refund">Reason: ${esc(o.refund.reason)}</div>` : ""}
          <hr />
          <div class="r-center">Thank you — may the moon light your way ☾</div>
        </div>
        <div class="controls" style="margin-top:1rem;justify-content:flex-end">
          ${c ? `<button class="btn btn-ghost" data-cust="${c.id}">View ${esc(c.firstName)}'s history</button>` : ""}
          <button class="btn btn-primary" id="printReceipt">Print</button>
        </div>
      </div>`, true);
    $("#printReceipt").onclick = () => { document.body.classList.add("printing-receipt"); window.print(); document.body.classList.remove("printing-receipt"); };
  }

  // ---------- item detail ----------
  function showItem(itemId) {
    const i = R.itemById[itemId];
    if (!i) return;
    const v = R.velocity(i.id);
    const ls = R.lastSold(i.id);
    const cover = v ? i.qtyInStock / v : null;
    const weeks = R.itemWeeklyUnits(i.id, 26);
    openModal(`
      ${modalHead(esc(i.name), `${esc(i.category)} · SKU ${i.sku} · ${statusTag(i)}`)}
      <div class="modal-body">
        <p class="muted" style="margin-bottom:1rem">${esc(i.description)}</p>
        <div class="detail-grid">
          <div class="detail"><div class="l">In stock</div><div class="v">${i.qtyInStock}</div></div>
          <div class="detail"><div class="l">On order</div><div class="v">${i.qtyOnOrder}</div></div>
          <div class="detail"><div class="l">Reorder at</div><div class="v">${i.unique ? "—" : i.reorderPoint}</div></div>
          <div class="detail"><div class="l">Sells / week</div><div class="v">${v ? num(v * 7, 1) : "—"}</div></div>
          <div class="detail"><div class="l">Cost</div><div class="v">${money2(i.cost)}</div></div>
          <div class="detail"><div class="l">Price</div><div class="v">${money2(i.price)}</div></div>
          <div class="detail"><div class="l">Margin</div><div class="v">${pct((i.price - i.cost) / i.price)}</div></div>
          <div class="detail"><div class="l">Last sold</div><div class="v">${ls ? fDate(ls) : "Never"}</div></div>
        </div>
        <p class="small muted" style="margin-bottom:0.75rem">
          ${i.qtyInStock === 0 && !i.unique ? "<span class='pink'>Out of stock</span> — " : ""}
          ${cover != null && i.qtyInStock > 0 ? `About <strong>${Math.round(cover)} days</strong> of stock left at the current pace. ` : ""}
          Vendor: ${esc(i.vendor)} · sold in packs of ${i.minOrderQty}.
        </p>
        <div class="panel" style="margin:0"><div class="panel-head"><div class="panel-title" style="font-size:1.1rem">Units sold per week · last 26 weeks</div></div>
          <div class="panel-body"><div class="chart-box short"><canvas id="itemChart"></canvas></div></div></div>
      </div>`);
    const el = $("#itemChart");
    if (el && window.Chart) modalCharts.push(new Chart(el, {
      type: "bar",
      data: { labels: weeks.map((w) => fDate(w.weekEnding)), datasets: [{ data: weeks.map((w) => w.units), backgroundColor: B.catColor(i.category), borderRadius: 4 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 9 } }, y: { beginAtZero: true, ticks: { precision: 0 } } } },
    }));
  }

  // ---------- customer detail ----------
  function showCustomer(custId) {
    const c = R.custById[custId];
    if (!c) return;
    const s = R.customerSummary(c);
    const due = R.callList().find((r) => r.customer.id === c.id);
    openModal(`
      ${modalHead(esc(c.name), `<a class="teal" href="tel:${c.phone.replace(/\D/g, "")}">${esc(c.phone)}</a> · ${esc(c.email)} · ${c.smsOptIn ? "<span class='teal'>OK to text</span>" : "Call only (no text consent)"}`)}
      <div class="modal-body">
        <div class="detail-grid">
          <div class="detail"><div class="l">Visits (6 mo)</div><div class="v">${s.visits}</div></div>
          <div class="detail"><div class="l">Spent</div><div class="v">${money(s.spend)}</div></div>
          <div class="detail"><div class="l">Avg sale</div><div class="v">${money2(s.avgSale)}</div></div>
          <div class="detail"><div class="l">Last visit</div><div class="v">${s.lastVisit ? fDate(s.lastVisit) : "—"}</div></div>
        </div>
        ${c.note ? `<div class="callout teal"><strong>Note:</strong> ${esc(c.note)}</div>` : ""}
        ${due ? `<div class="callout"><strong>Due for a call:</strong> ${due.items.map((d) => esc(d.item.name)).join(", ")} — usually every ${due.items[0].usual} days.</div>` : ""}
        <p class="small muted" style="margin-bottom:0.5rem">Usually buys: ${s.topItems.map(esc).join(", ") || "—"}</p>
        <div class="panel" style="margin:0"><div class="panel-body flush table-wrap" style="max-height:340px;overflow-y:auto">
          <table class="t"><thead><tr><th>Date</th><th>Order</th><th>Items</th><th class="right">Total</th></tr></thead><tbody>
          ${s.orders.map((o) => `<tr class="click" data-order="${o.id}"><td class="nowrap">${fDateY(o.createdAt)}</td><td>#${o.number}</td>
            <td class="small">${o.lines.map((l) => (l.qty > 1 ? l.qty + "× " : "") + esc(l.name)).join(", ")}</td><td class="right num">${money2(o.total)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">No orders</td></tr>`}
          </tbody></table></div></div>
      </div>`);
  }

  // Global click delegation for rows/links that open details
  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-order]"); if (o) { showReceipt(o.dataset.order); return; }
    const c = e.target.closest("[data-cust]"); if (c) { showCustomer(c.dataset.cust); return; }
    const i = e.target.closest("[data-item]"); if (i && !e.target.closest("input")) { showItem(i.dataset.item); }
  });

  /* ======================================================================
     VIEWS
     ====================================================================== */

  function head(title, sub, controls = "") {
    return `<div class="page-head"><div><h2 class="page-title">${title}</h2>${sub ? `<p class="page-sub">${sub}</p>` : ""}</div>${controls ? `<div class="controls">${controls}</div>` : ""}</div>`;
  }
  const seg = (name, opts, cur) => `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(cur) ? "on" : ""}">${l}</button>`).join("")}</div>`;
  function bindSeg(name, cb) {
    const s = $(`[data-seg="${name}"]`); if (!s) return;
    s.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) cb(b.dataset.v); });
  }

  // ---------------- Dashboard ----------------
  function vDashboard() {
    const k = R.kpis();
    const outs = R.stockouts();
    const low = R.runningLow().slice(0, 6);
    const top = R.bestSellers(30, "revenue", 7);
    const daily = R.dailySales(30);
    const hour = B.today.getHours();
    const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    view.innerHTML = `
      ${head(greet, `${B.today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · here's how the shop is doing.`)}
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">Sales today</div><div class="kpi-value">${money(k.today.sales)}</div><div class="kpi-note">${k.today.orders} orders so far</div></div>
        <div class="kpi purple"><div class="kpi-label">Last 7 days</div><div class="kpi-value">${money(k.last7.sales)}</div><div class="kpi-note">${change(k.last7.sales, k.prev7.sales)} vs the week before</div></div>
        <div class="kpi pink"><div class="kpi-label">Last 30 days</div><div class="kpi-value">${money(k.last30.sales)}</div><div class="kpi-note">${change(k.last30.sales, k.prev30.sales)} vs the 30 days before</div></div>
        <div class="kpi yellow"><div class="kpi-label">Average sale</div><div class="kpi-value">${money2(k.avgSale30)}</div><div class="kpi-note">last 30 days, before tax</div></div>
      </div>
      <div class="kpis">
        <a class="kpi pink" href="#/reports/stockouts"><div class="kpi-label">Best sellers out of stock</div><div class="kpi-value">${k.outCount}</div><div class="kpi-note">≈ <strong class="pink">${money(k.lostPerWeek)}/week</strong> in missed sales →</div></a>
        <a class="kpi" href="#/reports/restock"><div class="kpi-label">Suggested restock</div><div class="kpi-value">${money(k.restockCost)}</div><div class="kpi-note">at cost, ready for approval →</div></a>
        <a class="kpi purple" href="#/calls"><div class="kpi-label">Regulars due for a call</div><div class="kpi-value">${k.callsDue}</div><div class="kpi-note">their usual items are in stock →</div></a>
        <a class="kpi yellow" href="#/reports/dead"><div class="kpi-label">Cash sitting in slow stock</div><div class="kpi-value">${money(k.deadCash)}</div><div class="kpi-note">${k.deadCount} items with no sale in 60+ days →</div></a>
      </div>

      <div class="grid-2">
        <div class="panel"><div class="panel-head"><div><div class="panel-title">Daily sales</div><div class="panel-sub">Last 30 days · closed Mondays</div></div></div>
          <div class="panel-body"><div class="chart-box" style="height:400px"><canvas id="cDaily"></canvas></div></div></div>
        <div class="panel"><div class="panel-head"><div><div class="panel-title">Top sellers</div><div class="panel-sub">Last 30 days by sales</div></div><a class="btn btn-ghost btn-sm" href="#/reports/best">All</a></div>
          <div class="panel-body flush table-wrap"><table class="t"><tbody>
            ${top.map((r, ix) => `<tr class="click" data-item="${r.item.id}"><td class="rank">${ix + 1}</td><td><div class="item-name">${esc(r.item.name)}</div><div class="item-sub">${r.units} sold · ${statusTag(r.item)}</div></td><td class="right num">${money(r.revenue)}</td></tr>`).join("")}
          </tbody></table></div></div>
      </div>

      <div class="grid-even">
        <div class="panel"><div class="panel-head"><div><div class="panel-title">You're out of what sells</div><div class="panel-sub">Steady sellers now at zero</div></div><a class="btn btn-ghost btn-sm" href="#/reports/stockouts">Details</a></div>
          <div class="panel-body flush table-wrap"><table class="t"><thead><tr><th>Item</th><th class="right">Out for</th><th class="right">Missed so far</th></tr></thead><tbody>
            ${outs.slice(0, 6).map((r) => `<tr class="click" data-item="${r.item.id}"><td><div class="item-name">${dot(r.item.category)}${esc(r.item.name)}</div><div class="item-sub">usually ${num(r.weeklyUnits, 0)} / week${r.item.qtyOnOrder ? " · <span class='yellow'>" + r.item.qtyOnOrder + " on order</span>" : ""}</div></td><td class="right">${r.daysOut} days</td><td class="right num pink">${money(r.lostRevenue)}</td></tr>`).join("")}
          </tbody></table></div></div>
        <div class="panel"><div class="panel-head"><div><div class="panel-title">Running low</div><div class="panel-sub">Less than 3 weeks left at the current pace</div></div></div>
          <div class="panel-body flush table-wrap"><table class="t"><thead><tr><th>Item</th><th class="right">On hand</th><th class="right">Days left</th></tr></thead><tbody>
            ${low.map((r) => `<tr class="click" data-item="${r.item.id}"><td><div class="item-name">${dot(r.item.category)}${esc(r.item.name)}</div><div class="item-sub">${num(r.weeklyUnits, 1)} / week</div></td><td class="right">${r.item.qtyInStock}</td><td class="right ${r.daysCover < 10 ? "pink" : "yellow"}">${Math.round(r.daysCover)}</td></tr>`).join("") || `<tr><td class="empty" colspan="3">Nothing running low</td></tr>`}
          </tbody></table></div></div>
      </div>
      <div class="callout"><strong>Only ${pct(k.customerAttachRate)} of sales have a customer attached.</strong> Asking "Can I get a phone number for your receipt?" at checkout is what grows the call list and the customer history.</div>`;

    chart("cDaily", {
      type: "bar",
      data: {
        labels: daily.map((d) => fDow(d.date)[0] + " " + d.date.getDate()),
        datasets: [{ data: daily.map((d) => Math.round(d.sales)), backgroundColor: daily.map((d) => d.date.getDay() === 6 ? "#ea8cc8" : d.date.getDay() === 0 ? "#9b86ea" : "#5ec8c4"), borderRadius: 4 }],
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { callbacks: { title: (c) => fDow(daily[c[0].dataIndex].date) + ", " + fDate(daily[c[0].dataIndex].date), label: (c) => money(c.raw) + " · " + daily[c.dataIndex].orders + " orders" } } },
        scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }, y: { ticks: { callback: moneyTick } } },
      },
    });
  }

  // ---------------- Inventory ----------------
  const invState = { q: "", cat: "", status: "all" };
  function vInventory() {
    const statuses = [
      ["all", "All"], ["out", "Out of stock"], ["low", "Low"], ["ordered", "On order"], ["dead", "Not selling"], ["unique", "One-of-a-kind"],
    ];
    const match = (i, s) => {
      const st = R.stockStatus(i);
      if (s === "all") return true;
      if (s === "out") return st === "out" || st === "out-ordered";
      if (s === "low") return st === "low" || st === "low-ordered";
      if (s === "ordered") return i.qtyOnOrder > 0;
      if (s === "dead") return st === "dead";
      if (s === "unique") return i.unique;
    };
    const counts = Object.fromEntries(statuses.map(([s]) => [s, B.items.filter((i) => match(i, s)).length]));
    view.innerHTML = `
      ${head("Inventory", "Counts come straight from Clover and go down with every sale — no counting by hand.",
        `<input class="input" id="invQ" placeholder="Search items or SKU…" value="${esc(invState.q)}" />
         <select class="select" id="invCat"><option value="">All categories</option>${B.categories.map((c) => `<option ${c.name === invState.cat ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>`)}
      <div class="chips" style="margin-bottom:1rem">${statuses.map(([s, l]) => `<button class="chip ${invState.status === s ? "on" : ""}" data-st="${s}">${l}<span class="n">${counts[s]}</span></button>`).join("")}</div>
      <div class="panel"><div class="panel-body flush table-wrap"><table class="t">
        <thead><tr><th>Item</th><th>Category</th><th class="right">In stock</th><th class="right">On order</th><th class="right">Reorder at</th><th class="right">Cost</th><th class="right">Price</th><th class="right">Margin</th><th>Status</th><th>Last sold</th></tr></thead>
        <tbody id="invBody"></tbody><tfoot id="invFoot"></tfoot></table></div></div>`;
    function render() {
      const q = invState.q.toLowerCase();
      const rows = B.items.filter((i) => (!invState.cat || i.category === invState.cat) && match(i, invState.status) &&
        (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)));
      $("#invBody").innerHTML = rows.map((i) => `
        <tr class="click" data-item="${i.id}">
          <td><div class="item-name">${dot(i.category)}${esc(i.name)}</div><div class="item-sub">${i.sku} · ${esc(i.description.length > 60 ? i.description.slice(0, 58) + "…" : i.description)}</div></td>
          <td class="small nowrap">${esc(i.category)}</td>
          <td class="right num ${i.qtyInStock === 0 && !i.unique ? "pink" : ""}">${i.qtyInStock}</td>
          <td class="right num">${i.qtyOnOrder || "—"}</td>
          <td class="right num muted">${i.unique ? "—" : i.reorderPoint}</td>
          <td class="right num">${money2(i.cost)}</td>
          <td class="right num">${money2(i.price)}</td>
          <td class="right num muted">${pct((i.price - i.cost) / i.price)}</td>
          <td>${statusTag(i)}</td>
          <td class="small nowrap muted">${R.lastSold(i.id) ? fDate(R.lastSold(i.id)) : "Never"}</td>
        </tr>`).join("") || `<tr><td colspan="10" class="empty">No items match</td></tr>`;
      const units = rows.reduce((s, i) => s + i.qtyInStock, 0);
      $("#invFoot").innerHTML = `<tr><td colspan="2">${rows.length} items</td><td class="right num">${num(units)}</td><td></td><td></td>
        <td class="right num" colspan="2">${money(rows.reduce((s, i) => s + i.qtyInStock * i.cost, 0))} at cost</td><td colspan="3" class="muted small">${money(rows.reduce((s, i) => s + i.qtyInStock * i.price, 0))} at retail</td></tr>`;
    }
    render();
    $("#invQ").addEventListener("input", (e) => { invState.q = e.target.value; render(); });
    $("#invCat").addEventListener("change", (e) => { invState.cat = e.target.value; render(); });
    $$(".chip[data-st]").forEach((b) => b.addEventListener("click", () => { invState.status = b.dataset.st; vInventory(); }));
  }

  // ---------------- Orders ----------------
  const ordState = { range: "7", q: "", limit: 60 };
  function vOrders() {
    view.innerHTML = `
      ${head("Orders", "Every Clover sale with its receipt. Tap a row to see it.",
        `${seg("range", [["0", "Today"], ["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All"]], ordState.range)}
         <input class="input" id="ordQ" placeholder="Order #, customer or item…" value="${esc(ordState.q)}" />`)}
      <div class="callout teal" id="ordSum"></div>
      <div class="panel"><div class="panel-body flush table-wrap"><table class="t">
        <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th class="right">Total</th><th>Payment</th><th></th></tr></thead>
        <tbody id="ordBody"></tbody></table></div>
        <div class="panel-foot" id="ordMore"></div></div>`;
    function render() {
      const q = ordState.q.toLowerCase().replace(/^#/, "");
      const from = ordState.range === "all" ? 0 : new Date(B.today.getTime() - +ordState.range * 864e5).setHours(0, 0, 0, 0);
      const list = B.orders.filter((o) => o.createdAt.getTime() >= from).filter((o) => {
        if (!q) return true;
        const c = o.customerId ? R.custById[o.customerId].name.toLowerCase() : "walk-in";
        return String(o.number).includes(q) || o.id.toLowerCase().includes(q) || c.includes(q) || o.lines.some((l) => l.name.toLowerCase().includes(q));
      }).slice().reverse();
      const sales = list.reduce((s, o) => s + o.total - o.tax, 0);
      const withC = list.filter((o) => o.customerId).length;
      $("#ordSum").innerHTML = `<strong>${num(list.length)} orders · ${money(sales)} in sales</strong> (before tax) · average ${money2(list.length ? sales / list.length : 0)} · ${list.length ? pct(withC / list.length) : "0%"} had a customer attached`;
      $("#ordBody").innerHTML = list.slice(0, ordState.limit).map((o) => {
        const c = o.customerId ? R.custById[o.customerId] : null;
        const n = o.lines.reduce((s, l) => s + l.qty, 0);
        return `<tr class="click" data-order="${o.id}">
          <td class="num">#${o.number}</td>
          <td class="nowrap">${fDow(o.createdAt)} ${fDate(o.createdAt)} <span class="muted small">${fTime(o.createdAt)}</span></td>
          <td>${c ? esc(c.name) : `<span class="tag walkin">Walk-in</span>`}</td>
          <td class="col-wide"><div>${esc(o.lines[0].name)}${o.lines.length > 1 ? ` <span class="muted">+${o.lines.length - 1} more</span>` : ""}</div><div class="item-sub">${n} item${n === 1 ? "" : "s"}</div></td>
          <td class="right num">${money2(o.total)}</td>
          <td class="small nowrap">${o.payment.method === "Card" ? esc(o.payment.brand === "Mastercard" ? "MC" : o.payment.brand) + " ••" + o.payment.last4.slice(-2) : "Cash"}<div class="item-sub">${esc(o.employeeName)}</div></td>
          <td>${o.refund ? `<span class="tag out">Refund</span>` : o.discount ? `<span class="tag unique">Discount</span>` : ""}</td>
        </tr>`;
      }).join("") || `<tr><td colspan="7" class="empty">No orders</td></tr>`;
      $("#ordMore").innerHTML = list.length > ordState.limit ? `<button class="btn btn-ghost show-more" id="ordMoreBtn">Show more (${list.length - ordState.limit} left)</button>` : `<span class="muted">End of list</span>`;
      const mb = $("#ordMoreBtn"); if (mb) mb.onclick = () => { ordState.limit += 60; render(); };
    }
    render();
    bindSeg("range", (v) => { ordState.range = v; ordState.limit = 60; vOrders(); });
    $("#ordQ").addEventListener("input", (e) => { ordState.q = e.target.value; ordState.limit = 60; render(); });
  }

  // ---------------- Customers ----------------
  const custState = { q: "" };
  function vCustomers() {
    const all = B.customers.map(R.customerSummary).sort((a, b) => b.spend - a.spend);
    const k = R.kpis();
    view.innerHTML = `
      ${head("Customers", "Regulars who gave a phone number at checkout. Tap anyone to see what they buy.",
        `<input class="input" id="custQ" placeholder="Search name or phone…" value="${esc(custState.q)}" />`)}
      <div class="callout"><strong>${pct(k.customerAttachRate)} of sales are tied to a customer.</strong> The rest are anonymous walk-ins. Every number collected at the register makes this list, and the call list, more useful.</div>
      <div class="panel"><div class="panel-body flush table-wrap"><table class="t">
        <thead><tr><th>Customer</th><th>Phone</th><th>Texts</th><th class="right">Visits</th><th class="right">Spent</th><th class="right">Avg sale</th><th>Last visit</th><th>Usually buys</th></tr></thead>
        <tbody id="custBody"></tbody></table></div></div>`;
    function render() {
      const q = custState.q.toLowerCase();
      const rows = all.filter((s) => !q || s.customer.name.toLowerCase().includes(q) || s.customer.phone.includes(q));
      $("#custBody").innerHTML = rows.map((s) => `
        <tr class="click" data-cust="${s.customer.id}">
          <td><div class="item-name">${esc(s.customer.name)}</div><div class="item-sub">${esc(s.customer.email)}</div></td>
          <td class="nowrap num">${esc(s.customer.phone)}</td>
          <td>${s.customer.smsOptIn ? `<span class="tag ok">Opted in</span>` : `<span class="tag dead">Call only</span>`}</td>
          <td class="right num">${s.visits}</td>
          <td class="right num">${money(s.spend)}</td>
          <td class="right num">${money2(s.avgSale)}</td>
          <td class="small nowrap">${ago(s.lastVisit)}</td>
          <td class="small muted">${s.topItems.slice(0, 2).map(esc).join(", ")}</td>
        </tr>`).join("") || `<tr><td colspan="8" class="empty">No customers match</td></tr>`;
    }
    render();
    $("#custQ").addEventListener("input", (e) => { custState.q = e.target.value; render(); });
  }

  // ---------------- Call list ----------------
  const callState = { filter: "ready" };
  function vCalls() {
    const list = R.callList();
    const log = getState("calls", {});
    const ready = list.filter((r) => r.anyInStock);
    const waiting = list.filter((r) => !r.anyInStock);
    const shown = callState.filter === "ready" ? ready : callState.filter === "waiting" ? waiting : list;
    const value = ready.reduce((s, r) => s + r.callValue, 0);
    view.innerHTML = `
      ${head("Reorder call list", "Regulars whose usual consumables should be running low, based on how often they normally buy.",
        `<button class="btn btn-ghost btn-sm" id="resetCalls">Clear call notes</button>`)}
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">Ready to call</div><div class="kpi-value">${ready.length}</div><div class="kpi-note">what they buy is in stock</div></div>
        <div class="kpi yellow"><div class="kpi-label">Waiting on restock</div><div class="kpi-value">${waiting.length}</div><div class="kpi-note">call once it's back in</div></div>
        <div class="kpi purple"><div class="kpi-label">Value of one visit each</div><div class="kpi-value">${money(value)}</div><div class="kpi-note">their usual items, ready-to-call list</div></div>
        <div class="kpi pink"><div class="kpi-label">Called this week</div><div class="kpi-value">${Object.values(log).filter((x) => x && x.at && Date.now() - x.at < 7 * 864e5).length}</div><div class="kpi-note">saved on this tablet</div></div>
      </div>
      <div class="chips" style="margin-bottom:1rem">
        <button class="chip ${callState.filter === "ready" ? "on" : ""}" data-cf="ready">Ready to call<span class="n">${ready.length}</span></button>
        <button class="chip ${callState.filter === "waiting" ? "on" : ""}" data-cf="waiting">Waiting on restock<span class="n">${waiting.length}</span></button>
        <button class="chip ${callState.filter === "all" ? "on" : ""}" data-cf="all">Everyone<span class="n">${list.length}</span></button>
      </div>
      <div class="calls">${shown.map((r) => {
        const c = r.customer, l = log[c.id];
        return `<div class="call ${l ? "done" : ""}">
          <div>
            <div class="call-name"><a href="javascript:void 0" data-cust="${c.id}" style="color:inherit;text-decoration:none">${esc(c.name)}</a></div>
            <a class="call-phone" href="tel:${c.phone.replace(/\D/g, "")}">☎ ${esc(c.phone)}</a>
            <div class="call-meta">${r.visits} visits · ${money(r.spend)} spent · last in ${ago(r.lastVisit)} · ${c.smsOptIn ? "OK to text" : "<span class='yellow'>call only</span>"}</div>
            ${c.note ? `<div class="call-meta">“${esc(c.note)}”</div>` : ""}
          </div>
          <div class="call-items">${r.items.map((d) => `
            <div class="call-item">
              <strong>${esc(d.item.name)}</strong>
              ${d.item.qtyInStock > 0 ? `<span class="tag ok">${d.item.qtyInStock} in stock</span>` : d.item.qtyOnOrder ? `<span class="tag out-ordered">On order</span>` : `<span class="tag out">Out</span>`}
              <span class="od">every ~${d.usual} days · last ${fDate(d.last)} · ${d.overdue > 0 ? `<span class="pink">${d.overdue} day${d.overdue === 1 ? "" : "s"} overdue</span>` : d.overdue === 0 ? "due today" : `due in ${-d.overdue} day${d.overdue === -1 ? "" : "s"}`}</span>
            </div>`).join("")}
          </div>
          <div class="call-actions">
            ${l ? `<div class="call-status">✓ ${esc(l.result)} · ${fDate(new Date(l.at))}</div><button class="btn btn-ghost btn-sm" data-undo="${c.id}">Undo</button>` : `
              <button class="btn btn-primary btn-sm" data-log="${c.id}" data-r="Coming in">Coming in</button>
              <button class="btn btn-ghost btn-sm" data-log="${c.id}" data-r="Left voicemail">Left voicemail</button>
              <button class="btn btn-ghost btn-sm" data-log="${c.id}" data-r="Not right now">Not right now</button>`}
          </div>
        </div>`;
      }).join("") || `<div class="panel"><div class="empty">Nobody in this list right now.</div></div>`}</div>
      <div class="callout" style="margin-top:1.25rem"><strong>Calling vs texting:</strong> calling a regular customer is fine. Automated or marketing <em>texts</em> need the customer's written opt-in first (TCPA), so the "OK to text" flag is tracked per customer. Get the consent wording checked before turning on texts.</div>`;
    $$("[data-cf]").forEach((b) => b.addEventListener("click", () => { callState.filter = b.dataset.cf; vCalls(); }));
    $$("[data-log]").forEach((b) => b.addEventListener("click", () => {
      const lg = getState("calls", {}); lg[b.dataset.log] = { result: b.dataset.r, at: Date.now() }; setState("calls", lg); vCalls(); updateBadges();
    }));
    $$("[data-undo]").forEach((b) => b.addEventListener("click", () => {
      const lg = getState("calls", {}); delete lg[b.dataset.undo]; setState("calls", lg); vCalls(); updateBadges();
    }));
    $("#resetCalls").onclick = () => { setState("calls", {}); vCalls(); updateBadges(); toast("Call notes cleared"); };
  }

  /* ======================================================================
     REPORTS
     ====================================================================== */
  const REPORTS = [
    ["best", "Best & worst sellers"],
    ["stockouts", "Out of stock"],
    ["restock", "Suggested restock"],
    ["dead", "Slow / dead stock"],
    ["hours", "Busy hours"],
    ["categories", "Categories"],
    ["monthly", "Month by month"],
    ["ticket", "Average sale"],
    ["together", "Bought together"],
    ["discounts", "Discounts & refunds"],
  ];
  const repState = { days: "90", metric: "revenue", dead: "60", heat: "orders" };
  function reportShell(active, title, sub, controls, body) {
    killCharts(); // segment toggles re-render the report in place
    view.innerHTML = `
      ${head(title, sub, controls)}
      <nav class="report-tabs">${REPORTS.map(([k, l]) => `<a href="#/reports/${k}" class="${k === active ? "on" : ""}">${l}</a>`).join("")}</nav>
      ${body}`;
  }
  const periodSeg = () => seg("days", [["30", "30 days"], ["90", "90 days"], ["180", "6 months"]], repState.days);
  const bindPeriod = (fn) => bindSeg("days", (v) => { repState.days = v; fn(); });

  // 1. Best & worst sellers
  function rBest() {
    const days = +repState.days, metric = repState.metric;
    const rows = R.bestSellers(days, metric, 15);
    const worst = R.worstSellers(days, 10);
    const max = rows[0] ? rows[0][metric] : 1;
    const fmt = (v) => metric === "units" ? num(v) : money(v);
    reportShell("best", "Best & worst sellers", "What earns its shelf space. Switch to profit to see what actually makes money once cost is taken out.",
      periodSeg() + seg("metric", [["revenue", "Sales"], ["profit", "Profit"], ["units", "Units"]], metric), `
      <div class="grid-2">
        <div class="panel"><div class="panel-head"><div><div class="panel-title">Top 15 by ${metric === "revenue" ? "sales" : metric}</div><div class="panel-sub">Last ${days} days</div></div></div>
          <div class="panel-body flush table-wrap"><table class="t">
            <thead><tr><th></th><th>Item</th><th class="bar-cell"></th><th class="right">Units</th><th class="right">Sales</th><th class="right">Profit</th><th class="right">Margin</th></tr></thead><tbody>
            ${rows.map((r, ix) => `<tr class="click" data-item="${r.item.id}"><td class="rank">${ix + 1}</td>
              <td><div class="item-name">${dot(r.item.category)}${esc(r.item.name)}</div><div class="item-sub">${esc(r.item.category)} · ${statusTag(r.item)}</div></td>
              <td class="bar-cell"><div class="bar"><span style="width:${(r[metric] / max) * 100}%"></span></div></td>
              <td class="right num">${num(r.units)}</td><td class="right num">${money(r.revenue)}</td><td class="right num teal">${money(r.profit)}</td><td class="right num muted">${pct(r.margin)}</td></tr>`).join("")}
          </tbody></table></div></div>
        <div class="panel"><div class="panel-head"><div><div class="panel-title">Bottom 10 on the shelf</div><div class="panel-sub">In stock, lowest sales, last ${days} days</div></div></div>
          <div class="panel-body flush table-wrap"><table class="t"><thead><tr><th>Item</th><th class="right">Units</th><th class="right">Sales</th></tr></thead><tbody>
            ${worst.map((r) => `<tr class="click" data-item="${r.item.id}"><td><div class="item-name">${esc(r.item.name)}</div><div class="item-sub">${r.item.qtyInStock} on shelf · ${money(r.item.qtyInStock * r.item.cost)} at cost</div></td><td class="right num">${r.units}</td><td class="right num">${money(r.revenue)}</td></tr>`).join("")}
          </tbody></table></div></div>
      </div>
      <div class="callout teal"><strong>Reading this:</strong> a $40 tower and a $7 sage bundle can bring in similar money. Cheap, fast-moving consumables also bring people back, so a stockout on them costs more than the price tag suggests.</div>`);
    bindPeriod(rBest);
    bindSeg("metric", (v) => { repState.metric = v; rBest(); });
  }

  // 2. Stockouts & lost sales
  function rStockouts() {
    const outs = R.stockouts();
    const low = R.runningLow();
    const lost = outs.reduce((s, r) => s + r.lostRevenue, 0);
    const perWeek = outs.reduce((s, r) => s + r.weeklyLost, 0);
    const restock = R.restockList().filter((r) => r.priority === "Out now");
    const cost = restock.reduce((s, r) => s + r.lineCost, 0);
    reportShell("stockouts", "Out of stock", "Items that sold steadily and are now at zero, with an estimate of the sales missed while they've been empty.", "", `
      <div class="kpis">
        <div class="kpi pink"><div class="kpi-label">Steady sellers at zero</div><div class="kpi-value">${outs.length}</div><div class="kpi-note">${outs.filter((r) => r.item.qtyOnOrder).length} already on order</div></div>
        <div class="kpi pink"><div class="kpi-label">Missed so far</div><div class="kpi-value">${money(lost)}</div><div class="kpi-note">estimated, since each ran out</div></div>
        <div class="kpi yellow"><div class="kpi-label">Missing per week</div><div class="kpi-value">${money(perWeek)}</div><div class="kpi-note">≈ ${money(perWeek * 4.3)} a month</div></div>
        <a class="kpi" href="#/reports/restock"><div class="kpi-label">Cost to restock them</div><div class="kpi-value">${money(cost)}</div><div class="kpi-note">at wholesale cost →</div></a>
      </div>
      <div class="panel"><div class="panel-head"><div><div class="panel-title">Out of stock</div><div class="panel-sub">Missed sales = usual weekly pace × time empty × price</div></div></div>
        <div class="panel-body flush table-wrap"><table class="t">
          <thead><tr><th>Item</th><th>Last sold</th><th class="right">Days empty</th><th class="right">Usual / week</th><th class="right">Missed so far</th><th class="right">Per week</th><th>Status</th></tr></thead><tbody>
          ${outs.map((r) => `<tr class="click" data-item="${r.item.id}"><td><div class="item-name">${dot(r.item.category)}${esc(r.item.name)}</div><div class="item-sub">${esc(r.item.category)} · ${money2(r.item.price)}</div></td>
            <td class="nowrap">${fDate(r.lastSold)}</td><td class="right num">${r.daysOut}</td><td class="right num">${num(r.weeklyUnits, 1)}</td>
            <td class="right num pink">${money(r.lostRevenue)}</td><td class="right num">${money(r.weeklyLost)}</td><td>${statusTag(r.item)}</td></tr>`).join("")}
        </tbody></table></div></div>
      <div class="panel"><div class="panel-head"><div><div class="panel-title">About to run out</div><div class="panel-sub">Less than 3 weeks of stock at the current pace</div></div></div>
        <div class="panel-body flush table-wrap"><table class="t">
          <thead><tr><th>Item</th><th class="right">On hand</th><th class="right">On order</th><th class="right">Sells / week</th><th class="right">Days left</th></tr></thead><tbody>
          ${low.map((r) => `<tr class="click" data-item="${r.item.id}"><td><div class="item-name">${dot(r.item.category)}${esc(r.item.name)}</div></td><td class="right num">${r.item.qtyInStock}</td><td class="right num">${r.item.qtyOnOrder || "—"}</td><td class="right num">${num(r.weeklyUnits, 1)}</td><td class="right num ${r.daysCover < 10 ? "pink" : "yellow"}">${Math.round(r.daysCover)}</td></tr>`).join("")}
        </tbody></table></div></div>
      <div class="callout"><strong>Estimates, not exact:</strong> they assume each item would have kept selling at its normal pace. Some customers buy something else instead, so treat these as "roughly how much it's costing."</div>`);
  }

  // 3. Restock suggestions (approval flow)
  function rRestock() {
    const rows = R.restockList();
    const sel = getState("restockSel", null) || Object.fromEntries(rows.map((r) => [r.item.id, true]));
    const qty = getState("restockQty", {});
    reportShell("restock", "Suggested restock", "Enough to cover about 30 days of sales, minus what's on the shelf and already on order, rounded up to the vendor's pack size.",
      `<button class="btn btn-primary" id="sendApproval">Send to owner for approval</button>`, `
      <div class="callout teal" id="rsTotal"></div>
      <div class="panel"><div class="panel-body flush table-wrap"><table class="t">
        <thead><tr><th></th><th>Item</th><th>Priority</th><th class="right">On hand</th><th class="right">On order</th><th class="right">Sells / week</th><th class="right">Order qty</th><th class="right">Cost</th><th class="right">Brings in</th></tr></thead>
        <tbody>${rows.map((r) => {
          const q = qty[r.item.id] ?? r.qty;
          return `<tr data-item="${r.item.id}" class="click">
            <td><input type="checkbox" data-sel="${r.item.id}" ${sel[r.item.id] !== false ? "checked" : ""} style="width:22px;height:22px;accent-color:#5ec8c4" /></td>
            <td><div class="item-name">${dot(r.item.category)}${esc(r.item.name)}</div><div class="item-sub">${r.priority === "Out now" ? `<span class="pink">Out ${r.daysOut} days · missing ~${money(r.lostPerWeek)}/wk</span>` : `${Math.round(r.daysCover)} days left`} · ${esc(r.item.vendor)}</div></td>
            <td><span class="tag ${r.priority === "Out now" ? "out" : r.priority === "Urgent" ? "urgent" : "soon"}">${r.priority}</span></td>
            <td class="right num">${r.item.qtyInStock}</td><td class="right num">${r.item.qtyOnOrder || "—"}</td><td class="right num">${num(r.weeklyUnits, 1)}</td>
            <td class="right"><input type="number" min="0" step="${r.item.minOrderQty}" value="${q}" data-qty="${r.item.id}" class="input num" style="min-width:0;width:84px;text-align:right;padding:0.4rem 0.6rem;min-height:38px" /></td>
            <td class="right num" data-cost="${r.item.id}">${money2(q * r.unitCost)}</td>
            <td class="right num teal" data-rev="${r.item.id}">${money(q * r.item.price)}</td></tr>`;
        }).join("")}</tbody></table></div></div>
      <div class="callout"><strong>How it works live:</strong> the owner gets this list on his phone and taps approve. Nobody at the register needs Clover admin access, and nothing is ordered without his OK.</div>`);
    function totals() {
      let cost = 0, rev = 0, n = 0;
      for (const r of rows) {
        const q = qty[r.item.id] ?? r.qty;
        if (sel[r.item.id] !== false && q > 0) { cost += q * r.unitCost; rev += q * r.item.price; n++; }
        const ce = $(`[data-cost="${r.item.id}"]`), re = $(`[data-rev="${r.item.id}"]`);
        if (ce) ce.textContent = money2(q * r.unitCost);
        if (re) re.textContent = money(q * r.item.price);
      }
      $("#rsTotal").innerHTML = `<strong>${n} items · ${money2(cost)} at cost</strong> → about <strong>${money(rev)}</strong> in sales once it sells through (${rev && cost ? (rev / cost).toFixed(1) : 0}× what it costs).`;
      return { cost, n };
    }
    totals();
    $$("[data-sel]").forEach((cb) => cb.addEventListener("change", () => { sel[cb.dataset.sel] = cb.checked; setState("restockSel", sel); totals(); }));
    $$("[data-qty]").forEach((inp) => inp.addEventListener("input", () => { qty[inp.dataset.qty] = Math.max(0, +inp.value || 0); setState("restockQty", qty); totals(); }));
    $$("[data-sel], [data-qty]").forEach((x) => x.addEventListener("click", (e) => e.stopPropagation()));
    $("#sendApproval").onclick = () => { const t = totals(); toast(`Demo: ${t.n} items (${money2(t.cost)}) sent to the owner's phone for approval`); };
  }

  // 4. Dead stock
  function rDead() {
    const min = +repState.dead;
    const rows = R.deadStock(min);
    const cash = rows.reduce((s, r) => s + r.cashTied, 0);
    const retail = rows.reduce((s, r) => s + r.retailValue, 0);
    const idea = (r) => r.item.unique ? "Feature it: front display + social post" : r.daysSince >= 120 ? "Mark down 25% or bundle" : "Move near the register / bundle";
    reportShell("dead", "Slow / dead stock", "Items sitting on the shelf without selling. That's cash that could be restocking the best sellers.",
      seg("dead", [["60", "60+ days"], ["90", "90+ days"], ["120", "120+ days"]], repState.dead), `
      <div class="kpis">
        <div class="kpi yellow"><div class="kpi-label">Items not selling</div><div class="kpi-value">${rows.length}</div><div class="kpi-note">no sale in ${min}+ days</div></div>
        <div class="kpi yellow"><div class="kpi-label">Cash tied up</div><div class="kpi-value">${money(cash)}</div><div class="kpi-note">what it cost to buy</div></div>
        <div class="kpi purple"><div class="kpi-label">Retail value</div><div class="kpi-value">${money(retail)}</div><div class="kpi-note">if it all sold at full price</div></div>
        <div class="kpi"><div class="kpi-label">At 25% off</div><div class="kpi-value">${money(retail * 0.75)}</div><div class="kpi-note">still ${money(retail * 0.75 - cash)} over cost</div></div>
      </div>
      <div class="panel"><div class="panel-body flush table-wrap"><table class="t">
        <thead><tr><th>Item</th><th class="right">On shelf</th><th>Last sold</th><th class="right">Days</th><th class="right">Cash tied up</th><th class="right">Retail</th><th>Idea</th></tr></thead><tbody>
        ${rows.map((r) => `<tr class="click" data-item="${r.item.id}"><td><div class="item-name">${dot(r.item.category)}${esc(r.item.name)}</div><div class="item-sub">${esc(r.item.category)}${r.item.unique ? " · one-of-a-kind" : ""}</div></td>
          <td class="right num">${r.item.qtyInStock}</td><td class="nowrap">${r.neverSold ? "<span class='muted'>Never (added " + r.daysSince + "d ago)</span>" : fDate(r.lastSold)}</td>
          <td class="right num">${r.daysSince}</td><td class="right num yellow">${money(r.cashTied)}</td><td class="right num">${money(r.retailValue)}</td><td class="small">${idea(r)}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">Nothing this slow 🎉</td></tr>`}
      </tbody></table></div></div>
      <div class="callout teal"><strong>Don't reorder these.</strong> They're excluded from the restock list automatically. One-of-a-kind specimens get a longer grace period (120 days), since big pieces take time to find their buyer.</div>`);
    bindSeg("dead", (v) => { repState.dead = v; rDead(); });
  }

  // 5. Busy hours heatmap
  function rHours() {
    const days = +repState.days, m = repState.heat;
    const { grid, byDow } = R.heatmap(days);
    const order = [2, 3, 4, 5, 6, 0, 1];
    const names = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
    const hours = [11, 12, 13, 14, 15, 16, 17, 18];
    const weeks = days / 7;
    let max = 0, best = null, worst = null;
    for (const d of order) for (const h of hours) {
      const c = grid[d]?.[h]; if (!c) continue;
      const v = m === "orders" ? c.orders / weeks : c.revenue / weeks;
      if (v > max) max = v;
      if (!best || v > best.v) best = { d, h, v };
      if ((!worst || v < worst.v) && v > 0) worst = { d, h, v };
    }
    const hl = (h) => (h > 12 ? h - 12 : h) + (h >= 12 ? "p" : "a");
    const cells = order.map((d) => `<div class="d">${names[d]}</div>` + hours.map((h) => {
      const c = grid[d]?.[h];
      const closed = d === 1 || (d === 0 && h >= 17);
      if (closed) return `<div class="c closed">·</div>`;
      const v = c ? (m === "orders" ? c.orders / weeks : c.revenue / weeks) : 0;
      const t = max ? v / max : 0;
      const bg = t < 0.5 ? `rgba(110,84,200,${0.15 + t * 0.9})` : `rgba(${Math.round(110 - (t - 0.5) * 32)},${Math.round(84 + (t - 0.5) * 232)},${Math.round(200 - (t - 0.5) * 8)},${0.6 + t * 0.35})`;
      return `<div class="c" style="background:${bg}" title="${names[d]} ${hl(h)}: ${m === "orders" ? num(v, 1) + " orders/wk" : money(v) + "/wk"}">${v ? (m === "orders" ? num(v, 1) : "$" + Math.round(v)) : ""}</div>`;
    }).join("")).join("");
    const openDays = byDow.map((r) => ({ ...r, perDay: r.revenue / weeks }));
    reportShell("hours", "Busy hours", "When the shop actually makes its money. Useful for staffing, store hours, and when it's safe to step away.",
      periodSeg() + seg("heat", [["orders", "Orders"], ["revenue", "Sales $"]], m), `
      <div class="grid-2">
        <div class="panel"><div class="panel-head"><div><div class="panel-title">Average per week, by hour</div><div class="panel-sub">Last ${days} days · Mondays closed · Sundays close at 5</div></div></div>
          <div class="panel-body"><div class="heat" style="grid-template-columns:46px repeat(${hours.length}, minmax(0,1fr))">
            <div></div>${hours.map((h) => `<div class="h">${hl(h)}</div>`).join("")}${cells}
          </div><div class="legend">Slower <span class="ramp"></span> Busier</div></div></div>
        <div class="panel"><div class="panel-head"><div><div class="panel-title">By day of week</div><div class="panel-sub">Average sales per open day</div></div></div>
          <div class="panel-body"><div class="chart-box"><canvas id="cDow"></canvas></div></div></div>
      </div>
      <div class="callout teal"><strong>Busiest:</strong> ${best ? names[best.d] + " around " + hl(best.h) : "—"}. <strong>Quietest open hour:</strong> ${worst ? names[worst.d] + " around " + hl(worst.h) : "—"}. Weekday mornings are a good time for one person to cover the store.</div>`);
    chart("cDow", {
      type: "bar",
      data: { labels: order.filter((d) => d !== 1).map((d) => names[d]), datasets: [{ data: order.filter((d) => d !== 1).map((d) => Math.round(openDays[d].perDay)), backgroundColor: order.filter((d) => d !== 1).map((d) => d === 6 ? "#ea8cc8" : d === 0 ? "#9b86ea" : "#5ec8c4"), borderRadius: 6 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => money(c.raw) + " per day" } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: moneyTick } } } },
    });
    bindPeriod(rHours);
    bindSeg("heat", (v) => { repState.heat = v; rHours(); });
  }

  // 6. Categories
  function rCategories() {
    const days = +repState.days;
    const rows = R.categoryBreakdown(days);
    const max = Math.max(...rows.map((r) => r.share));
    reportShell("categories", "Categories", "Which parts of the store bring in money, and which mostly take up shelf space.", periodSeg(), `
      <div class="grid-2">
        <div class="panel"><div class="panel-body flush table-wrap"><table class="t">
          <thead><tr><th>Category</th><th class="right">Sales</th><th class="bar-cell">Share</th><th class="right">Profit</th><th class="right">Margin</th><th class="right">Stock at cost</th><th class="right">Items</th></tr></thead><tbody>
          ${rows.map((r) => `<tr><td><div class="item-name">${dot(r.category)}${esc(r.category)}</div></td><td class="right num">${money(r.revenue)}</td>
            <td class="bar-cell"><div style="display:flex;gap:0.5rem;align-items:center"><div class="bar" style="flex:1"><span style="width:${(r.share / max) * 100}%;background:${r.color}"></span></div><span class="small num">${pct(r.share)}</span></div></td>
            <td class="right num teal">${money(r.profit)}</td><td class="right num muted">${pct(r.margin)}</td><td class="right num">${money(r.stockValue)}</td><td class="right num muted">${r.skus}</td></tr>`).join("")}
          </tbody></table></div></div>
        <div class="panel"><div class="panel-head"><div><div class="panel-title">Share of sales</div><div class="panel-sub">Last ${days} days</div></div></div>
          <div class="panel-body"><div class="chart-box tall"><canvas id="cCat"></canvas></div></div></div>
      </div>
      <div class="callout teal"><strong>Look for mismatches:</strong> a category holding a lot of stock at cost but bringing in a small share of sales is where cash is stuck. Small, high-share categories are where restock money works hardest.</div>`);
    chart("cCat", {
      type: "doughnut",
      data: { labels: rows.map((r) => r.category), datasets: [{ data: rows.map((r) => Math.round(r.revenue)), backgroundColor: rows.map((r) => r.color), borderColor: "#342e4c", borderWidth: 2 }] },
      options: { cutout: "58%", plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => c.label + ": " + money(c.raw) } } } },
    });
    bindPeriod(rCategories);
  }

  // 7. Month by month
  function rMonthly() {
    const rows = R.monthly();
    const partial = (r) => r.key === `${B.today.getFullYear()}-${String(B.today.getMonth() + 1).padStart(2, "0")}`;
    reportShell("monthly", "Month by month", "Sales and profit by month, plus average sales per open day so a half-finished month is still a fair comparison.", "", `
      <div class="panel"><div class="panel-head"><div><div class="panel-title">Sales per month</div><div class="panel-sub">Bars = total sales · line = average per open day</div></div></div>
        <div class="panel-body"><div class="chart-box tall"><canvas id="cMonth"></canvas></div></div></div>
      <div class="panel"><div class="panel-body flush table-wrap"><table class="t">
        <thead><tr><th>Month</th><th class="right">Sales</th><th class="right">Profit</th><th class="right">Orders</th><th class="right">Open days</th><th class="right">Per open day</th><th class="right">Avg sale</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${r.label} ${r.key.slice(0, 4)}${partial(r) ? ' <span class="tag low">so far</span>' : ""}</td><td class="right num">${money(r.revenue)}</td><td class="right num teal">${money(r.profit)}</td><td class="right num">${r.orders}</td><td class="right num muted">${r.openDays}</td><td class="right num">${money(r.perDay)}</td><td class="right num">${money2(r.revenue / r.orders)}</td></tr>`).join("")}
      </tbody></table></div></div>
      <div class="callout"><strong>Note:</strong> the first month only includes part of the month, and so does the current one. Compare "per open day" rather than totals for those.</div>`);
    chart("cMonth", {
      data: {
        labels: rows.map((r) => r.label + (partial(r) ? " (so far)" : "")),
        datasets: [
          { type: "bar", label: "Sales", data: rows.map((r) => Math.round(r.revenue)), backgroundColor: rows.map((r) => partial(r) ? "rgba(94,200,196,0.4)" : "#5ec8c4"), borderRadius: 6, yAxisID: "y" },
          { type: "bar", label: "Profit", data: rows.map((r) => Math.round(r.profit)), backgroundColor: rows.map((r) => partial(r) ? "rgba(155,134,234,0.4)" : "#9b86ea"), borderRadius: 6, yAxisID: "y" },
          { type: "line", label: "Per open day", data: rows.map((r) => Math.round(r.perDay)), borderColor: "#ea8cc8", backgroundColor: "#ea8cc8", tension: 0.3, yAxisID: "y2", pointRadius: 4 },
        ],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        plugins: { tooltip: { callbacks: { label: (c) => c.dataset.label + ": " + money(c.raw) } } },
        scales: { x: { grid: { display: false } }, y: { ticks: { callback: moneyTick } }, y2: { position: "right", grid: { display: false }, ticks: { callback: moneyTick } } },
      },
    });
  }

  // 8. Average sale & items per transaction
  function rTicket() {
    const rows = R.weeklyTicket(26);
    const avg = rows.reduce((s, r) => s + r.avgSale, 0) / rows.length;
    const last4 = rows.slice(-4), prev4 = rows.slice(-8, -4);
    const a4 = last4.reduce((s, r) => s + r.avgSale, 0) / last4.length;
    const p4 = prev4.reduce((s, r) => s + r.avgSale, 0) / prev4.length;
    const i4 = last4.reduce((s, r) => s + r.itemsPer, 0) / last4.length;
    reportShell("ticket", "Average sale", "How much each customer spends per visit, and how many items they leave with. Small changes at the register show up here.", "", `
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">Avg sale · last 4 weeks</div><div class="kpi-value">${money2(a4)}</div><div class="kpi-note">${change(a4, p4)} vs the 4 weeks before</div></div>
        <div class="kpi purple"><div class="kpi-label">Items per sale</div><div class="kpi-value">${num(i4, 1)}</div><div class="kpi-note">last 4 weeks</div></div>
        <div class="kpi pink"><div class="kpi-label">6-month average</div><div class="kpi-value">${money2(avg)}</div><div class="kpi-note">per sale, before tax</div></div>
        <div class="kpi yellow"><div class="kpi-label">If every sale added $3</div><div class="kpi-value">+${money(3 * rows.slice(-4).reduce((s, r) => s + r.orders, 0) / 4 * 52)}</div><div class="kpi-note">per year at today's traffic</div></div>
      </div>
      <div class="panel"><div class="panel-head"><div><div class="panel-title">Weekly average sale & items per sale</div><div class="panel-sub">Last 26 weeks</div></div></div>
        <div class="panel-body"><div class="chart-box tall"><canvas id="cTicket"></canvas></div></div></div>
      <div class="callout teal"><strong>Easy wins:</strong> a bowl of $2–3 tumbled stones and the 3D-printed stands right at the register, plus "want a stand for that sphere?" These add-ons nudge both lines up without any extra foot traffic.</div>`);
    chart("cTicket", {
      type: "line",
      data: {
        labels: rows.map((r) => fDate(r.weekEnding)),
        datasets: [
          { label: "Average sale", data: rows.map((r) => +r.avgSale.toFixed(2)), borderColor: "#5ec8c4", backgroundColor: "rgba(94,200,196,0.15)", fill: true, tension: 0.35, yAxisID: "y" },
          { label: "Items per sale", data: rows.map((r) => +r.itemsPer.toFixed(2)), borderColor: "#ea8cc8", backgroundColor: "#ea8cc8", tension: 0.35, yAxisID: "y2", borderDash: [6, 4] },
        ],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 9 } }, y: { ticks: { callback: moneyTick } }, y2: { position: "right", grid: { display: false }, suggestedMin: 1 } },
      },
    });
  }

  // 9. Bought together
  function rTogether() {
    const rows = R.boughtTogether(180, 4);
    reportShell("together", "Frequently bought together", "Pairs that keep showing up in the same sale. Shelve them side by side, suggest the second at checkout, or bundle them.", "", `
      <div class="panel"><div class="panel-body flush table-wrap"><table class="t">
        <thead><tr><th>When someone buys…</th><th>…they also buy</th><th class="bar-cell">How often</th><th class="right">Times together</th><th>Idea</th></tr></thead><tbody>
        ${rows.map((r) => `<tr>
          <td class="click" data-item="${r.a.id}"><div class="item-name">${dot(r.a.category)}${esc(r.a.name)}</div></td>
          <td class="click" data-item="${r.b.id}"><div class="item-name">${dot(r.b.category)}${esc(r.b.name)}</div>${r.b.qtyInStock === 0 ? `<div class="item-sub pink">out of stock</div>` : ""}</td>
          <td class="bar-cell"><div style="display:flex;gap:0.5rem;align-items:center"><div class="bar" style="flex:1"><span style="width:${r.attach * 100}%"></span></div><span class="small num">${pct(r.attach)}</span></div></td>
          <td class="right num">${r.count}</td>
          <td class="small muted">${r.attach >= 0.5 ? "Bundle at a small discount" : r.b.price < 10 ? "Suggest it at checkout" : "Shelve them together"}</td></tr>`).join("")}
      </tbody></table></div></div>
      <div class="callout"><strong>Reading it:</strong> "68%" means 68 out of every 100 sales with the first item also included the second. Last 6 months.</div>`);
  }

  // 10. Discounts & refunds (store-level; no per-employee breakdown in this view)
  function rDiscounts() {
    const days = +repState.days;
    const d = R.discountsRefunds(days);
    reportShell("discounts", "Discounts & refunds", "Money given back at the register. Small shops often don't realize how much it adds up to.", periodSeg(), `
      <div class="kpis">
        <div class="kpi yellow"><div class="kpi-label">Discounts given</div><div class="kpi-value">${money(d.discTotal)}</div><div class="kpi-note">${pct(d.sales ? d.discTotal / d.sales : 0, 1)} of sales</div></div>
        <div class="kpi purple"><div class="kpi-label">Orders discounted</div><div class="kpi-value">${d.discountedOrders}</div><div class="kpi-note">${pct(d.orders ? d.discountedOrders / d.orders : 0)} of ${d.orders} orders</div></div>
        <div class="kpi pink"><div class="kpi-label">Refunds</div><div class="kpi-value">${money(d.refundTotal)}</div><div class="kpi-note">${d.refunds.length} refunds</div></div>
        <div class="kpi"><div class="kpi-label">Total given back</div><div class="kpi-value">${money(d.discTotal + d.refundTotal)}</div><div class="kpi-note">last ${days} days</div></div>
      </div>
      <div class="grid-even">
        <div class="panel"><div class="panel-head"><div class="panel-title">By discount</div></div>
          <div class="panel-body flush table-wrap"><table class="t"><thead><tr><th>Discount</th><th class="right">Times used</th><th class="right">Amount</th><th class="right">Avg</th></tr></thead><tbody>
          ${d.discounts.map((x) => `<tr><td>${esc(x.name)}</td><td class="right num">${x.count}</td><td class="right num yellow">${money2(x.amount)}</td><td class="right num muted">${money2(x.amount / x.count)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">None</td></tr>`}
          </tbody></table></div></div>
        <div class="panel"><div class="panel-head"><div class="panel-title">Refunds</div></div>
          <div class="panel-body flush table-wrap"><table class="t"><thead><tr><th>Date</th><th>Item</th><th>Reason</th><th class="right">Amount</th></tr></thead><tbody>
          ${d.refunds.map((r) => `<tr class="click" data-order="${r.order.id}"><td class="nowrap">${fDate(r.order.createdAt)}</td><td>${esc(r.item?.name || "—")}</td><td class="small muted">${esc(r.reason)}</td><td class="right num pink">${money2(r.amount)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">No refunds</td></tr>`}
          </tbody></table></div></div>
      </div>`);
    bindPeriod(rDiscounts);
  }

  const REPORT_FNS = { best: rBest, stockouts: rStockouts, restock: rRestock, dead: rDead, hours: rHours, categories: rCategories, monthly: rMonthly, ticket: rTicket, together: rTogether, discounts: rDiscounts };

  /* ======================================================================
     ROUTER
     ====================================================================== */
  function updateBadges() {
    const log = getState("calls", {});
    const n = R.callList().filter((r) => r.anyInStock && !log[r.customer.id]).length;
    $("#callBadge").textContent = n || "";
    $("#callBadge").style.display = n ? "" : "none";
  }
  function route() {
    killCharts(); closeModal();
    const [, page = "dashboard", sub] = (location.hash || "#/dashboard").split("/");
    let navKey = page;
    if (page === "reports") {
      const key = REPORT_FNS[sub] ? sub : "best";
      navKey = key === "restock" ? "restock" : "reports";
      REPORT_FNS[key]();
    } else if (page === "inventory") vInventory();
    else if (page === "orders") vOrders();
    else if (page === "customers") vCustomers();
    else if (page === "calls") vCalls();
    else { navKey = "dashboard"; vDashboard(); }
    $$(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === navKey));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  $("#syncNote").textContent = "Synced with Clover · " + B.today.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  updateBadges();
  route();
})();
