/* ==========================================================================
   Beneath the Crescent — MOCK DATA SOURCE
   --------------------------------------------------------------------------
   Everything here is fake, generated from a fixed seed so the numbers are the
   same every time the page loads. It's shaped roughly like what the Clover
   REST API returns (items, item_stocks, customers, orders + line items,
   payments, refunds) so the real version can swap this file for an API call.

   Exposes:  window.BTC = { today, items, categories, customers, employees, orders }
   ========================================================================== */
(function () {
  "use strict";

  // ---- Seeded random (mulberry32) so the demo is stable --------------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20261012);
  const rint = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  function weightedPick(list, weightFn) {
    let total = 0;
    for (const x of list) total += weightFn(x);
    let r = rand() * total;
    for (const x of list) { r -= weightFn(x); if (r <= 0) return x; }
    return list[list.length - 1];
  }
  const round2 = (n) => Math.round(n * 100) / 100;

  // "Today" for the demo. Fixed so reports never drift.
  const TODAY = new Date(2026, 9, 10, 16, 30, 0); // Sat Oct 10 2026, 4:30pm (mid-day so "today" has sales)
  const DAY = 86400000;
  const daysAgo = (n) => new Date(TODAY.getTime() - n * DAY);

  // ---- Catalog --------------------------------------------------------------
  // [name, category, price, cost, popularity, flags, qty, onOrder, reorderPt, state, vendor, description]
  // flags: c = consumable (customers re-buy it), u = one-of-a-kind specimen
  // state: ""          normal seller
  //        "outNN"     was selling, hit zero NN days ago (stockout)
  //        "dead"      hasn't sold in 90+ days
  const V = {
    gem: "Tucson Gem Show (Feb buy)",
    brz: "Brazil Direct Imports",
    moon: "Moonlit Wholesale",
    smoke: "Sacred Smoke Supply",
    oil: "Wildcraft Botanicals",
    book: "Crossroads Book Distributors",
    jew: "Silver Lotus Jewelry",
    whisto: "Whisto 3D Printing",
    decor: "Himalayan Home Goods",
  };
  const CATALOG = [
    // Tumbled stones — cheap, high volume, people buy several at once
    ["Amethyst, Tumbled", "Tumbled Stones", 3, 0.85, 120, "", 0, 0, 40, "out19", V.brz, "Brazilian amethyst, polished. Calm and intuition. Sold individually from the bowl."],
    ["Rose Quartz, Tumbled", "Tumbled Stones", 3, 0.8, 90, "", 0, 0, 40, "out12", V.brz, "Soft pink quartz, polished. Love and self-care. Top pick for gifts."],
    ["Clear Quartz, Tumbled", "Tumbled Stones", 2.5, 0.6, 70, "", 64, 0, 40, "", V.brz, "Water-clear quartz. The all-purpose amplifier stone."],
    ["Citrine, Tumbled", "Tumbled Stones", 4, 1.2, 60, "", 22, 0, 30, "", V.brz, "Heat-treated citrine, golden yellow. Abundance and confidence."],
    ["Black Tourmaline, Tumbled", "Tumbled Stones", 4, 1.1, 72, "", 9, 0, 30, "", V.gem, "Opaque black tourmaline. Protection and grounding."],
    ["Tiger's Eye, Tumbled", "Tumbled Stones", 3, 0.75, 55, "", 48, 0, 30, "", V.gem, "Golden chatoyant tiger's eye. Courage and focus."],
    ["Carnelian, Tumbled", "Tumbled Stones", 3, 0.8, 40, "", 37, 0, 25, "", V.gem, "Orange carnelian agate. Creativity and motivation."],
    ["Labradorite, Tumbled", "Tumbled Stones", 5, 1.6, 58, "", 14, 0, 25, "", V.gem, "Labradorite with blue/gold flash. Transformation stone."],
    ["Sodalite, Tumbled", "Tumbled Stones", 3, 0.7, 25, "", 52, 0, 20, "", V.gem, "Deep blue sodalite with white veining. Communication."],
    ["Green Aventurine, Tumbled", "Tumbled Stones", 2.5, 0.6, 38, "", 41, 0, 25, "", V.gem, "Green aventurine. Luck and opportunity."],
    ["Moonstone, Tumbled", "Tumbled Stones", 6, 2.1, 45, "", 6, 25, 20, "", V.gem, "Peach and white moonstone. New beginnings, very on-brand."],
    ["Lapis Lazuli, Tumbled", "Tumbled Stones", 5, 1.9, 30, "", 19, 0, 15, "", V.gem, "Afghan lapis with pyrite flecks. Wisdom and truth."],
    ["Black Obsidian, Tumbled", "Tumbled Stones", 3, 0.7, 35, "", 33, 0, 20, "", V.gem, "Volcanic glass, mirror-black. Shielding and clarity."],
    ["Fluorite, Tumbled", "Tumbled Stones", 4, 1.2, 33, "", 27, 0, 20, "", V.gem, "Rainbow fluorite, purple/green banding. Focus and study."],
    ["Hematite, Tumbled", "Tumbled Stones", 2, 0.4, 22, "", 58, 0, 20, "", V.gem, "Metallic silver hematite. Grounding."],
    ["Selenite Stick (6\")", "Tumbled Stones", 5, 1.1, 50, "", 11, 0, 20, "", V.moon, "Raw Moroccan selenite wand. Cleansing and charging other crystals."],

    // Towers & points
    ["Amethyst Point (Small)", "Towers & Points", 22, 8, 40, "", 7, 0, 6, "", V.brz, "Polished amethyst point, 2.5–3\". Great desk piece."],
    ["Rose Quartz Tower", "Towers & Points", 28, 10, 36, "", 4, 0, 5, "", V.brz, "Polished rose quartz tower, ~3.5\"."],
    ["Clear Quartz Generator", "Towers & Points", 35, 13, 28, "", 6, 0, 4, "", V.brz, "Six-sided clear quartz generator, ~4\"."],
    ["Fluorite Tower", "Towers & Points", 32, 12, 30, "", 3, 0, 4, "", V.gem, "Rainbow fluorite tower with strong banding."],
    ["Labradorite Tower", "Towers & Points", 38, 14, 34, "", 2, 6, 4, "", V.gem, "Labradorite tower with full-face flash, ~4\"."],
    ["Smoky Quartz Point", "Towers & Points", 26, 9, 20, "", 8, 0, 3, "", V.brz, "Natural smoky quartz point. Grounding."],
    ["Selenite Tower (8\")", "Towers & Points", 18, 5, 70, "", 0, 0, 6, "out24", V.moon, "Satin spar selenite tower. Best seller for room cleansing."],
    ["Black Obsidian Tower", "Towers & Points", 24, 8, 18, "", 9, 0, 3, "", V.gem, "Polished obsidian tower, mirror finish."],
    ["Flower Agate Tower", "Towers & Points", 42, 16, 26, "", 5, 0, 3, "", V.gem, "Pink flower agate with plume inclusions. Trending."],
    ["Caribbean Calcite Tower", "Towers & Points", 45, 18, 15, "", 4, 0, 2, "", V.gem, "Blue and brown Caribbean calcite tower."],

    // Clusters & geodes
    ["Amethyst Cluster (Small)", "Clusters & Geodes", 18, 6, 42, "", 10, 0, 6, "", V.brz, "Small Brazilian amethyst cluster, palm size."],
    ["Amethyst Cluster (Large)", "Clusters & Geodes", 65, 24, 16, "", 3, 0, 2, "", V.brz, "Large amethyst cluster, 5–6\", deep purple."],
    ["Clear Quartz Cluster", "Clusters & Geodes", 28, 10, 22, "", 5, 0, 3, "", V.brz, "Arkansas-style clear quartz cluster."],
    ["Citrine Cluster", "Clusters & Geodes", 32, 12, 18, "", 4, 0, 3, "", V.brz, "Heat-treated citrine cluster, bright gold."],
    ["Agate Geode Pair (Polished)", "Clusters & Geodes", 24, 9, 24, "", 7, 0, 4, "", V.brz, "Polished agate geode halves, dyed or natural."],
    ["Crack-Your-Own Geode", "Clusters & Geodes", 8, 2, 150, "", 0, 0, 30, "out16", V.moon, "Moroccan geode with a hammer bag. Kids love it — top weekend item."],
    ["Celestite Cluster", "Clusters & Geodes", 48, 22, 6, "", 5, 0, 2, "dead", V.gem, "Madagascar celestite, pale blue. Slow mover."],
    ["Apophyllite Cluster", "Clusters & Geodes", 36, 15, 12, "", 4, 0, 2, "", V.gem, "Indian apophyllite with sparkling points."],

    // Spheres & carvings
    ["Rose Quartz Sphere (50mm)", "Spheres & Carvings", 38, 14, 22, "", 4, 0, 3, "", V.brz, "Polished rose quartz sphere with stand."],
    ["Labradorite Sphere (50mm)", "Spheres & Carvings", 55, 21, 18, "", 3, 0, 2, "", V.gem, "Labradorite sphere with blue flash."],
    ["Ocean Jasper Sphere", "Spheres & Carvings", 48, 19, 10, "", 4, 0, 2, "", V.gem, "Orbicular ocean jasper sphere."],
    ["Amethyst Heart", "Spheres & Carvings", 12, 4, 38, "", 15, 0, 8, "", V.brz, "Puffy amethyst heart, 1.5\"."],
    ["Rose Quartz Heart", "Spheres & Carvings", 12, 4, 42, "", 3, 0, 8, "", V.brz, "Puffy rose quartz heart, 1.5\"."],
    ["Quartz Crystal Skull", "Spheres & Carvings", 34, 13, 14, "", 6, 0, 2, "", V.gem, "Carved clear quartz skull, 2\". Popular in October."],
    ["Moonstone Palm Stone", "Spheres & Carvings", 16, 5.5, 26, "", 8, 0, 5, "", V.gem, "Flat moonstone worry/palm stone."],
    ["Selenite Crescent Moon", "Spheres & Carvings", 15, 4, 48, "", 5, 0, 8, "", V.moon, "Carved selenite crescent moon, 4\". Signature store item."],
    ["Labradorite Crescent Moon", "Spheres & Carvings", 28, 10, 30, "", 2, 0, 4, "", V.gem, "Carved labradorite crescent moon with flash."],
    ["Fluorite Dragon Carving", "Spheres & Carvings", 58, 24, 4, "", 4, 0, 1, "dead", V.gem, "Hand-carved fluorite dragon. Slow mover."],

    // One-of-a-kind specimens (qty 1 — never "restock", replace with similar)
    ["Amethyst Cathedral Geode 18\"", "One-of-a-Kind", 650, 290, 2, "u", 1, 0, 0, "", V.brz, "Uruguayan amethyst cathedral, 18\" tall, deep color. Centerpiece."],
    ["Citrine Cathedral 10\"", "One-of-a-Kind", 320, 140, 2, "u", 1, 0, 0, "", V.brz, "Brazilian citrine cathedral on a cut base."],
    ["Rainbow Fluorite Specimen", "One-of-a-Kind", 145, 60, 3, "u", 1, 0, 0, "", V.gem, "Natural fluorite cubes with rainbow zoning."],
    ["Labradorite Freeform (Full Flash)", "One-of-a-Kind", 185, 75, 3, "u", 1, 0, 0, "", V.gem, "Large freeform with full blue/orange flash."],
    ["Septarian Nodule Pair", "One-of-a-Kind", 95, 38, 3, "u", 1, 0, 0, "", V.gem, "Utah septarian 'dragon stone' halves."],
    ["Ammonite Fossil Pair", "One-of-a-Kind", 120, 48, 3, "u", 1, 0, 0, "", V.gem, "Madagascar ammonite halves, polished."],
    ["Rutilated Quartz Point", "One-of-a-Kind", 210, 90, 2, "u", 1, 0, 0, "", V.brz, "Golden rutile needles throughout."],
    ["Pink Amethyst Geode Slab", "One-of-a-Kind", 240, 115, 1, "u", 1, 0, 0, "dead", V.brz, "Argentinian pink amethyst slab on stand. Listed since spring."],
    ["Malachite Freeform", "One-of-a-Kind", 165, 70, 2, "u", 1, 0, 0, "", V.gem, "Congo malachite with bullseye banding."],
    ["Smoky Quartz Cluster XL", "One-of-a-Kind", 275, 120, 1, "u", 1, 0, 0, "dead", V.brz, "Large smoky quartz cluster, museum quality."],

    // Jewelry
    ["Sterling Moonstone Ring", "Jewelry", 45, 16, 20, "", 7, 0, 4, "", V.jew, "Sterling silver ring with oval rainbow moonstone."],
    ["Labradorite Pendant", "Jewelry", 38, 13, 22, "", 5, 0, 4, "", V.jew, "Sterling bezel-set labradorite on 18\" chain."],
    ["Amethyst Chip Bracelet", "Jewelry", 10, 2.5, 40, "", 18, 0, 10, "", V.jew, "Stretch bracelet of amethyst chips."],
    ["8mm Bead Bracelet (Assorted)", "Jewelry", 15, 4, 52, "", 26, 0, 15, "", V.jew, "Stretch bead bracelets — tiger's eye, lava, rose quartz, more."],
    ["Rose Quartz Pendant", "Jewelry", 28, 9, 18, "", 6, 0, 4, "", V.jew, "Sterling-wrapped rose quartz drop."],
    ["Crescent Moon Necklace", "Jewelry", 32, 10, 30, "", 4, 0, 5, "", V.jew, "Gold-tone crescent moon with moonstone accent."],
    ["Raw Citrine Necklace", "Jewelry", 24, 7, 16, "", 9, 0, 4, "", V.jew, "Raw citrine point on adjustable cord."],
    ["Tiger's Eye Bracelet", "Jewelry", 14, 3.5, 24, "", 12, 0, 6, "", V.jew, "8mm tiger's eye stretch bracelet."],
    ["Wire-Wrapped Quartz Pendant", "Jewelry", 22, 6, 20, "", 8, 0, 4, "", V.jew, "Hand wire-wrapped clear quartz point."],
    ["Lab Opal Studs", "Jewelry", 36, 14, 3, "", 6, 0, 2, "dead", V.jew, "Sterling studs with lab-created opal. Slow mover."],
    ["Chakra Bracelet", "Jewelry", 16, 4, 34, "", 2, 0, 8, "", V.jew, "Seven-stone chakra stretch bracelet."],
    ["Evil Eye Bracelet", "Jewelry", 12, 3, 28, "", 14, 0, 6, "", V.jew, "Adjustable cord with blue evil eye bead."],

    // Sage & smudge — consumables
    ["White Sage Bundle (4\")", "Sage & Smudge", 7, 2, 130, "c", 0, 0, 30, "out9", V.smoke, "California white sage, small bundle. #1 repeat purchase."],
    ["White Sage Bundle (8\")", "Sage & Smudge", 13, 4, 44, "c", 6, 0, 12, "", V.smoke, "Large white sage bundle."],
    ["Blue Sage Bundle", "Sage & Smudge", 9, 3, 26, "c", 14, 0, 10, "", V.smoke, "Blue sage, sweeter and milder smoke."],
    ["Palo Santo Sticks (3-pack)", "Sage & Smudge", 6, 1.6, 110, "c", 0, 0, 30, "out14", V.smoke, "Peruvian palo santo, ethically sourced."],
    ["Sage Smudge Spray", "Sage & Smudge", 14, 4.5, 30, "c", 11, 0, 8, "", V.smoke, "Smokeless smudge spray, sage and lavender."],
    ["Abalone Shell", "Sage & Smudge", 12, 4, 30, "", 9, 0, 6, "", V.smoke, "Abalone shell for smudging, 5\"."],
    ["Rose Petal Sage Wand", "Sage & Smudge", 11, 3.5, 32, "c", 4, 0, 8, "", V.smoke, "White sage wrapped with rose petals."],
    ["Cedar Bundle", "Sage & Smudge", 8, 2.5, 14, "c", 13, 0, 6, "", V.smoke, "Cedar smudge bundle."],

    // Incense & resins — consumables
    ["Nag Champa Incense (15g)", "Incense & Resins", 3.5, 1, 65, "c", 0, 48, 36, "out6", V.smoke, "Classic nag champa sticks, 15g box."],
    ["Dragon's Blood Incense", "Incense & Resins", 4, 1.1, 46, "c", 8, 0, 24, "", V.smoke, "Dragon's blood sticks, 20 pack."],
    ["Sandalwood Cones", "Incense & Resins", 5, 1.5, 26, "c", 15, 0, 12, "", V.smoke, "Sandalwood incense cones, 10 pack."],
    ["Frankincense Resin (1oz)", "Incense & Resins", 7, 2, 22, "c", 9, 0, 8, "", V.smoke, "Hojari frankincense tears."],
    ["Myrrh Resin (1oz)", "Incense & Resins", 7, 2.2, 12, "c", 11, 0, 6, "", V.smoke, "Myrrh resin pieces."],
    ["Charcoal Discs (10 roll)", "Incense & Resins", 5, 1.2, 26, "c", 7, 0, 10, "", V.smoke, "Quick-light charcoal for burning resin."],
    ["Backflow Cones (Assorted)", "Incense & Resins", 6, 1.5, 34, "c", 12, 0, 12, "", V.smoke, "Backflow incense cones, 20 pack."],
    ["Ceramic Backflow Burner", "Incense & Resins", 24, 9, 16, "", 3, 0, 3, "", V.decor, "Waterfall-style backflow incense burner."],

    // Oils & candles — consumables
    ["Lavender Essential Oil", "Oils & Candles", 12, 4, 30, "c", 8, 0, 8, "", V.oil, "100% lavender essential oil, 15ml."],
    ["Frankincense Essential Oil", "Oils & Candles", 18, 7, 16, "c", 6, 0, 5, "", V.oil, "Frankincense essential oil, 15ml."],
    ["Protection Ritual Oil", "Oils & Candles", 14, 4, 24, "c", 5, 0, 6, "", V.oil, "House-blend protection oil with black tourmaline chips."],
    ["Abundance Ritual Oil", "Oils & Candles", 14, 4, 22, "c", 7, 0, 6, "", V.oil, "House-blend abundance oil with citrine chips."],
    ["Chime Candles (20 pack)", "Oils & Candles", 10, 3, 40, "c", 0, 0, 12, "out21", V.oil, "Assorted color chime spell candles."],
    ["Intention Candle — Love", "Oils & Candles", 22, 7, 22, "c", 6, 0, 5, "", V.oil, "Soy candle with rose quartz and petals."],
    ["Intention Candle — Prosperity", "Oils & Candles", 22, 7, 20, "c", 5, 0, 5, "", V.oil, "Soy candle with citrine and herbs."],
    ["Soy Tealights (12)", "Oils & Candles", 8, 2.4, 18, "c", 14, 0, 6, "", V.oil, "Unscented soy tealights."],
    ["Moon Water Room Spray", "Oils & Candles", 15, 5, 20, "c", 9, 0, 5, "", V.oil, "Full-moon charged room spray."],

    // Tarot, books & tools
    ["Classic Tarot Deck", "Tarot & Books", 22, 11, 26, "", 6, 0, 4, "", V.book, "Traditional 78-card tarot deck with guidebook."],
    ["Moon Oracle Deck", "Tarot & Books", 26, 13, 18, "", 4, 0, 3, "", V.book, "44-card moon phase oracle deck."],
    ["Crystal Guide Handbook", "Tarot & Books", 18, 9, 20, "", 7, 0, 3, "", V.book, "Pocket guide to 200 crystals."],
    ["Beginner's Tarot Guide", "Tarot & Books", 16, 8, 14, "", 5, 0, 3, "", V.book, "Paperback tarot guide for new readers."],
    ["Moon Phase Journal", "Tarot & Books", 20, 8, 12, "", 6, 0, 3, "", V.book, "Guided journal for lunar intentions."],
    ["Amethyst Pendulum", "Tarot & Books", 14, 4, 24, "", 5, 0, 5, "", V.jew, "Faceted amethyst pendulum on chain."],
    ["Tarot Altar Cloth", "Tarot & Books", 18, 6, 4, "", 7, 0, 2, "dead", V.decor, "Velvet altar/reading cloth, 24\"."],
    ["Rose Quartz Rune Set", "Tarot & Books", 38, 16, 3, "", 4, 0, 1, "dead", V.gem, "25 engraved rose quartz runes in pouch."],

    // Decor & altar
    ["Brass Crescent Wall Hanging", "Decor & Altar", 34, 12, 14, "", 4, 0, 2, "", V.decor, "Hammered brass crescent moon wall decor."],
    ["Crystal Display Stand Set", "Decor & Altar", 9, 2, 30, "", 20, 0, 10, "", V.decor, "Set of 3 acrylic/wire sphere stands."],
    ["Singing Bowl (5\")", "Decor & Altar", 45, 18, 5, "", 3, 0, 1, "dead", V.decor, "Hand-hammered singing bowl with mallet."],
    ["Selenite Charging Plate", "Decor & Altar", 16, 4.5, 30, "", 6, 0, 6, "", V.moon, "Round selenite plate for charging jewelry and stones."],
    ["Wooden Altar Box", "Decor & Altar", 20, 7, 12, "", 6, 0, 2, "", V.decor, "Carved wooden box with moon phases."],
    ["Himalayan Salt Lamp (Small)", "Decor & Altar", 25, 9, 14, "", 5, 0, 2, "", V.decor, "Natural salt lamp, 5–7 lb, with cord."],
    ["Himalayan Salt Lamp (Medium)", "Decor & Altar", 42, 17, 3, "", 6, 0, 1, "dead", V.decor, "Natural salt lamp, 9–11 lb. Heavy, slow mover."],
    ["Crystal Grid Cloth", "Decor & Altar", 12, 3.5, 10, "", 9, 0, 3, "", V.decor, "Flower of life grid cloth, 12\"."],
    ["Macramé Dreamcatcher", "Decor & Altar", 18, 6, 12, "", 5, 0, 2, "", V.decor, "Handmade macramé dreamcatcher."],

    // 3D printed — the Whisto wholesale line
    ["Crescent Moon Sphere Stand", "3D Printed", 8, 1.5, 28, "", 12, 0, 6, "", V.whisto, "3D printed crescent moon stand for spheres up to 60mm. Made locally by Whisto."],
    ["Dragon Egg Display Cradle", "3D Printed", 14, 3, 20, "", 7, 0, 4, "", V.whisto, "Dragon claw cradle for eggs/spheres. Made locally by Whisto."],
    ["Articulated Crystal Dragon", "3D Printed", 18, 4, 34, "", 3, 0, 5, "", V.whisto, "Flexible articulated dragon in crystal-tone silk filament. Made locally by Whisto."],
  ];

  const CAT_COLORS = {
    "Tumbled Stones": "#9b86ea",
    "Towers & Points": "#5ec8c4",
    "Clusters & Geodes": "#ea8cc8",
    "Spheres & Carvings": "#f2e078",
    "One-of-a-Kind": "#f0a868",
    "Jewelry": "#7fb6ff",
    "Sage & Smudge": "#8fd18b",
    "Incense & Resins": "#d98a6c",
    "Oils & Candles": "#e6b8f5",
    "Tarot & Books": "#b8a98a",
    "Decor & Altar": "#79d4c4",
    "3D Printed": "#c9d46a",
  };
  const categories = Object.keys(CAT_COLORS).map((name) => ({ name, color: CAT_COLORS[name] }));

  const items = CATALOG.map((r, i) => {
    const [name, category, price, cost, popularity, flags, qty, onOrder, reorderPoint, state, vendor, description] = r;
    const prefix = category.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
    const out = /^out(\d+)$/.exec(state);
    return {
      id: "ITM" + String(1001 + i),
      sku: prefix + "-" + String(100 + i),
      name, category, description, vendor,
      price, cost,
      popularity,
      consumable: flags.includes("c"),
      unique: flags.includes("u"),
      qtyInStock: qty,
      qtyOnOrder: onOrder,
      reorderPoint,
      // internal hints for the generator
      _stockoutDaysAgo: out ? +out[1] : null,
      _dead: state === "dead",
      lastCountedDaysAgo: rint(3, 40),
      // When the item was added in Clover (Clover keeps this as item.createdTime)
      addedDaysAgo: flags.includes("u") ? (state === "dead" ? rint(190, 240) : rint(15, 75)) : rint(200, 800),
      // Smallest amount the vendor sells (case / bag / pack)
      minOrderQty: category === "Tumbled Stones" ? 25 : flags.includes("c") ? (price < 10 ? 12 : 6) : price < 20 ? 4 : 2,
    };
  });
  const itemById = Object.fromEntries(items.map((x) => [x.id, x]));
  const byName = (n) => items.find((x) => x.name === n);

  // Things people tend to buy together (drives "Frequently bought together")
  const AFFINITY = [
    ["White Sage Bundle (4\")", "Abalone Shell", 0.18],
    ["White Sage Bundle (8\")", "Abalone Shell", 0.22],
    ["White Sage Bundle (4\")", "Palo Santo Sticks (3-pack)", 0.3],
    ["Frankincense Resin (1oz)", "Charcoal Discs (10 roll)", 0.55],
    ["Myrrh Resin (1oz)", "Charcoal Discs (10 roll)", 0.5],
    ["Classic Tarot Deck", "Beginner's Tarot Guide", 0.35],
    ["Classic Tarot Deck", "Tarot Altar Cloth", 0.05],
    ["Rose Quartz Sphere (50mm)", "Crescent Moon Sphere Stand", 0.45],
    ["Labradorite Sphere (50mm)", "Crescent Moon Sphere Stand", 0.45],
    ["Ocean Jasper Sphere", "Dragon Egg Display Cradle", 0.35],
    ["Backflow Cones (Assorted)", "Ceramic Backflow Burner", 0.15],
    ["Chime Candles (20 pack)", "Protection Ritual Oil", 0.3],
    ["Selenite Stick (6\")", "Black Tourmaline, Tumbled", 0.35],
    ["Amethyst, Tumbled", "Rose Quartz, Tumbled", 0.4],
    ["Crack-Your-Own Geode", "Amethyst, Tumbled", 0.2],
    ["Nag Champa Incense (15g)", "Dragon's Blood Incense", 0.3],
  ].map(([a, b, p]) => ({ a: byName(a).id, b: byName(b).id, p }));

  // ---- Staff ---------------------------------------------------------------
  const employees = [
    { id: "EMP1", name: "Dana R." },
    { id: "EMP2", name: "Marcus T." },
    { id: "EMP3", name: "Jess L." },
  ];

  // ---- Customers (fictional; phones use 555-01xx, reserved for fiction) -----
  const CUST = [
    // [first, last, interval days (0 = no pattern), favorite consumables, stopped coming N days ago, smsOptIn, note]
    ["Maria", "Delgado", 21, ["White Sage Bundle (4\")", "Palo Santo Sticks (3-pack)"], 34, true, "Buys sage every few weeks. Asks about new tumbled stones."],
    ["Kevin", "O'Rourke", 28, ["Nag Champa Incense (15g)", "Dragon's Blood Incense"], 40, false, "Incense regular. Prefers a call over text."],
    ["Alana", "Brooks", 30, ["Chime Candles (20 pack)", "Protection Ritual Oil"], 45, true, "Candle magic — buys chime candles + oil together."],
    ["Theresa", "Nguyen", 35, ["Frankincense Resin (1oz)", "Charcoal Discs (10 roll)"], 3, true, "Resin buyer, always needs charcoal."],
    ["Jordan", "Price", 18, ["White Sage Bundle (8\")"], 26, false, "Large sage bundles only."],
    ["Bree", "Castellano", 25, ["Palo Santo Sticks (3-pack)", "Sage Smudge Spray"], 9, true, "Teaches yoga in Pitman — buys for her studio."],
    ["Samuel", "Whitaker", 0, [], 60, false, "Collector. Interested in large amethyst pieces."],
    ["Danielle", "Ford", 42, ["Lavender Essential Oil", "Moon Water Room Spray"], 50, true, ""],
    ["Priya", "Raman", 30, ["Intention Candle — Love", "Rose Petal Sage Wand"], 12, true, "Asked to be told when rose quartz hearts come back."],
    ["Chris", "Halloran", 0, [], 15, false, "Buys gifts at holidays."],
    ["Nicole", "Vance", 20, ["Backflow Cones (Assorted)"], 38, true, ""],
    ["Hector", "Ruiz", 32, ["Blue Sage Bundle", "Cedar Bundle"], 8, false, ""],
    ["Gina", "Marchetti", 26, ["White Sage Bundle (4\")", "Abalone Shell"], 30, true, "Long-time regular, knows the family."],
    ["Tasha", "Greene", 0, [], 4, true, "Tarot reader, buys decks for students."],
    ["Owen", "Kowalski", 45, ["Sandalwood Cones"], 70, false, "Hasn't been in since summer."],
    ["Leah", "Bernstein", 28, ["Soy Tealights (12)", "Abundance Ritual Oil"], 19, true, ""],
    ["Ray", "Dunleavy", 0, [], 22, false, "Brings his grandkids for the geodes."],
    ["Monique", "Baptiste", 24, ["Dragon's Blood Incense", "Sage Smudge Spray"], 27, true, ""],
    ["Ashley", "Turner", 35, ["Frankincense Essential Oil"], 44, false, ""],
    ["Paul", "Iacono", 0, [], 90, false, "Bought the large amethyst cluster in May."],
    ["Renee", "Shah", 22, ["Nag Champa Incense (15g)"], 2, true, ""],
    ["Victor", "Lam", 40, ["Myrrh Resin (1oz)", "Charcoal Discs (10 roll)"], 36, false, ""],
    ["Courtney", "Ellis", 30, ["White Sage Bundle (4\")", "Chime Candles (20 pack)"], 55, true, "Comes in around the full moon."],
    ["Mike", "Santangelo", 0, [], 11, false, "Local — buys bracelets for his wife."],
    ["Faith", "Adeyemi", 27, ["Rose Petal Sage Wand", "Palo Santo Sticks (3-pack)"], 6, true, ""],
    ["Kara", "Lindqvist", 33, ["Lavender Essential Oil", "Soy Tealights (12)"], 24, true, ""],
  ];
  const customers = CUST.map((c, i) => {
    const [first, last, interval, favs, stoppedDaysAgo, smsOptIn, note] = c;
    return {
      id: "CUS" + String(501 + i),
      firstName: first,
      lastName: last,
      name: first + " " + last,
      phone: "(856) 555-" + String(100 + i * 3).padStart(4, "0"),
      email: (first[0] + last).toLowerCase().replace(/[^a-z]/g, "") + "@example.com",
      smsOptIn,
      note,
      joinedDaysAgo: rint(120, 900),
      _interval: interval,
      _favs: favs.map((n) => byName(n).id),
      _stopped: stoppedDaysAgo,
    };
  });

  // ---- Store calendar -------------------------------------------------------
  // Closed Monday. Tue–Sat 11–7, Sun 11–5.
  const HOURS = { 0: [11, 17], 2: [11, 19], 3: [11, 19], 4: [11, 19], 5: [11, 19], 6: [11, 19] };
  function dayOrderCount(date) {
    const dow = date.getDay();
    if (!HOURS[dow]) return 0;
    const m = date.getMonth(); // 3=Apr ... 9=Oct
    const season = { 3: 0.9, 4: 1.0, 5: 1.05, 6: 1.15, 7: 1.3, 8: 1.3, 9: 0.75 }[m] || 1;
    const dowMult = { 0: 1.6, 2: 0.8, 3: 0.85, 4: 0.95, 5: 1.25, 6: 2.3 }[dow];
    const base = 4.6 * season * dowMult;
    return Math.max(0, Math.round(base + (rand() - 0.5) * base * 0.6));
  }
  function pickHour(dow) {
    const [open, close] = HOURS[dow];
    const hours = [];
    for (let h = open; h < close; h++) hours.push(h);
    // busier early-mid afternoon
    return weightedPick(hours, (h) => (h >= 13 && h <= 16 ? 3 : h === 12 || h === 17 ? 2 : 1));
  }

  function availableOn(item, dAgo) {
    if (item.unique) return false;                                  // specimens handled separately
    if (item._stockoutDaysAgo != null && dAgo < item._stockoutDaysAgo) return false;
    if (item._dead && dAgo < 95) return false;
    return true;
  }

  // ---- Order generation -----------------------------------------------------
  const orders = [];
  const ALNUM = "ABCDEFGHJKMNPQRSTVWXYZ0123456789";
  const cloverId = () => Array.from({ length: 13 }, () => pick(ALNUM)).join("");
  const TAX = 0.06625; // NJ sales tax
  const DISCOUNTS = [
    { name: "Local 10%", pct: 0.1, w: 5 },
    { name: "Teacher 10%", pct: 0.1, w: 2 },
    { name: "Friends & Family 15%", pct: 0.15, w: 2 },
    { name: "Bundle $5 off", amt: 5, w: 1 },
  ];
  const CARD = ["Visa", "Visa", "Visa", "Mastercard", "Mastercard", "Amex", "Discover"];

  function addLine(lines, item, qty) {
    const existing = lines.find((l) => l.itemId === item.id);
    if (existing) { existing.qty += qty; return; }
    lines.push({ itemId: item.id, name: item.name, category: item.category, qty, unitPrice: item.price, unitCost: item.cost });
  }

  function buildOrder(date, lines, customerId) {
    if (!lines.length) return;
    const subtotal = round2(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0));
    let discount = null;
    if (rand() < (customerId ? 0.16 : 0.06)) {
      const d = weightedPick(DISCOUNTS, (x) => x.w);
      const amount = round2(d.pct ? subtotal * d.pct : Math.min(d.amt, subtotal));
      discount = { name: d.name, amount };
    }
    const discAmt = discount ? discount.amount : 0;
    const taxable = subtotal - discAmt;
    const tax = round2(taxable * TAX);
    const total = round2(taxable + tax);
    const cash = rand() < 0.28;
    const payment = cash
      ? { method: "Cash", tendered: Math.ceil(total / 5) * 5 + (rand() < 0.4 ? 5 : 0) }
      : { method: "Card", brand: pick(CARD), last4: String(rint(1000, 9999)), entry: rand() < 0.8 ? "Tap" : "Chip" };
    if (cash) payment.change = round2(payment.tendered - total);
    const emp = pick(employees);
    const o = {
      id: cloverId(),
      number: 0,
      createdAt: date,
      employeeId: emp.id,
      employeeName: emp.name,
      customerId: customerId || null,
      lines,
      subtotal, discount, tax, total,
      payment,
      refund: null,
    };
    // Occasional refunds
    if (rand() < 0.015) {
      const l = pick(lines);
      const amt = round2(l.unitPrice * (1 - (discount && discount.amount && subtotal ? discAmt / subtotal : 0)) * (1 + TAX));
      o.refund = { amount: amt, itemId: l.itemId, reason: pick(["Damaged / chipped", "Changed mind", "Wrong size", "Duplicate purchase"]), daysLater: rint(0, 6) };
    }
    orders.push(o);
  }

  function randomBasket(dAgo, size) {
    const pool = items.filter((it) => availableOn(it, dAgo));
    const lines = [];
    for (let k = 0; k < size; k++) {
      const it = weightedPick(pool, (x) => x.popularity);
      // tumbled stones and small items get bought in multiples
      const q = it.category === "Tumbled Stones" ? rint(1, 5) : it.price < 9 && rand() < 0.3 ? 2 : 1;
      addLine(lines, it, q);
      for (const af of AFFINITY) {
        if (af.a === it.id && rand() < af.p) {
          const b = itemById[af.b];
          if (availableOn(b, dAgo)) addLine(lines, b, 1);
        }
      }
    }
    return lines;
  }

  // 1) Walk-in traffic, ~180 days
  for (let d = 180; d >= 0; d--) {
    const day = daysAgo(d);
    const n = d === 0 ? Math.round(dayOrderCount(day) * 0.65) : dayOrderCount(day);
    for (let k = 0; k < n; k++) {
      const date = new Date(day);
      const hour = d === 0 ? rint(11, 15) : pickHour(day.getDay());
      date.setHours(hour, rint(0, 59), rint(0, 59), 0);
      const size = weightedPick([1, 2, 3, 4], (s) => [46, 32, 15, 7][s - 1]);
      // ~12% of walk-ins give a name/phone at checkout (the habit problem!)
      const cust = rand() < 0.12 ? pick(customers.filter((c) => c._interval === 0)).id : null;
      buildOrder(date, randomBasket(d, size), cust);
    }
  }

  // 2) Regulars on their repurchase cycle — the reorder call list comes from this
  for (const c of customers) {
    if (!c._interval) continue;
    let d = 180 - rint(0, c._interval);
    while (d >= c._stopped) {
      const day = daysAgo(d);
      if (HOURS[day.getDay()]) {
        const date = new Date(day);
        date.setHours(pickHour(day.getDay()), rint(0, 59), 0, 0);
        const lines = [];
        for (const fid of c._favs) {
          const it = itemById[fid];
          if (availableOn(it, d)) addLine(lines, it, rand() < 0.3 ? 2 : 1);
        }
        if (rand() < 0.45) for (const l of randomBasket(d, 1)) addLine(lines, itemById[l.itemId], l.qty);
        buildOrder(date, lines, c.id);
        d -= Math.max(7, c._interval + rint(-4, 4));
      } else {
        d -= 1;
      }
    }
  }

  // 3) A few one-of-a-kind specimens that already sold (history only)
  [
    ["Amethyst Cathedral Geode 24\"", 890, 400, 141, "CUS507"],
    ["Golden Healer Quartz Cluster", 260, 110, 98, null],
    ["Blue Apatite Specimen", 135, 55, 63, null],
    ["Amethyst Cluster (Large)", 65, 24, 140, "CUS520"],
  ].forEach(([name, price, cost, d, cust]) => {
    const date = daysAgo(d); date.setHours(14, 20, 0, 0);
    const existing = byName(name);
    buildOrder(date, [{ itemId: existing ? existing.id : "SOLD-" + name, name, category: "One-of-a-Kind", qty: 1, unitPrice: price, unitCost: cost }], cust);
  });

  orders.sort((a, b) => a.createdAt - b.createdAt);
  orders.forEach((o, i) => (o.number = 1001 + i));

  // Clean up generator-only fields on customers (keep _interval-free public shape)
  customers.forEach((c) => { delete c._interval; delete c._favs; delete c._stopped; });
  // Reports must work from stock + sales history only, like real Clover data,
  // so strip the generator's hints off the items too.
  items.forEach((it) => { delete it._stockoutDaysAgo; delete it._dead; delete it.popularity; });

  window.BTC = {
    isDemo: true,
    today: TODAY,
    taxRate: TAX,
    store: { name: "Beneath the Crescent", city: "Glendora, NJ", phone: "(856) 555-0199" },
    categories, items, customers, employees, orders,
    catColor: (name) => CAT_COLORS[name] || "#9b86ea",
  };
})();
