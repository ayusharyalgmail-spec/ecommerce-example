// DEMO CATALOG — development fixture only. Prices are illustrative, not verified market prices; stock, sales and
// ratings are invented for layout testing. Loaded only in `vite dev` with the demo switch on (see ../demoMode.ts);
// production builds never include this module, and nothing here is ever written to the database.
//
// To replace it with real inventory, add products in Admin → Products; this file is not read by anything else.

export type DemoCategory = { slug: string; name_en: string; name_ne: string };
// [slug, name_en, price NPR, sale price NPR | null, stock, units sold, days since published, description]
type Row = [string, string, number, number | null, number, number, number, string];

export const DEMO_CATEGORIES: DemoCategory[] = [
  { slug: "groceries", name_en: "Groceries", name_ne: "किराना" },
  { slug: "snacks", name_en: "Snacks", name_ne: "खाजा" },
  { slug: "beverages", name_en: "Beverages", name_ne: "पेय पदार्थ" },
  { slug: "household", name_en: "Household essentials", name_ne: "घरायसी सामान" },
  { slug: "personal-care", name_en: "Personal care", name_ne: "व्यक्तिगत हेरचाह" },
  { slug: "stationery", name_en: "Stationery", name_ne: "स्टेसनरी" },
  { slug: "books", name_en: "Books", name_ne: "किताब" },
  { slug: "electronics", name_en: "Electronics and accessories", name_ne: "इलेक्ट्रोनिक्स" },
  { slug: "kitchen", name_en: "Kitchen essentials", name_ne: "भान्साका सामान" },
  { slug: "home-lifestyle", name_en: "Home and lifestyle", name_ne: "घर र जीवनशैली" },
];

export const DEMO_ROWS: Record<string, Row[]> = {
  groceries: [
    ["basmati-rice-5kg", "Basmati Rice, 5 kg", 850, 799, 40, 120, 30, "Long-grain aged basmati that cooks up fluffy and fragrant."],
    ["sunflower-oil-1l", "Sunflower Oil, 1 L", 280, null, 60, 210, 45, "Light refined sunflower oil for everyday cooking and frying."],
    ["wheat-flour-2kg", "Wheat Flour (Atta), 2 kg", 160, null, 35, 95, 20, "Whole-wheat chakki atta for soft rotis."],
    ["sugar-1kg", "Sugar, 1 kg", 110, null, 80, 150, 60, "Fine white crystal sugar."],
    ["red-lentils-1kg", "Red Lentils (Masoor Dal), 1 kg", 180, null, 25, 70, 12, "Cleaned split red lentils that cook quickly."],
    ["potatoes-1kg", "Potatoes, 1 kg", 70, null, 6, 300, 2, "Fresh local potatoes, sold by the kilo."],
    ["onions-1kg", "Onions, 1 kg", 90, null, 0, 260, 3, "Red onions, sold by the kilo."],
    ["instant-noodles", "Instant Noodles, single pack", 25, null, 200, 540, 50, "Quick masala noodles, ready in two minutes."],
    ["chiura-1kg", "Beaten Rice (Chiura), 1 kg", 150, 135, 18, 40, 6, "Thick-cut chiura for snacks and festivals."],
  ],
  snacks: [
    ["potato-chips-family", "Potato Chips, family pack", 100, null, 45, 180, 15, "Salted crisps in a resealable family pack."],
    ["chocolate-bar", "Milk Chocolate Bar", 80, null, 70, 230, 25, "Smooth milk chocolate, 40 g."],
    ["cream-biscuits", "Cream Biscuits", 40, null, 90, 310, 40, "Vanilla cream sandwich biscuits."],
    ["chewing-gum", "Chewing Gum", 10, null, 150, 400, 70, "Mint chewing gum, pack of five."],
    ["butter-cookies", "Butter Cookies, pack", 120, 99, 4, 60, 8, "Crisp butter cookies baked with real butter."],
    ["roasted-peanuts", "Roasted Peanuts, 200 g", 90, null, 30, 55, 10, "Lightly salted roasted peanuts."],
  ],
  beverages: [
    ["bottled-water-1l", "Bottled Water, 1 L", 30, null, 120, 500, 35, "Purified drinking water."],
    ["orange-juice-1l", "Orange Juice, 1 L", 180, 160, 22, 85, 9, "No-added-sugar orange juice."],
    ["milk-1l", "Fresh Milk, 1 L", 100, null, 15, 380, 1, "Pasteurised full-cream milk. Keep refrigerated."],
    ["soft-drink-500ml", "Soft Drink, 500 ml", 60, null, 75, 260, 22, "Chilled cola in a 500 ml bottle."],
    ["instant-coffee", "Instant Coffee, 50 g", 250, null, 3, 45, 18, "Rich instant coffee granules."],
    ["black-tea-500g", "Black Tea Leaves, 500 g", 320, null, 28, 75, 28, "Strong CTC tea from eastern Nepal."],
  ],
  household: [
    ["laundry-detergent-1l", "Laundry Detergent, 1 L", 280, 250, 26, 90, 14, "Liquid detergent for machine and hand wash."],
    ["dishwashing-liquid", "Dishwashing Liquid, 500 ml", 150, null, 33, 110, 33, "Lemon dishwashing liquid that cuts grease."],
    ["bathing-soap-100g", "Bathing Soap, 100 g", 65, null, 140, 280, 44, "Mild everyday bathing soap."],
    ["toilet-tissue-pack", "Toilet Tissue, 4 rolls", 120, null, 0, 160, 21, "Soft two-ply toilet tissue."],
    ["cleaning-cloth", "Microfibre Cleaning Cloth", 80, null, 40, 50, 11, "Reusable microfibre cloth for kitchen and glass."],
    ["garbage-bags", "Garbage Bags, 30 pcs", 100, null, 55, 70, 16, "Medium garbage bags with tie handles."],
  ],
  "personal-care": [
    ["shampoo-180ml", "Shampoo, 180 ml", 220, null, 24, 95, 19, "Gentle shampoo for daily use."],
    ["toothpaste", "Toothpaste, 150 g", 120, null, 60, 200, 27, "Fluoride toothpaste with fresh mint."],
    ["toothbrush", "Toothbrush, soft", 60, null, 85, 140, 38, "Soft-bristle toothbrush."],
    ["handwash", "Handwash, 250 ml", 140, 125, 7, 65, 5, "Antibacterial liquid handwash."],
    ["body-lotion", "Body Lotion, 200 ml", 250, null, 19, 40, 13, "Non-greasy moisturising lotion for dry skin."],
  ],
  stationery: [
    ["notebook-200", "Notebook, 200 pages", 120, null, 50, 130, 26, "Ruled A5 notebook with a sturdy cover."],
    ["ballpoint-pen", "Ballpoint Pen, blue", 20, null, 300, 600, 55, "Smooth-writing blue ballpoint."],
    ["pencil-pack", "Pencil Pack, 10 pcs", 50, null, 75, 120, 41, "HB pencils with erasers."],
    ["drawing-book", "Drawing Book, A4", 100, null, 2, 35, 7, "Thick cartridge paper drawing book."],
  ],
  books: [
    ["sample-novel", "Sample Book: A Nepali Novel", 1299, 1099, 8, 25, 4, "A placeholder title for showing how books look in the shop."],
    ["kids-story-book", "Children's Story Book", 450, null, 12, 30, 17, "Illustrated bedtime stories for ages 4 to 8."],
    ["cookbook-nepali", "Everyday Nepali Cookbook", 850, null, 5, 18, 32, "Simple recipes for dal, bhat and tarkari."],
  ],
  electronics: [
    ["usb-cable", "USB-C Cable, 1 m", 250, null, 45, 110, 23, "Braided USB-C charging and data cable."],
    ["phone-charger", "Phone Charger, 20 W", 650, 590, 14, 60, 10, "Fast USB-C wall charger."],
    ["earphones", "Wired Earphones", 450, null, 0, 70, 29, "In-ear earphones with microphone."],
    ["phone-stand", "Phone Stand", 300, null, 26, 35, 36, "Adjustable aluminium desk stand."],
    ["mouse-pad", "Mouse Pad", 200, null, 33, 20, 48, "Non-slip cloth mouse pad."],
  ],
  kitchen: [
    ["storage-container", "Storage Container, 1 L", 180, null, 40, 55, 24, "Airtight food storage container."],
    ["lunch-box", "Lunch Box, 2 compartments", 350, 299, 16, 48, 6, "Leak-proof steel lunch box."],
    ["kitchen-towel", "Kitchen Towel, 2 pcs", 120, null, 38, 42, 31, "Absorbent cotton kitchen towels."],
    ["pressure-cooker-3l", "Pressure Cooker, 3 L", 2450, null, 6, 15, 39, "Aluminium pressure cooker with safety valve."],
  ],
  "home-lifestyle": [
    ["water-bottle", "Water Bottle, 750 ml", 250, null, 29, 66, 13, "Reusable BPA-free bottle."],
    ["shopping-bag", "Reusable Shopping Bag", 100, null, 64, 90, 52, "Foldable cloth bag for your shopping."],
    ["led-bulb-9w", "LED Bulb, 9 W", 180, 160, 50, 140, 15, "Warm white LED bulb, B22 base."],
    ["incense-sticks", "Incense Sticks", 60, null, 3, 75, 9, "Sandalwood incense, 20 sticks."],
  ],
};
