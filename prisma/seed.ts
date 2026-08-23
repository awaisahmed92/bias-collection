/* Bias Collection — database seeder (idempotent).
   Run: npm run db:seed */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ───────────────────────── helper data ─────────────────────────

const PERMISSION_GROUPS: string[] = [
  "products.view", "products.create", "products.update", "products.delete",
  "categories.manage",
  "inventory.view", "inventory.manage",
  "orders.view", "orders.update", "orders.cancel", "orders.refund",
  "customers.view", "customers.manage",
  "promotions.manage", "coupons.manage", "cms.manage", "reviews.manage",
  "reports.view", "shipping.manage", "payments.manage",
  "users.manage", "settings.manage", "audit.view",
];

const ROLE_DEFS: Record<string, { label: string; permissions: string[] | "*" }> = {
  super_admin: { label: "Super Admin", permissions: "*" },
  admin: {
    label: "Admin",
    permissions: PERMISSION_GROUPS.filter((p) => !["users.manage", "settings.manage", "audit.view"].includes(p)),
  },
  staff: {
    label: "Staff / Operations",
    permissions: ["products.view", "inventory.view", "inventory.manage", "orders.view", "orders.update", "orders.cancel", "customers.view", "reviews.manage"],
  },
  customer: { label: "Customer", permissions: [] },
};

async function main() {
  console.log("Seeding Bias Collection…");

  // ── permissions & roles ──
  for (const key of PERMISSION_GROUPS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  for (const [name, def] of Object.entries(ROLE_DEFS)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { label: def.label },
      create: { name, label: def.label },
    });
    const keys = def.permissions === "*" ? PERMISSION_GROUPS : def.permissions;
    for (const key of keys) {
      const perm = await prisma.permission.findUnique({ where: { key } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  console.log("✓ roles & permissions");

  // ── users ──
  const mk = async (email: string, pw: string, fn: string, ln: string, roleName: string, phone?: string) => {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    return prisma.user.upsert({
      where: { email },
      update: { roleId: role!.id },
      create: {
        email,
        firstName: fn,
        lastName: ln,
        phone: phone || null,
        passwordHash: bcrypt.hashSync(pw, 10),
        roleId: role!.id,
      },
    });
  };
  await mk("superadmin@biascollection.pk", "Admin@12345", "Aria", "Shah", "super_admin");
  await mk("admin@biascollection.pk", "Admin@12345", "Omar", "Farooq", "admin");
  await mk("staff@biascollection.pk", "Staff@12345", "Sana", "Malik", "staff");
  const demoCustomer = await mk("customer@example.com", "Customer@123", "Daniyal", "Raza", "customer", "+92 300 1234567");
  console.log("✓ users  (superadmin@biascollection.pk / Admin@12345)");

  // ── categories ──
  const catExists = await prisma.category.count();
  let catMen: any, catWomen: any, catAcc: any, sub: Record<string, any> = {};
  if (catExists === 0) {
    catMen = await prisma.category.create({
      data: { name: "Men", slug: "men", image: "/images/cat-men.jpg", displayOrder: 1, seoTitle: "Men's Collection — Bias Collection", seoDescription: "Premium menswear: shirts, tees, jackets and eastern wear." },
    });
    catWomen = await prisma.category.create({
      data: { name: "Women", slug: "women", image: "/images/cat-women.jpg", displayOrder: 2, seoTitle: "Women's Collection — Bias Collection", seoDescription: "Elegant womenswear: dresses, tops and scarves." },
    });
    catAcc = await prisma.category.create({
      data: { name: "Accessories", slug: "accessories", image: "/images/cat-accessories.jpg", displayOrder: 3, seoTitle: "Accessories — Bias Collection", seoDescription: "Finishing touches: belts, watches, eyewear and bags." },
    });
    const mkSub = (name: string, slug: string, parentId: string, order: number) =>
      prisma.category.create({ data: { name, slug, parentId, displayOrder: order } });
    sub = {
      shirts: await mkSub("Shirts", "men-shirts", catMen.id, 1),
      tshirts: await mkSub("T-Shirts", "men-t-shirts", catMen.id, 2),
      jackets: await mkSub("Jackets", "men-jackets", catMen.id, 3),
      eastern: await mkSub("Eastern", "men-eastern", catMen.id, 4),
      dresses: await mkSub("Dresses", "women-dresses", catWomen.id, 1),
      tops: await mkSub("Tops", "women-tops", catWomen.id, 2),
      scarves: await mkSub("Scarves", "women-scarves", catWomen.id, 3),
    };
    console.log("✓ categories");
  } else {
    catMen = await prisma.category.findUnique({ where: { slug: "men" } });
    catWomen = await prisma.category.findUnique({ where: { slug: "women" } });
    catAcc = await prisma.category.findUnique({ where: { slug: "accessories" } });
    for (const s of ["men-shirts", "men-t-shirts", "men-jackets", "men-eastern", "women-dresses", "women-tops", "women-scarves"]) {
      sub[s] = await prisma.category.findUnique({ where: { slug: s } });
    }
  }

  // ── products ──
  if ((await prisma.product.count()) === 0) {
    const sizes = ["S", "M", "L", "XL"];
    const sizeVariants = (skuBase: string, stocks: number[], price?: number) =>
      sizes.map((size, i) => ({
        size,
        sku: `${skuBase}-${size}`,
        price: price ?? null,
        stock: stocks[i] ?? 8,
      }));

    const P = async (data: any) => prisma.product.create({ data });

    await P({
      name: "Signature Oxford Shirt",
      slug: "signature-oxford-shirt",
      shortDescription: "Crisp premium cotton oxford with mother-of-pearl buttons.",
      description: "Our signature oxford is cut from breathable long-staple cotton with a tailored-yet-relaxed silhouette. Pre-washed for softness, finished with real shell buttons and a structured collar that stands all day.",
      sku: "BC-OXF-001",
      categoryId: sub.shirts.id,
      tags: "oxford,shirt,cotton,formal,workwear",
      originalPrice: 4950,
      salePrice: 3950,
      costPrice: 2100,
      lowStockThreshold: 4,
      isFeatured: true,
      isNewArrival: true,
      soldCount: 43,
      viewCount: 510,
      seoTitle: "Signature Oxford Shirt — Bias Collection",
      seoDescription: "Premium cotton oxford shirt with mother-of-pearl buttons. Free shipping over Rs. 5,000.",
      images: { create: [{ url: "/images/p-oxford.jpg", sortOrder: 0 }, { url: "/images/cat-men.jpg", alt: "Lifestyle", sortOrder: 1 }] },
      variants: { create: sizeVariants("BC-OXF-001", [6, 14, 12, 3]) },
    });

    await P({
      name: "Essential Crew Tee",
      slug: "essential-crew-tee",
      shortDescription: "Heavyweight 220 GSM combed cotton tee.",
      description: "The perfect everyday tee — dense yet breathable 220 GSM combed cotton, ribbed collar that keeps its shape, and a clean drape. Buy 2, get 1 free all season.",
      sku: "BC-TEE-002",
      categoryId: sub.tshirts.id,
      tags: "tshirt,tee,basic,cotton,everyday",
      originalPrice: 2450,
      costPrice: 900,
      lowStockThreshold: 6,
      isNewArrival: true,
      soldCount: 128,
      viewCount: 940,
      images: { create: [{ url: "/images/p-tee.jpg", sortOrder: 0 }] },
      variants: {
        create: [
          { size: "S", color: "Black", sku: "BC-TEE-002-BLK-S", stock: 20 },
          { size: "M", color: "Black", sku: "BC-TEE-002-BLK-M", stock: 25 },
          { size: "L", color: "Black", sku: "BC-TEE-002-BLK-L", stock: 18 },
          { size: "XL", color: "Black", sku: "BC-TEE-002-BLK-XL", stock: 0 },
          { size: "S", color: "White", sku: "BC-TEE-002-WHT-S", price: 2550, stock: 16 },
          { size: "M", color: "White", sku: "BC-TEE-002-WHT-M", price: 2550, stock: 22 },
          { size: "L", color: "White", sku: "BC-TEE-002-WHT-L", price: 2550, stock: 11 },
        ],
      },
    });

    await P({
      name: "Classic Denim Jacket",
      slug: "classic-denim-jacket",
      shortDescription: "Medium-wash trucker jacket in rigid Japanese denim.",
      description: "A forever layer. Rigid 12oz Japanese denim, antique copper hardware, and a classic trucker fit that breaks in beautifully with wear.",
      sku: "BC-DNM-003",
      categoryId: sub.jackets.id,
      tags: "denim,jacket,trucker,layering",
      originalPrice: 8950,
      costPrice: 4200,
      isFeatured: true,
      soldCount: 61,
      viewCount: 720,
      images: { create: [{ url: "/images/p-denim.jpg", sortOrder: 0 }] },
      variants: { create: sizeVariants("BC-DNM-003", [4, 9, 8, 5]) },
    });

    await P({
      name: "Piqué Polo — Navy",
      slug: "pique-polo-navy",
      shortDescription: "Breathable piqué knit polo with a refined collar.",
      description: "A smart-casual staple in breathable cotton piqué. Side vents, reinforced placket, and a collar that refuses to curl.",
      sku: "BC-POL-004",
      categoryId: sub.shirts.id,
      tags: "polo,pique,smart casual",
      originalPrice: 3450,
      costPrice: 1400,
      soldCount: 37,
      viewCount: 300,
      images: { create: [{ url: "/images/p-polo.jpg", sortOrder: 0 }] },
      variants: { create: sizeVariants("BC-POL-004", [8, 15, 12, 7]) },
    });

    await P({
      name: "Regal Embroidered Kurta",
      slug: "regal-embroidered-kurta",
      shortDescription: "Festive kurta with subtle gold-thread embroidery.",
      description: "Hand-finished gold threadwork on a pristine cotton-silk kurta. Cut for comfort with a band collar and concealed placket — celebration-ready.",
      sku: "BC-KUR-005",
      categoryId: sub.eastern.id,
      tags: "kurta,eastern,festive,embroidered",
      originalPrice: 6950,
      salePrice: 5950,
      costPrice: 3100,
      isFeatured: true,
      isNewArrival: true,
      soldCount: 52,
      viewCount: 860,
      images: { create: [{ url: "/images/p-kurta.jpg", sortOrder: 0 }] },
      variants: { create: sizeVariants("BC-KUR-005", [7, 13, 10, 2]) },
    });

    await P({
      name: "Scarlett Midi Dress",
      slug: "scarlett-midi-dress",
      shortDescription: "Flowing floral midi with a smocked bodice.",
      description: "Sun-washed terracotta florals on airy viscose. Smocked bodice, flutter sleeves, and a skirt that moves with you.",
      sku: "BC-DRS-006",
      categoryId: sub.dresses.id,
      tags: "dress,midi,floral,summer",
      originalPrice: 7450,
      costPrice: 3300,
      isFeatured: true,
      isNewArrival: true,
      soldCount: 74,
      viewCount: 1120,
      images: { create: [{ url: "/images/p-dress.jpg", sortOrder: 0 }, { url: "/images/cat-women.jpg", alt: "Lifestyle", sortOrder: 1 }] },
      variants: {
        create: [
          { size: "S", sku: "BC-DRS-006-S", stock: 9 },
          { size: "M", sku: "BC-DRS-006-M", stock: 14 },
          { size: "L", sku: "BC-DRS-006-L", stock: 6 },
        ],
      },
    });

    await P({
      name: "Ivory Silk Blouse",
      slug: "ivory-silk-blouse",
      shortDescription: "Fluid mulberry silk blouse with delicate drape.",
      description: "100% mulberry silk in a timeless ivory tone. Relaxed fit, drop shoulders, and mother-of-pearl buttons — desk to dinner in one piece.",
      sku: "BC-BLS-007",
      categoryId: sub.tops.id,
      tags: "blouse,silk,ivory,elegant",
      originalPrice: 5250,
      costPrice: 2400,
      soldCount: 29,
      viewCount: 410,
      images: { create: [{ url: "/images/p-blouse.jpg", sortOrder: 0 }] },
      variants: {
        create: [
          { size: "S", sku: "BC-BLS-007-S", stock: 8 },
          { size: "M", sku: "BC-BLS-007-M", stock: 12 },
          { size: "L", sku: "BC-BLS-007-L", stock: 5 },
        ],
      },
    });

    await P({
      name: "Heritage Printed Scarf",
      slug: "heritage-printed-scarf",
      shortDescription: "Silk-twill scarf in a geometric terracotta print.",
      description: "A generous 90×90 cm silk-twill square with hand-rolled edges, printed in our archive geometric motif.",
      sku: "BC-SCF-008",
      categoryId: sub.scarves.id,
      tags: "scarf,silk,print,accessory",
      originalPrice: 2950,
      costPrice: 1200,
      stock: 25,
      soldCount: 33,
      viewCount: 260,
      images: { create: [{ url: "/images/p-scarf.jpg", sortOrder: 0 }] },
    });

    await P({
      name: "Artisan Leather Belt",
      slug: "artisan-leather-belt",
      shortDescription: "Full-grain tan leather with brushed brass buckle.",
      description: "Cut from a single strap of vegetable-tanned full-grain leather, finished with a solid brushed-brass buckle. Ages beautifully.",
      sku: "BC-BLT-009",
      categoryId: catAcc.id,
      tags: "belt,leather,tan,brass",
      originalPrice: 3250,
      costPrice: 1300,
      soldCount: 41,
      viewCount: 350,
      images: { create: [{ url: "/images/p-belt.jpg", sortOrder: 0 }] },
      variants: {
        create: ["32", "34", "36", "38"].map((size, i) => ({ size, sku: `BC-BLT-009-${size}`, stock: [5, 7, 2, 4][i] })),
      },
    });

    await P({
      name: "Minimalist Gold Watch",
      slug: "minimalist-gold-watch",
      shortDescription: "36mm quartz, cream dial, tan leather strap.",
      description: "A study in restraint — slim 36mm gold-tone case, eggshell dial, and a quick-release Italian leather strap. 5ATM water resistant.",
      sku: "BC-WCH-010",
      categoryId: catAcc.id,
      tags: "watch,minimalist,gold,leather",
      originalPrice: 12950,
      costPrice: 6100,
      stock: 8,
      lowStockThreshold: 3,
      isFeatured: true,
      soldCount: 18,
      viewCount: 690,
      images: { create: [{ url: "/images/p-watch.jpg", sortOrder: 0 }] },
    });

    await P({
      name: "Riviera Sunglasses",
      slug: "riviera-sunglasses",
      shortDescription: "Hand-polished tortoise acetate, UV400 lenses.",
      description: "Five-barrel-hinge tortoise acetate frames with scratch-resistant UV400 lenses. Includes linen case and microfiber cloth.",
      sku: "BC-SUN-011",
      categoryId: catAcc.id,
      tags: "sunglasses,acetate,tortoise,uv400",
      originalPrice: 4450,
      costPrice: 1800,
      stock: 18,
      soldCount: 56,
      viewCount: 830,
      images: { create: [{ url: "/images/p-sunglasses.jpg", sortOrder: 0 }] },
    });

    await P({
      name: "Everyday Canvas Tote",
      slug: "everyday-canvas-tote",
      shortDescription: "18oz canvas tote with leather handles.",
      description: "Carries the day: reinforced 18oz cotton canvas, full-grain leather handles, interior zip pocket, and magnetic closure.",
      sku: "BC-TOT-012",
      categoryId: catAcc.id,
      tags: "tote,canvas,bag,everyday",
      originalPrice: 3850,
      costPrice: 1500,
      stock: 15,
      isNewArrival: true,
      soldCount: 22,
      viewCount: 300,
      images: { create: [{ url: "/images/p-tote.jpg", sortOrder: 0 }] },
    });

    await P({
      name: "Court White Sneakers",
      slug: "court-white-sneakers",
      shortDescription: "Minimal Italian leather sneakers.",
      description: "Clean-line court sneakers in full-grain Italian leather with a cushioned footbed and tonal rubber sole.",
      sku: "BC-SNK-013",
      categoryId: catAcc.id,
      tags: "sneakers,leather,white,minimal",
      originalPrice: 9450,
      costPrice: 4400,
      isNewArrival: true,
      soldCount: 27,
      viewCount: 520,
      images: { create: [{ url: "/images/p-sneakers.jpg", sortOrder: 0 }] },
      variants: {
        create: ["40", "41", "42", "43", "44"].map((size, i) => ({ size, sku: `BC-SNK-013-${size}`, stock: [3, 6, 7, 4, 2][i] })),
      },
    });

    console.log("✓ products (13)");
  }

  // ── coupons ──
  if ((await prisma.coupon.count()) === 0) {
    await prisma.coupon.createMany({
      data: [
        {
          code: "BIAS20",
          description: "20% off on orders above Rs. 5,000 (max Rs. 2,000)",
          type: "PERCENTAGE",
          amount: 20,
          minOrderAmount: 5000,
          maxDiscount: 2000,
          usagePerCustomer: 3,
          isActive: true,
        },
        {
          code: "WELCOME10",
          description: "10% welcome discount for new customers",
          type: "PERCENTAGE",
          amount: 10,
          usagePerCustomer: 1,
          isActive: true,
        },
        {
          code: "FREESHIP",
          description: "Free shipping on orders above Rs. 3,000",
          type: "FREE_SHIPPING",
          amount: 0,
          minOrderAmount: 3000,
          isActive: true,
        },
      ],
    });
    console.log("✓ coupons (BIAS20, WELCOME10, FREESHIP)");
  }

  // ── promotions ──
  if ((await prisma.promotion.count()) === 0) {
    const now = new Date();
    const aug1 = new Date(now.getFullYear(), 7, 1);
    const sep15 = new Date(now.getFullYear(), 8, 15);
    const flashEnd = new Date(now.getTime() + 48 * 3600 * 1000);

    await prisma.promotion.create({
      data: {
        name: "Summer Sale 2026",
        description: "Store-wide 15% off — summer finale",
        type: "STORE_WIDE",
        discountType: "PERCENTAGE",
        discountValue: 15,
        startDate: aug1,
        endDate: sep15,
        priority: 1,
      },
    });

    const sunglasses = await prisma.product.findUnique({ where: { slug: "riviera-sunglasses" } });
    if (sunglasses)
      await prisma.promotion.create({
        data: {
          name: "Flash: 30% off Riviera Sunglasses",
          description: "48-hour flash deal",
          type: "FLASH",
          discountType: "PERCENTAGE",
          discountValue: 30,
          startDate: new Date(now.getTime() - 24 * 3600 * 1000),
          endDate: flashEnd,
          priority: 10,
          products: { create: { productId: sunglasses.id } },
        },
      });

    const accessories = await prisma.category.findUnique({ where: { slug: "accessories" } });
    if (accessories)
      await prisma.promotion.create({
        data: {
          name: "Accessories Fest — 10%",
          description: "Extra 10% off all accessories",
          type: "CATEGORY",
          discountType: "PERCENTAGE",
          discountValue: 10,
          startDate: new Date(now.getTime() - 10 * 86400000),
          endDate: new Date(now.getTime() + 10 * 86400000),
          priority: 5,
          categories: { create: { categoryId: accessories.id } },
        },
      });

    const tee = await prisma.product.findUnique({ where: { slug: "essential-crew-tee" } });
    if (tee)
      await prisma.promotion.create({
        data: {
          name: "Tee Deal — Buy 2 Get 1 Free",
          type: "BUY_X_GET_Y",
          discountType: "PERCENTAGE",
          discountValue: 0,
          configJson: JSON.stringify({ buy: 2, get: 1 }),
          startDate: aug1,
          endDate: sep15,
          priority: 20,
          products: { create: { productId: tee.id } },
        },
      });

    console.log("✓ promotions (store-wide 15%, flash 30%, accessories 10%, B2G1 tees)");
  }

  // ── banners ──
  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.createMany({
      data: [
        {
          title: "Discover Your Style",
          subtitle: "BIAS COLLECTION — The Autumn Edit has arrived",
          desktopImage: "/images/hero-desktop.jpg",
          mobileImage: "/images/hero-mobile.jpg",
          linkUrl: "/shop",
          buttonText: "Shop Now",
          position: "HOME_HERO",
          displayOrder: 1,
        },
        {
          title: "The Autumn Edit",
          subtitle: "Warm neutrals, considered layers",
          desktopImage: "/images/promo-banner.jpg",
          linkUrl: "/new-arrivals",
          buttonText: "Explore New Arrivals",
          position: "HOME_MIDDLE",
          displayOrder: 1,
        },
      ],
    });
    console.log("✓ banners");
  }

  // ── homepage sections ──
  if ((await prisma.homepageSection.count()) === 0) {
    await prisma.homepageSection.createMany({
      data: [
        { type: "HERO", title: "Discover Your Style", subtitle: "BIAS COLLECTION", buttonText: "Shop Now", buttonLink: "/shop", displayOrder: 0 },
        { type: "CATEGORY_GRID", title: "Shop by Category", subtitle: "Curated worlds of Bias", displayOrder: 1, configJson: JSON.stringify({ maxItems: 3 }) },
        { type: "NEW_ARRIVALS", title: "New Arrivals", subtitle: "Fresh off the atelier floor", buttonText: "View All", buttonLink: "/new-arrivals", displayOrder: 2, configJson: JSON.stringify({ maxItems: 8 }) },
        { type: "FEATURED_PRODUCTS", title: "Featured", subtitle: "Pieces our stylists can't stop wearing", displayOrder: 3, configJson: JSON.stringify({ maxItems: 8 }) },
        {
          type: "PROMO_BANNER",
          title: "The Autumn Edit",
          subtitle: "Warm neutrals and considered layers — our most refined season yet.",
          image: "/images/promo-banner.jpg",
          buttonText: "Explore the Edit",
          buttonLink: "/new-arrivals",
          displayOrder: 4,
        },
        { type: "BEST_SELLERS", title: "Best Sellers", subtitle: "Loved. Worn. Reordered.", displayOrder: 5, configJson: JSON.stringify({ maxItems: 4 }) },
        {
          type: "SALE_BANNER",
          title: "SUMMER SALE",
          subtitle: "Store-wide 15% off + extra 20% over Rs. 5,000 with code BIAS20",
          buttonText: "Shop the Sale",
          buttonLink: "/sale",
          displayOrder: 6,
        },
        { type: "NEWSLETTER", title: "Join the Bias List", subtitle: "Early access, private sales and notes from the atelier.", displayOrder: 7 },
      ],
    });
    console.log("✓ homepage sections");
  }

  // ── shipping ──
  if ((await prisma.shippingMethod.count()) === 0) {
    await prisma.shippingMethod.createMany({
      data: [
        { name: "Standard — Karachi", description: "Delivered within Karachi", zone: "Karachi", price: 200, freeAbove: 5000, minDays: 1, maxDays: 2, sortOrder: 1 },
        { name: "Standard — Other Cities", description: "Nationwide delivery", zone: null, price: 300, freeAbove: 5000, minDays: 3, maxDays: 5, sortOrder: 2 },
        { name: "Express Delivery", description: "Priority nationwide courier", zone: null, price: 500, minDays: 1, maxDays: 2, sortOrder: 3 },
      ],
    });
    console.log("✓ shipping methods");
  }

  // ── payment methods ──
  if ((await prisma.paymentMethodConfig.count()) === 0) {
    await prisma.paymentMethodConfig.createMany({
      data: [
        { key: "cod", name: "Cash on Delivery", description: "Pay in cash when your order arrives.", isEnabled: true, sortOrder: 1 },
        {
          key: "bank_transfer",
          name: "Bank Transfer",
          description: "Transfer to our account and share the receipt on WhatsApp.",
          instructions: "Bank: Meezan Bank | Title: Bias Collection (Pvt) Ltd | IBAN: PK00 MEZN 0000 1234 5678 9012 | Send receipt to +92 300 0000000",
          isEnabled: true,
          sortOrder: 2,
        },
        { key: "card", name: "Card Payment", description: "Visa / Mastercard via secure gateway (sandbox).", isEnabled: false, sortOrder: 3 },
        { key: "wallet", name: "Wallet Payment", description: "JazzCash / EasyPaisa (sandbox).", isEnabled: false, sortOrder: 4 },
      ],
    });
    console.log("✓ payment methods");
  }

  // ── settings ──
  const settings: Record<string, string> = {
    storeName: "Bias Collection",
    storeEmail: "hello@biascollection.pk",
    storePhone: "+92 300 0000000",
    storeAddress: "Clifton, Karachi, Pakistan",
    currency: "Rs.",
    taxRatePercent: "0",
    announcement: "Free shipping on orders above Rs. 5,000 — Summer Sale is live",
    instagramUrl: "https://instagram.com/biascollection",
    facebookUrl: "https://facebook.com/biascollection",
    whatsappNumber: "+92 300 0000000",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log("✓ settings");

  // ── reviews ──
  if ((await prisma.review.count()) === 0) {
    const bySlug = async (slug: string) => prisma.product.findUnique({ where: { slug } });
    const oxford = await bySlug("signature-oxford-shirt");
    const dress = await bySlug("scarlett-midi-dress");
    const watch = await bySlug("minimalist-gold-watch");
    const data: any[] = [];
    if (oxford) data.push({ productId: oxford.id, userId: demoCustomer.id, rating: 5, comment: "Beautiful fabric and stitching — my third Bias shirt.", status: "APPROVED" });
    if (dress) data.push({ productId: dress.id, userId: demoCustomer.id, rating: 4, comment: "Falls beautifully. Slightly long for me but lovely overall.", status: "APPROVED" });
    if (watch) data.push({ productId: watch.id, userId: demoCustomer.id, rating: 5, comment: "Looks twice its price. Gets compliments daily.", status: "APPROVED" });
    if (oxford) data.push({ productId: oxford.id, userId: demoCustomer.id, rating: 3, comment: "Good shirt, delivery took a day longer than promised.", status: "PENDING" });
    if (data.length) await prisma.review.createMany({ data });
    console.log("✓ reviews");
  }

  // ── demo orders (for analytics & admin demo) ──
  if ((await prisma.order.count()) === 0) {
    const products = await prisma.product.findMany({ include: { variants: true, images: { take: 1 } } });
    if (products.length) {
      const rng = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
      const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
      const statuses = ["DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "SHIPPED", "PROCESSING", "PENDING", "CANCELLED"];
      const cities = ["Karachi", "Lahore", "Islamabad", "Hyderabad", "Faisalabad"];
      const names: [string, string, string][] = [
        ["Daniyal", "Raza", "customer@example.com"],
        ["Hira", "Khan", "hira.khan@gmail.com"],
        ["Bilal", "Ahmed", "bilal.ahmed@yahoo.com"],
        ["Ayesha", "Siddiqui", "ayesha.s@gmail.com"],
        ["Faisal", "Qureshi", "fqureshi@outlook.com"],
      ];
      let seq = 10001;
      for (let i = 0; i < 42; i++) {
        const daysAgo = i < 4 ? rng(0, 2) : rng(3, 180);
        const placed = new Date(Date.now() - daysAgo * 86400000 - rng(0, 86400000));
        const status = daysAgo < 2 ? pick(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"]) : pick(statuses);
        const [fn, ln, email] = pick(names);
        const city = pick(cities);
        const items = Array.from({ length: rng(1, 3) }, () => pick(products));
        const uniqueItems = [...new Set(items)];
        const itemRows = uniqueItems.map((p) => {
          const qty = rng(1, 2);
          const unit = p.salePrice ?? p.originalPrice;
          return {
            productId: p.id,
            variantId: null,
            productName: p.name,
            sku: p.sku,
            image: p.images[0]?.url ?? null,
            quantity: qty,
            originalPrice: p.originalPrice,
            finalPrice: unit,
            lineTotal: Math.round(unit * qty),
          };
        });
        const subtotal = itemRows.reduce((s, r) => s + r.originalPrice * r.quantity, 0);
        const lineTotal = itemRows.reduce((s, r) => s + r.lineTotal, 0);
        const shipping = lineTotal >= 5000 ? 0 : city === "Karachi" ? 200 : 300;
        const total = lineTotal + shipping;
        const isRegistered = email === "customer@example.com";
        const paymentMethod = Math.random() < 0.75 ? "cod" : Math.random() < 0.5 ? "bank_transfer" : "card";
        const paid = status === "DELIVERED" || paymentMethod === "card";
        const orderNumber = `BC-2026-${seq++}`;

        const order = await prisma.order.create({
          data: {
            orderNumber,
            userId: isRegistered ? demoCustomer.id : null,
            customerFirstName: fn,
            customerLastName: ln,
            email,
            phone: "+92 3" + rng(10, 49) + " " + rng(1000000, 9999999),
            shippingCountry: "Pakistan",
            shippingCity: city,
            shippingArea: pick(["Clifton", "DHA Phase 5", "Gulshan-e-Iqbal", "Model Town", "F-7", "Latifabad"]),
            shippingAddress: `House ${rng(1, 500)}, Street ${rng(1, 30)}`,
            subtotal,
            productSavings: subtotal - lineTotal,
            shippingCost: shipping,
            total,
            shippingMethodName: city === "Karachi" ? "Standard — Karachi" : "Standard — Other Cities",
            status,
            paymentMethod,
            paymentStatus: status === "CANCELLED" ? "PENDING" : paid ? "PAID" : "PENDING",
            placedAt: placed,
            updatedAt: placed,
            items: { create: itemRows },
            history: {
              create: [
                { status: "PENDING", note: "Order placed", createdAt: placed },
                ...(status !== "PENDING" ? [{ status, note: "", createdAt: new Date(placed.getTime() + 86400000) }] : []),
              ],
            },
            payments: {
              create: {
                method: paymentMethod,
                amount: total,
                status: paid ? "SUCCESS" : "PENDING",
                transactionId: `${paymentMethod.toUpperCase()}-${orderNumber}`,
                createdAt: placed,
              },
            },
          },
        });
        // keep soldCount roughly in sync for delivered orders
        if (status === "DELIVERED") {
          for (const r of itemRows) {
            await prisma.product.update({ where: { id: r.productId }, data: { soldCount: { increment: r.quantity } } });
          }
        }
        void order;
      }
      console.log("✓ demo orders (42)");
    }
  }

  // ── newsletter ──
  if ((await prisma.newsletterSubscriber.count()) === 0) {
    await prisma.newsletterSubscriber.createMany({
      data: [{ email: "subscriber1@gmail.com" }, { email: "fashionfan@yahoo.com" }, { email: "stylist@studio.pk" }],
    });
    console.log("✓ newsletter subscribers");
  }

  console.log("Seed complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
