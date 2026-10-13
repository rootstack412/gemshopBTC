/* ==========================================================================
   Beneath the Crescent — REPORTS ENGINE
   Pure functions over window.BTC (mock now, Clover API later).
   Nothing here relies on "hints" from the mock generator: everything is
   derived from stock levels + order history, exactly like it would be live.
   ========================================================================== */
(function () {
  "use strict";
  const B = window.BTC;
  const DAY = 86400000;
  const TODAY = B.today;
  const itemById = Object.fromEntries(B.items.map((i) => [i.id, i]));
  const custById = Object.fromEntries(B.customers.map((c) => [c.id, c]));

  const daysBetween = (a, b) => Math.floor((b - a) / DAY);
  const ageDays = (d) => daysBetween(d, TODAY);
  const since = (days) => new Date(TODAY.getTime() - days * DAY);
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

  // Every line, with its share of the order discount taken off, and profit.
  const LINES = [];
  for (const o of B.orders) {
    const discShare = o.discount && o.subtotal ? o.discount.amount / o.subtotal : 0;
    for (const l of o.lines) {
      const gross = l.qty * l.unitPrice;
      const net = gross * (1 - discShare);
      LINES.push({
        order: o, date: o.createdAt, itemId: l.itemId, name: l.name, category: l.category,
        qty: l.qty, net, profit: net - l.qty * (l.unitCost || 0),
      });
    }
  }

  function ordersIn(days) {
    const from = days == null ? 0 : since(days).getTime();
    return B.orders.filter((o) => o.createdAt.getTime() >= from);
  }
  function linesIn(days, toDaysAgo = 0) {
    const from = days == null ? 0 : since(days).getTime();
    const to = since(toDaysAgo).getTime() + (toDaysAgo === 0 ? DAY : 0);
    return LINES.filter((l) => l.date.getTime() >= from && l.date.getTime() < to);
  }

  // Per-item sales stats over a window
  function itemStats(days) {
    const m = new Map();
    for (const l of linesIn(days)) {
      let s = m.get(l.itemId);
      if (!s) { s = { itemId: l.itemId, name: l.name, category: l.category, units: 0, revenue: 0, profit: 0, orders: 0 }; m.set(l.itemId, s); }
      s.units += l.qty; s.revenue += l.net; s.profit += l.profit; s.orders += 1;
    }
    return [...m.values()];
  }

  // Last time each item sold (all history)
  const LAST_SOLD = new Map();
  for (const l of LINES) {
    const prev = LAST_SOLD.get(l.itemId);
    if (!prev || l.date > prev) LAST_SOLD.set(l.itemId, l.date);
  }
  const lastSold = (id) => LAST_SOLD.get(id) || null;

  // Sales speed (units/day) for an item, measured over the 60 days it was
  // actually selling — for a stocked-out item that's the 60 days before it ran out.
  function velocity(item) {
    const ls = lastSold(item.id);
    if (!ls) return 0;
    const endAgo = item.qtyInStock === 0 ? ageDays(ls) : 0;
    const window = 60;
    let units = 0;
    const from = since(endAgo + window).getTime();
    const to = since(endAgo).getTime() + DAY;
    for (const l of LINES) if (l.itemId === item.id && l.date.getTime() >= from && l.date.getTime() < to) units += l.qty;
    // ignore one-off blips
    return units < 3 ? 0 : units / window;
  }
  const VEL = new Map(B.items.map((i) => [i.id, velocity(i)]));

  function stockStatus(item) {
    if (item.unique) return item.qtyInStock > 0 ? "unique" : "sold";
    if (item.qtyInStock === 0) return item.qtyOnOrder > 0 ? "out-ordered" : "out";
    const ls = lastSold(item.id);
    if (ls ? ageDays(ls) >= 60 : item.addedDaysAgo >= 60) return "dead";
    if (item.qtyInStock <= item.reorderPoint) return item.qtyOnOrder > 0 ? "low-ordered" : "low";
    return "ok";
  }
  const STATUS_LABEL = {
    ok: "In stock", low: "Low stock", "low-ordered": "Low · on order", out: "Out of stock",
    "out-ordered": "Out · on order", dead: "Not selling", unique: "One-of-a-kind", sold: "Sold",
  };

  /* ---------------- 1. Best sellers ---------------- */
  function bestSellers(days = 90, metric = "revenue", limit = 15) {
    return itemStats(days)
      .filter((s) => itemById[s.itemId])
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, limit)
      .map((s) => ({ ...s, item: itemById[s.itemId], margin: s.revenue ? s.profit / s.revenue : 0 }));
  }
  function worstSellers(days = 90, limit = 15) {
    const stats = new Map(itemStats(days).map((s) => [s.itemId, s]));
    return B.items
      .filter((i) => i.qtyInStock > 0 && !i.unique)
      .map((i) => ({ item: i, units: stats.get(i.id)?.units || 0, revenue: stats.get(i.id)?.revenue || 0 }))
      .sort((a, b) => a.revenue - b.revenue)
      .slice(0, limit);
  }

  /* ---------------- 2. Dead stock ---------------- */
  function deadStock(minDays = 60) {
    return B.items
      .filter((i) => i.qtyInStock > 0)
      .map((i) => {
        const ls = lastSold(i.id);
        // never sold → count from the day it was added to Clover
        const days = ls ? ageDays(ls) : i.addedDaysAgo;
        return { item: i, lastSold: ls, neverSold: !ls, daysSince: days, cashTied: i.qtyInStock * i.cost, retailValue: i.qtyInStock * i.price };
      })
      // big one-of-a-kind specimens are expected to sit longer before selling
      .filter((r) => r.daysSince >= (r.item.unique ? Math.max(minDays, 120) : minDays))
      .sort((a, b) => b.cashTied - a.cashTied);
  }

  /* ---------------- 3. Stockouts & lost sales ---------------- */
  function stockouts() {
    return B.items
      .filter((i) => !i.unique && i.qtyInStock === 0)
      .map((i) => {
        const ls = lastSold(i.id);
        const daysOut = ls ? ageDays(ls) : 0;
        const v = VEL.get(i.id);
        return {
          item: i, lastSold: ls, daysOut,
          weeklyUnits: v * 7,
          lostUnits: v * daysOut,
          lostRevenue: v * daysOut * i.price,
          lostProfit: v * daysOut * (i.price - i.cost),
          weeklyLost: v * 7 * i.price,
        };
      })
      .filter((r) => r.weeklyUnits > 0)
      .sort((a, b) => b.lostRevenue - a.lostRevenue);
  }
  function runningLow() {
    return B.items
      .filter((i) => !i.unique && i.qtyInStock > 0)
      .map((i) => {
        const v = VEL.get(i.id);
        return { item: i, daysCover: v ? i.qtyInStock / v : Infinity, weeklyUnits: v * 7 };
      })
      .filter((r) => r.daysCover < 21)
      .sort((a, b) => a.daysCover - b.daysCover);
  }

  /* ---------------- 4. Suggested restock ---------------- */
  // Order enough for ~30 days of sales, minus what's on the shelf and on order.
  function restockList(coverDays = 30) {
    const rows = [];
    for (const i of B.items) {
      if (i.unique) continue;
      const v = VEL.get(i.id);
      if (!v) continue;
      const have = i.qtyInStock + i.qtyOnOrder;
      const cover = have / v;
      if (cover >= 14 && have > i.reorderPoint) continue;
      const target = Math.ceil(v * coverDays);
      let qty = Math.max(0, target - have);
      if (!qty) continue;
      // round up to what the vendor actually sells (case / bag / pack)
      const moq = i.minOrderQty || 1;
      qty = Math.ceil(qty / moq) * moq;
      const out = i.qtyInStock === 0;
      const ls = lastSold(i.id);
      rows.push({
        item: i, qty, unitCost: i.cost, lineCost: qty * i.cost,
        expectedRevenue: qty * i.price,
        weeklyUnits: v * 7, daysCover: i.qtyInStock / v,
        priority: out ? "Out now" : cover < 7 ? "Urgent" : "Soon",
        lostPerWeek: out ? v * 7 * i.price : 0,
        daysOut: out && ls ? ageDays(ls) : 0,
      });
    }
    const rank = { "Out now": 0, Urgent: 1, Soon: 2 };
    return rows.sort((a, b) => rank[a.priority] - rank[b.priority] || b.expectedRevenue - a.expectedRevenue);
  }

  /* ---------------- 5. Sales by hour & day ---------------- */
  function heatmap(days = 90) {
    const grid = {}; // grid[dow][hour] = {revenue, orders}
    for (const o of ordersIn(days)) {
      const d = o.createdAt.getDay(), h = o.createdAt.getHours();
      grid[d] = grid[d] || {};
      grid[d][h] = grid[d][h] || { revenue: 0, orders: 0 };
      grid[d][h].revenue += o.total; grid[d][h].orders += 1;
    }
    const byDow = [0, 1, 2, 3, 4, 5, 6].map((d) => {
      let rev = 0, n = 0;
      for (const h in grid[d] || {}) { rev += grid[d][h].revenue; n += grid[d][h].orders; }
      return { dow: d, revenue: rev, orders: n };
    });
    return { grid, byDow };
  }

  /* ---------------- 6. Category breakdown ---------------- */
  function categoryBreakdown(days = 90) {
    const m = new Map(B.categories.map((c) => [c.name, { category: c.name, color: c.color, revenue: 0, profit: 0, units: 0, stockValue: 0, skus: 0 }]));
    for (const l of linesIn(days)) {
      const r = m.get(l.category); if (!r) continue;
      r.revenue += l.net; r.profit += l.profit; r.units += l.qty;
    }
    for (const i of B.items) { const r = m.get(i.category); r.stockValue += i.qtyInStock * i.cost; r.skus += 1; }
    const total = [...m.values()].reduce((s, r) => s + r.revenue, 0);
    return [...m.values()].map((r) => ({ ...r, share: total ? r.revenue / total : 0, margin: r.revenue ? r.profit / r.revenue : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /* ---------------- 7. Monthly trend ---------------- */
  function monthly() {
    const m = new Map();
    for (const o of B.orders) {
      const k = o.createdAt.getFullYear() + "-" + String(o.createdAt.getMonth() + 1).padStart(2, "0");
      const r = m.get(k) || { key: k, label: o.createdAt.toLocaleString("en-US", { month: "short" }), revenue: 0, orders: 0, profit: 0, days: new Set() };
      r.revenue += o.total - o.tax; r.orders += 1; r.days.add(o.createdAt.toDateString());
      m.set(k, r);
    }
    for (const l of LINES) {
      const k = l.date.getFullYear() + "-" + String(l.date.getMonth() + 1).padStart(2, "0");
      m.get(k).profit += l.profit;
    }
    return [...m.values()].sort((a, b) => a.key.localeCompare(b.key)).map((r) => ({ ...r, openDays: r.days.size, perDay: r.revenue / r.days.size }));
  }

  /* ---------------- 8. Avg sale & items per transaction ---------------- */
  function weeklyTicket(weeks = 26) {
    const rows = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const end = since(w * 7), start = since(w * 7 + 7);
      const os = B.orders.filter((o) => o.createdAt > start && o.createdAt <= end);
      if (!os.length) continue;
      const sales = os.reduce((s, o) => s + o.total - o.tax, 0);
      const units = os.reduce((s, o) => s + o.lines.reduce((t, l) => t + l.qty, 0), 0);
      rows.push({ weekEnding: end, orders: os.length, sales, avgSale: sales / os.length, itemsPer: units / os.length });
    }
    return rows;
  }

  /* ---------------- 9. Frequently bought together ---------------- */
  function boughtTogether(days = 180, minCount = 4) {
    const pairCount = new Map(), single = new Map();
    for (const o of ordersIn(days)) {
      const ids = [...new Set(o.lines.map((l) => l.itemId))].filter((id) => itemById[id]);
      ids.forEach((id) => single.set(id, (single.get(id) || 0) + 1));
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const k = [ids[i], ids[j]].sort().join("|");
        pairCount.set(k, (pairCount.get(k) || 0) + 1);
      }
    }
    return [...pairCount.entries()]
      .filter(([, n]) => n >= minCount)
      .map(([k, n]) => {
        let [a, b] = k.split("|");
        if ((single.get(a) || 0) > (single.get(b) || 0)) [a, b] = [b, a]; // a = the less common item
        return { a: itemById[a], b: itemById[b], count: n, attach: n / single.get(a) };
      })
      .sort((x, y) => y.attach * Math.sqrt(y.count) - x.attach * Math.sqrt(x.count))
      .slice(0, 15);
  }

  /* ---------------- 10. Discounts & refunds ---------------- */
  function discountsRefunds(days = 90) {
    const os = ordersIn(days);
    const byName = new Map();
    let discTotal = 0;
    for (const o of os) if (o.discount) {
      const r = byName.get(o.discount.name) || { name: o.discount.name, count: 0, amount: 0 };
      r.count++; r.amount += o.discount.amount; discTotal += o.discount.amount; byName.set(o.discount.name, r);
    }
    const refunds = os.filter((o) => o.refund).map((o) => ({ order: o, ...o.refund, item: itemById[o.refund.itemId] }));
    const sales = os.reduce((s, o) => s + o.subtotal, 0);
    return {
      discounts: [...byName.values()].sort((a, b) => b.amount - a.amount),
      discTotal, refunds,
      refundTotal: refunds.reduce((s, r) => s + r.amount, 0),
      discountedOrders: os.filter((o) => o.discount).length,
      orders: os.length, sales,
    };
  }

  /* ---------------- Customers & reorder call list ---------------- */
  const CUST_ORDERS = new Map();
  for (const o of B.orders) if (o.customerId) {
    if (!CUST_ORDERS.has(o.customerId)) CUST_ORDERS.set(o.customerId, []);
    CUST_ORDERS.get(o.customerId).push(o);
  }
  function customerSummary(c) {
    const os = (CUST_ORDERS.get(c.id) || []).slice().sort((a, b) => b.createdAt - a.createdAt);
    const spend = os.reduce((s, o) => s + o.total - (o.refund ? o.refund.amount : 0), 0);
    const counts = new Map();
    for (const o of os) for (const l of o.lines) counts.set(l.name, (counts.get(l.name) || 0) + l.qty);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
    return { customer: c, orders: os, visits: os.length, spend, lastVisit: os[0]?.createdAt || null, avgSale: os.length ? spend / os.length : 0, topItems: top };
  }

  // A regular is "due" when the usual gap between buys of a consumable has passed.
  function callList() {
    const rows = [];
    for (const c of B.customers) {
      const os = (CUST_ORDERS.get(c.id) || []).slice().sort((a, b) => a.createdAt - b.createdAt);
      const buys = new Map(); // itemId -> [dates]
      for (const o of os) for (const l of o.lines) {
        const it = itemById[l.itemId];
        if (!it || !it.consumable) continue;
        if (!buys.has(it.id)) buys.set(it.id, []);
        buys.get(it.id).push(o.createdAt);
      }
      const due = [];
      for (const [id, dates] of buys) {
        if (dates.length < 3) continue;
        const gaps = [];
        for (let k = 1; k < dates.length; k++) gaps.push(daysBetween(dates[k - 1], dates[k]));
        gaps.sort((a, b) => a - b);
        const usual = gaps[Math.floor(gaps.length / 2)]; // median gap
        const last = dates[dates.length - 1];
        const overdue = ageDays(last) - usual;
        if (overdue >= -3) due.push({ item: itemById[id], usual, last, overdue, times: dates.length });
      }
      if (!due.length) continue;
      due.sort((a, b) => b.overdue - a.overdue);
      const sum = customerSummary(c);
      const anyInStock = due.some((d) => d.item.qtyInStock > 0);
      rows.push({
        customer: c, items: due, overdue: due[0].overdue, lastVisit: sum.lastVisit, spend: sum.spend, visits: sum.visits,
        anyInStock,
        // rough value of the call: one usual basket of what they're due for
        callValue: due.reduce((s, d) => s + d.item.price, 0),
      });
    }
    return rows.sort((a, b) => (b.anyInStock - a.anyInStock) || b.overdue - a.overdue);
  }

  /* ---------------- Dashboard KPIs ---------------- */
  function salesBetween(fromAgo, toAgo) {
    const from = startOfDay(since(fromAgo)).getTime(), to = startOfDay(since(toAgo)).getTime() + DAY;
    const os = B.orders.filter((o) => o.createdAt.getTime() >= from && o.createdAt.getTime() < to);
    return { orders: os.length, sales: os.reduce((s, o) => s + o.total - o.tax, 0) };
  }
  function kpis() {
    const today = salesBetween(0, 0);
    const last7 = salesBetween(6, 0), prev7 = salesBetween(13, 7);
    const last30 = salesBetween(29, 0), prev30 = salesBetween(59, 30);
    const outs = stockouts();
    const dead = deadStock(60);
    const withCust = B.orders.filter((o) => o.customerId).length / B.orders.length;
    return {
      today, last7, prev7, last30, prev30,
      avgSale30: last30.orders ? last30.sales / last30.orders : 0,
      outCount: outs.length,
      lostPerWeek: outs.reduce((s, r) => s + r.weeklyLost, 0),
      deadCash: dead.reduce((s, r) => s + r.cashTied, 0),
      deadCount: dead.length,
      callsDue: callList().filter((r) => r.anyInStock).length,
      restockCost: restockList().reduce((s, r) => s + r.lineCost, 0),
      customerAttachRate: withCust,
      skuCount: B.items.length,
      unitsOnHand: B.items.reduce((s, i) => s + i.qtyInStock, 0),
      stockCost: B.items.reduce((s, i) => s + i.qtyInStock * i.cost, 0),
    };
  }

  function dailySales(days = 30) {
    const out = [];
    for (let d = days - 1; d >= 0; d--) {
      const day = startOfDay(since(d));
      const r = salesBetween(d, d);
      out.push({ date: day, ...r, closed: day.getDay() === 1 });
    }
    return out;
  }

  function itemWeeklyUnits(itemId, weeks = 26) {
    const out = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const end = since(w * 7), start = since(w * 7 + 7);
      let u = 0;
      for (const l of LINES) if (l.itemId === itemId && l.date > start && l.date <= end) u += l.qty;
      out.push({ weekEnding: end, units: u });
    }
    return out;
  }

  window.BTCReports = {
    itemById, custById, lastSold, velocity: (id) => VEL.get(id) || 0, stockStatus, STATUS_LABEL, ageDays,
    bestSellers, worstSellers, deadStock, stockouts, runningLow, restockList, heatmap, categoryBreakdown,
    monthly, weeklyTicket, boughtTogether, discountsRefunds, customerSummary, callList, kpis, dailySales, itemWeeklyUnits,
    customerOrders: (id) => (CUST_ORDERS.get(id) || []).slice().sort((a, b) => b.createdAt - a.createdAt),
  };
})();
