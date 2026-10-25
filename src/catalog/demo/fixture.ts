// Curated Storefront Catalog — Realistic Mega-Store Fixture. Prices in NPR.

export type DemoCategory = { slug: string; name_en: string; name_ne: string };
// [slug, name_en, price NPR, sale price NPR | null, stock, units sold, days since published, description]
type Row = [string, string, number, number | null, number, number, number, string];

export const DEMO_CATEGORIES: DemoCategory[] = [
  { slug: "groceries-fresh-produce", name_en: "Groceries & Fresh Produce", name_ne: "किराना तथा ताजा तरकारी" },
  { slug: "tech-gadgets", name_en: "Tech & Gadgets", name_ne: "प्रविधि तथा ग्याजेट्स" },
  { slug: "home-electronics", name_en: "Home Electronics", name_ne: "घरायसी इलेक्ट्रोनिक्स" },
  { slug: "mobile-phones-accessories", name_en: "Mobile Phones & Accessories", name_ne: "मोबाइल तथा सामग्रीहरू" },
  { slug: "pharmacy-health", name_en: "Pharmacy & Health", name_ne: "औषधि तथा स्वास्थ्य" },
  { slug: "premium-footwear", name_en: "Premium Footwear", name_ne: "उत्कृष्ट जुत्ता तथा स्नीकर्स" },
  { slug: "apparel-fashion", name_en: "Apparel & Fashion", name_ne: "पोशाक तथा फेसन" },
  { slug: "designer-eyewear", name_en: "Designer Eyewear", name_ne: "डिजाइनर चश्मा तथा सनग्लासेस" },
];

export const DEMO_ROWS: Record<string, Row[]> = {
  "groceries-fresh-produce": [
    ["organic-hass-avocados-pack", "Organic Hass Avocados (Pack of 4)", 650, 590, 45, 340, 2, "Hand-picked ripe Hass avocados known for their rich, buttery texture and wholesome healthy fats. Perfectly conditioned for gourmet salads, toast spreads, and fresh guacamole."],
    ["whole-wheat-artisan-bread", "Whole Wheat Artisan Sourdough Bread", 350, 299, 50, 420, 1, "Naturally fermented stone-ground sourdough baked fresh daily with a crisp golden crust and chewy crumb. Packed with complex grains and wholesome fiber for nutritious everyday meals."],
    ["fresh-atlantic-salmon-fillet", "Fresh Atlantic Salmon Fillet (500g)", 1850, 1699, 25, 195, 3, "Sustainably farmed premium Atlantic salmon cut into boneless skin-on center fillets rich in Omega-3. Flakes tenderly upon pan searing or gentle grilling for a gourmet dining experience."],
    ["organic-medjool-dates-box", "Organic Medjool Dates (500g)", 890, 780, 40, 260, 4, "Plump and succulent jumbo Medjool dates naturally sun-ripened with a soft caramel finish. An energizing natural sweetener loaded with potassium and essential dietary minerals."],
    ["extra-virgin-olive-oil-1l", "Cold-Pressed Extra Virgin Olive Oil (1L)", 1450, 1290, 35, 310, 5, "First cold-extracted single-estate olive oil bearing a fragrant peppery aroma and low acidity. Ideal for dressing fresh garden greens, drizzling pasta, and healthy Mediterranean cooking."],
  ],
  "tech-gadgets": [
    ["apple-macbook-pro-14-m3", "Apple MacBook Pro 14\" M3 Pro", 295000, 284900, 12, 45, 2, "Supercharged by the M3 Pro chip featuring a breathtaking 120Hz Liquid Retina XDR display and 18-hour battery. The definitive workstation laptop for demanding creative professionals and engineers."],
    ["logitech-mx-master-3s-mouse", "Logitech MX Master 3S Wireless Mouse", 14500, 12999, 30, 210, 3, "Engineered with ultra-quiet clicks and an 8K DPI track-on-glass sensor for peerless desktop precision. Electromagnetic MagSpeed scrolling zips through thousands of lines of spreadsheets effortlessly."],
    ["keychron-k2-mechanical-keyboard", "Keychron K2 Mechanical Keyboard (RGB Hot-Swap)", 11500, 9999, 28, 175, 4, "Compact 75% wireless mechanical keyboard fitted with hot-swappable Gateron G Pro mechanical switches. Pairs seamlessly with Mac and Windows devices over high-speed Bluetooth 5.1."],
    ["bose-quietcomfort-ultra-headphones", "Bose QuietComfort Ultra Headphones", 52000, 46900, 18, 88, 5, "World-class active noise cancellation with breakthrough spatial audio that places sound naturally in front of you. CustomTune technology personalizes acoustic output directly to the shape of your ears."],
    ["anker-prime-20000mah-power-bank", "Anker Prime 20,000mAh 200W Power Bank", 18500, 15999, 35, 140, 6, "Massive 200W total output capable of fast charging two high-power laptops and a phone simultaneously. Integrated digital smart display gives real-time wattage, battery capacity, and recharge estimates."],
  ],
  "home-electronics": [
    ["sony-65-bravia-xr-oled-tv", "Sony 65\" 4K OLED Bravia XR TV", 345000, 319900, 8, 32, 2, "Breathtaking OLED contrast driven by Cognitive Processor XR creates pure inky blacks and lifelike peak brightness. Acoustic Surface Audio+ turns the entire screen into an immersive multi-channel speaker."],
    ["dyson-v15-detect-vacuum", "Dyson V15 Detect Cordless Vacuum", 98000, 89900, 14, 64, 4, "Illuminating laser reveal technology exposes microscopic dust invisible to the naked human eye on hard floors. Piezo sensor continuously sizes and counts debris to intelligently boost suction on demand."],
    ["philips-airfryer-xxl-smart", "Philips Airfryer XXL Smart Sensing", 34000, 29500, 22, 115, 3, "Smart sensing technology automatically adjusts cooking time and temperature for impeccably crisp results. Twin TurboStar technology extracts excess fat so you enjoy indulgent fried favorites guilt-free."],
    ["delonghi-magnifica-s-espresso", "De'Longhi Magnifica S Espresso Machine", 78000, 69900, 10, 52, 5, "Compact bean-to-cup espresso system equipped with a 15-bar professional pump and integrated conical burr grinder. Manual milk frothing wand crafts velvety microfoam for authentic cappuccinos and lattes."],
    ["marshall-stanmore-iii-speaker", "Marshall Stanmore III Bluetooth Home Speaker", 46000, 41500, 16, 78, 6, "Iconic vintage brass and vinyl aesthetic delivering an expansive Marshall signature soundstage that fills any room. Outward-angled tweeters and updated waveguides present deeply immersive, heavy bass response."],
  ],
  "mobile-phones-accessories": [
    ["samsung-galaxy-s24-ultra", "Samsung Galaxy S24 Ultra (512GB Titanium Black)", 199999, 189999, 15, 92, 1, "Groundbreaking Galaxy AI phone built with a satin titanium frame and crystal-clear flat 6.8-inch Dynamic AMOLED display. Quad Tele 200MP camera setup captures cinema-grade detail in any lighting condition."],
    ["apple-iphone-15-pro-max", "Apple iPhone 15 Pro Max (256GB Natural Titanium)", 214900, 204900, 18, 110, 2, "Aerospace-grade titanium design housing the cutting-edge 3nm A17 Pro GPU chip and customizable Action Button. 5x telephoto optical zoom lens captures astonishing close-up portraits from extraordinary distances."],
    ["anker-20w-fast-charger", "Anker 20W USB-C Nano Fast Charger", 2450, 1999, 80, 540, 2, "Ultra-compact miniature wall adapter engineered to charge modern flagship smartphones up to three times faster. Dynamic temperature sensor safety system prevents overheating during rapid charging cycles."],
    ["apple-airpods-pro-2-usbc", "Apple AirPods Pro (2nd Generation USB-C)", 36500, 32900, 25, 160, 3, "Next-generation H2 chip drives twice as much active noise cancellation with personalized spatial audio tracking. MagSafe charging case features an onboard speaker and lanyard loop for precision Find My locating."],
    ["spigen-ultra-hybrid-magfit-case", "Spigen Ultra Hybrid MagFit Protective Case", 3200, 2699, 45, 230, 4, "Crystal-clear polycarbonate backplate backed by shock-absorbing TPU bumper cushions equipped with Air Cushion technology. Integrated magnetic ring aligns perfectly with all MagSafe wireless charging pucks."],
  ],
  "pharmacy-health": [
    ["optimum-nutrition-gold-standard-whey", "Optimum Nutrition Gold Standard 100% Whey (5 lbs)", 12500, 10999, 35, 280, 2, "The world's most trusted post-workout protein delivering 24g of pure whey protein isolates and 5.5g BCAAs per scoop. Instantized powder mixes effortlessly in cold water or milk for rapid muscle recovery."],
    ["omron-blood-pressure-monitor", "Omron Complete Blood Pressure & EKG Monitor", 8900, 7800, 20, 120, 4, "Clinically validated upper arm blood pressure monitor featuring simultaneous single-lead ECG recording capability. Syncs readings instantly to your smartphone over Bluetooth for convenient health tracking."],
    ["daily-multivitamin-gummies", "Daily Multivitamin & Mineral Gummies (90 Count)", 2200, 1850, 60, 390, 3, "Delicious berry-flavored dietary gummies loaded with Vitamin C, D3, Zinc, and B-complex for immune vitality. Crafted without artificial corn syrups, gelatin, or synthetic coloring agents."],
    ["theragun-relief-percussive-massage", "Theragun Relief Percussive Massage Gun", 24000, 20900, 18, 75, 5, "Comfortable ergonomic massage gun engineered to melt away muscle knots and alleviate everyday body stiffness. Whisper-quiet motor delivers 10mm percussive depth across three scientifically calibrated speed settings."],
    ["nordic-naturals-ultimate-omega", "Nordic Naturals Ultimate Omega Fish Oil (1280mg)", 4800, 4200, 40, 210, 6, "High-potency wild deep-sea fish oil providing concentrated EPA and DHA in triglyceride molecular form. Certified pure by third-party testing with a fresh natural lemon flavor and no fishy aftertaste."],
  ],
  "premium-footwear": [
    ["nike-air-force-1-07", "Nike Air Force 1 '07 Triple White", 14500, null, 40, 310, 1, "Crisp white leather overlays stitched to perfection atop encapsulated full-length Nike Air cushioning. The enduring street style icon celebrated worldwide for timeless versatility and all-day comfort."],
    ["adidas-ultraboost-10-shoes", "Adidas Ultraboost 1.0 Running Shoes", 21500, 18999, 25, 180, 3, "Form-fitting Primeknit upper hugs the foot dynamically while legendary Boost midsole energy return cushions every stride. Continental Natural Rubber outsole maintains unshakeable traction in wet and dry conditions."],
    ["timberland-premium-6-inch-boots", "Timberland Premium 6-Inch Waterproof Boots", 26000, 22900, 20, 115, 5, "Iconic wheat nubuck leather boots sealed with seam-shield waterproof construction and 400g PrimaLoft insulation. Padded leather collar and anti-fatigue footbeds keep feet comfortable on city pavements or mountain trails."],
    ["new-balance-990v6-grey", "New Balance 990v6 Made in USA", 28000, 24900, 18, 95, 4, "Crafted in the United States with premium pigskin suede overlays and breathable mesh underlays. FuelCell foam cushioning works in tandem with ENCAP midsole rims to support stable, continuous daily movement."],
    ["dr-martens-1460-smooth-boot", "Dr. Martens 1460 Smooth Leather Boot", 22500, 19900, 22, 130, 6, "The original 8-eye heritage boot recognizable by its yellow welt stitching, grooved edges, and air-cushioned sole. Sturdy smooth leather polishes to a high shine or wears naturally for authentic character."],
  ],
  "apparel-fashion": [
    ["levis-501-original-fit-jeans", "Levi's 501 Original Fit Denim Jeans", 7800, 6499, 45, 290, 2, "The archetypal straight-leg blue jean tailored with authentic non-stretch cotton and iconic copper button fly. Classic five-pocket construction anchored by the trademark red tab on the back pocket."],
    ["north-face-retro-nuptse-jacket", "The North Face 1996 Retro Nuptse Jacket", 38000, 33500, 15, 84, 3, "Ultra-warm boxy silhouette insulated with 700-fill certified goose down encased in durable water-repellent ripstop. Packs down compactly into its own right-hand pocket for effortless travel packing."],
    ["uniqlo-supima-cotton-tshirt", "Uniqlo Supima Cotton Crew Neck T-Shirt (3-Pack)", 3600, 2999, 50, 340, 2, "Spun from 100% extra-long staple Supima cotton renowned for silky texture, breathability, and deep color retention. Clean minimal seams pair elegantly under open dress shirts or worn solo with chinos."],
    ["patagonia-better-sweater-fleece", "Patagonia Better Sweater Fleece Jacket", 18500, 16200, 24, 110, 4, "Warm sweater-knit aesthetic on the exterior with plush moisture-wicking fleece interior made from recycled polyester. Raglan sleeve patterning allows unhindered arm movement beneath heavy hiking backpacks."],
    ["ralph-lauren-classic-oxford-shirt", "Ralph Lauren Classic Fit Oxford Shirt", 14000, 11900, 30, 165, 5, "Garment-washed pinpoint cotton oxford woven with a relaxed button-down collar and signature embroidered pony. Tailored for comfortable draping that transitions smoothly from boardroom presentations to weekend dinners."],
  ],
  "designer-eyewear": [
    ["ray-ban-aviator-classic", "Ray-Ban Aviator Classic Gold & Green", 18500, 16200, 30, 240, 2, "Originally designed in 1937 for US aviators, featuring a teardrop metal frame with legendary G-15 crystal green lenses. Delivers 100% UV protection and exceptional visual clarity with minimal color distortion."],
    ["oakley-holbrook-polarized", "Oakley Holbrook Polarized Sunglasses", 19500, 17400, 25, 170, 3, "Timeless American frame design accented with metal rivets and lightweight, stress-resistant O Matter material. Prizm polarized lenses maximize contrast and enhance visibility on sunny streets and open water."],
    ["tom-ford-blue-block-glasses", "Tom Ford Blue-Block Square Optical Glasses", 42000, 36900, 16, 75, 4, "Handcrafted Italian acetate frames distinguished by the signature rose-gold T-logo temples. Fitted with blue-light filtering lenses to prevent ocular fatigue during extended digital screen sessions."],
    ["persol-714-folding-sunglasses", "Persol 714 Folding Havana Sunglasses", 34000, 29900, 14, 62, 5, "The celebrated folding sunglasses famously worn by Steve McQueen, handmade in Italy with flexible Meflecto stem stems. Crystal glare-reducing lenses fold in half at the bridge for effortless pocket carrying."],
    ["gucci-oversized-square-sunglasses", "Gucci Oversized Square Tinted Sunglasses", 48000, 41900, 12, 48, 6, "Dramatic 70s-inspired square acetate sunglasses emblazoned with interlocking gold-tone GG monogram emblems. Gradient amber lenses add a commanding touch of vintage glamour to any high-fashion ensemble."],
  ],
};
