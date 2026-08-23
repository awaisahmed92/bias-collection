import prisma from "@/lib/db";

export const DEFAULT_SETTINGS: Record<string, string> = {
  storeName: "Bias Collection",
  storeEmail: "hello@biascollection.pk",
  storePhone: "+92 300 0000000",
  storeAddress: "Clifton, Karachi, Pakistan",
  currency: "Rs.",
  taxRatePercent: "0",
  announcement: "Free shipping on orders above Rs. 5,000",
  facebookUrl: "https://facebook.com/biascollection",
  instagramUrl: "https://instagram.com/biascollection",
  twitterUrl: "",
  whatsappNumber: "+92 300 0000000",
  orderPrefix: "BC",
  lowStockDefaultThreshold: "5",
};

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? DEFAULT_SETTINGS[key] ?? fallback;
}

export async function getSettingNumber(key: string, fallback = 0): Promise<number> {
  const v = await getSetting(key, String(fallback));
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  rows.forEach((r) => (map[r.key] = r.value));
  return map;
}

export async function updateSettings(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
