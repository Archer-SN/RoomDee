import { db } from "./index";
import { amenities, amenityTranslations } from "./schema";

const SEED_AMENITIES = [
  { slug: "wifi", icon: "wifi", en: "Wi-Fi", th: "ไวไฟ" },
  { slug: "pool", icon: "waves", en: "Swimming Pool", th: "สระว่ายน้ำ" },
  { slug: "parking", icon: "car", en: "Parking", th: "ที่จอดรถ" },
  { slug: "kitchen", icon: "utensils", en: "Kitchen", th: "ห้องครัว" },
  { slug: "air_conditioning", icon: "snowflake", en: "Air Conditioning", th: "แอร์" },
  { slug: "washing_machine", icon: "shirt", en: "Washing Machine", th: "เครื่องซักผ้า" },
  { slug: "gym", icon: "dumbbell", en: "Gym", th: "ฟิตเนส" },
  { slug: "breakfast", icon: "coffee", en: "Breakfast Included", th: "รวมอาหารเช้า" },
  { slug: "pet_friendly", icon: "paw-print", en: "Pet Friendly", th: "สัตว์เลี้ยงเข้าได้" },
  { slug: "elevator", icon: "arrow-up-down", en: "Elevator", th: "ลิฟต์" },
  { slug: "balcony", icon: "sun", en: "Balcony", th: "ระเบียง" },
  { slug: "tv", icon: "tv", en: "TV", th: "โทรทัศน์" },
];

async function seed() {
  console.log("Seeding amenities...");

  for (const item of SEED_AMENITIES) {
    const [amenity] = await db
      .insert(amenities)
      .values({ slug: item.slug, icon: item.icon })
      .onConflictDoNothing()
      .returning();

    if (amenity) {
      await db.insert(amenityTranslations).values([
        { amenityId: amenity.id, locale: "en", name: item.en },
        { amenityId: amenity.id, locale: "th", name: item.th },
      ]).onConflictDoNothing();
    }
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
