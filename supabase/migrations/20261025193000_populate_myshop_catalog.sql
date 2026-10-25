-- Migration: 20261025193000_populate_myshop_catalog.sql
-- Populate "myshop" tenant with a realistic mega-store catalog: 8 categories and 40 products with Unsplash imagery

do $$
declare
  v_tid uuid;
  v_cat_id uuid;
  v_pid uuid;
begin
  select id into v_tid from public.tenants where slug = 'myshop';
  if v_tid is null then return; end if;

  -- 1. Update brand_config with high-resolution supermarket hero image
  update public.tenants
  set
    brand_config = jsonb_build_object(
      'hero_image', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=2000',
      'hero_image_url', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=2000'
    ),
    cover_path = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=2000',
    tagline = 'Your premier mega-store for groceries, tech, fashion & essentials.',
    business_type = 'Mega Store & Supermarket'
  where id = v_tid;

  -- 2. Clear old demo/generic categories if not linked to existing orders
  delete from public.product_images
  where product_id in (
    select id from public.products
    where tenant_id = v_tid and slug not in (
      'organic-hass-avocados-pack', 'whole-wheat-artisan-bread', 'fresh-atlantic-salmon-fillet', 'organic-medjool-dates-box', 'extra-virgin-olive-oil-1l',
      'apple-macbook-pro-14-m3', 'logitech-mx-master-3s-mouse', 'keychron-k2-mechanical-keyboard', 'bose-quietcomfort-ultra-headphones', 'anker-prime-20000mah-power-bank',
      'sony-65-bravia-xr-oled-tv', 'dyson-v15-detect-vacuum', 'philips-airfryer-xxl-smart', 'delonghi-magnifica-s-espresso', 'marshall-stanmore-iii-speaker',
      'samsung-galaxy-s24-ultra', 'apple-iphone-15-pro-max', 'anker-20w-fast-charger', 'apple-airpods-pro-2-usbc', 'spigen-ultra-hybrid-magfit-case',
      'optimum-nutrition-gold-standard-whey', 'omron-blood-pressure-monitor', 'daily-multivitamin-gummies', 'theragun-relief-percussive-massage', 'nordic-naturals-ultimate-omega',
      'nike-air-force-1-07', 'adidas-ultraboost-10-shoes', 'timberland-premium-6-inch-boots', 'new-balance-990v6-grey', 'dr-martens-1460-smooth-boot',
      'levis-501-original-fit-jeans', 'north-face-retro-nuptse-jacket', 'uniqlo-supima-cotton-tshirt', 'patagonia-better-sweater-fleece', 'ralph-lauren-classic-oxford-shirt',
      'ray-ban-aviator-classic', 'oakley-holbrook-polarized', 'tom-ford-blue-block-glasses', 'persol-714-folding-sunglasses', 'gucci-oversized-square-sunglasses'
    )
    and id not in (select product_id from public.order_items)
  );

  delete from public.products
  where tenant_id = v_tid and slug not in (
    'organic-hass-avocados-pack', 'whole-wheat-artisan-bread', 'fresh-atlantic-salmon-fillet', 'organic-medjool-dates-box', 'extra-virgin-olive-oil-1l',
    'apple-macbook-pro-14-m3', 'logitech-mx-master-3s-mouse', 'keychron-k2-mechanical-keyboard', 'bose-quietcomfort-ultra-headphones', 'anker-prime-20000mah-power-bank',
    'sony-65-bravia-xr-oled-tv', 'dyson-v15-detect-vacuum', 'philips-airfryer-xxl-smart', 'delonghi-magnifica-s-espresso', 'marshall-stanmore-iii-speaker',
    'samsung-galaxy-s24-ultra', 'apple-iphone-15-pro-max', 'anker-20w-fast-charger', 'apple-airpods-pro-2-usbc', 'spigen-ultra-hybrid-magfit-case',
    'optimum-nutrition-gold-standard-whey', 'omron-blood-pressure-monitor', 'daily-multivitamin-gummies', 'theragun-relief-percussive-massage', 'nordic-naturals-ultimate-omega',
    'nike-air-force-1-07', 'adidas-ultraboost-10-shoes', 'timberland-premium-6-inch-boots', 'new-balance-990v6-grey', 'dr-martens-1460-smooth-boot',
    'levis-501-original-fit-jeans', 'north-face-retro-nuptse-jacket', 'uniqlo-supima-cotton-tshirt', 'patagonia-better-sweater-fleece', 'ralph-lauren-classic-oxford-shirt',
    'ray-ban-aviator-classic', 'oakley-holbrook-polarized', 'tom-ford-blue-block-glasses', 'persol-714-folding-sunglasses', 'gucci-oversized-square-sunglasses'
  )
  and id not in (select product_id from public.order_items);

  delete from public.categories
  where tenant_id = v_tid and slug not in (
    'groceries-fresh-produce', 'tech-gadgets', 'home-electronics', 'mobile-phones-accessories',
    'pharmacy-health', 'premium-footwear', 'apparel-fashion', 'designer-eyewear'
  )
  and id not in (select category_id from public.products where category_id is not null);

  -- 3. Upsert the 8 exact categories
  insert into public.categories (tenant_id, slug, name_en, name_ne, sort_order, is_active)
  values
    (v_tid, 'groceries-fresh-produce', 'Groceries & Fresh Produce', 'किराना तथा ताजा तरकारी', 1, true),
    (v_tid, 'tech-gadgets', 'Tech & Gadgets', 'प्रविधि तथा ग्याजेट्स', 2, true),
    (v_tid, 'home-electronics', 'Home Electronics', 'घरायसी इलेक्ट्रोनिक्स', 3, true),
    (v_tid, 'mobile-phones-accessories', 'Mobile Phones & Accessories', 'मोबाइल तथा सामग्रीहरू', 4, true),
    (v_tid, 'pharmacy-health', 'Pharmacy & Health', 'औषधि तथा स्वास्थ्य', 5, true),
    (v_tid, 'premium-footwear', 'Premium Footwear', 'उत्कृष्ट जुत्ता तथा स्नीकर्स', 6, true),
    (v_tid, 'apparel-fashion', 'Apparel & Fashion', 'पोशाक तथा फेसन', 7, true),
    (v_tid, 'designer-eyewear', 'Designer Eyewear', 'डिजाइनर चश्मा तथा सनग्लासेस', 8, true)
  on conflict (tenant_id, slug) do update set
    name_en = excluded.name_en,
    name_ne = excluded.name_ne,
    sort_order = excluded.sort_order,
    is_active = true;

end $$;

-- 4. Temporary table to batch upsert all 40 products and their primary images
create temp table temp_myshop_products (
  cat_slug text,
  slug text,
  sku text,
  name_en text,
  name_ne text,
  description_en text,
  price_paisa bigint,
  discount_price_paisa bigint,
  stock_quantity int,
  units_sold int,
  image_url text
) on commit drop;

insert into temp_myshop_products values
  -- Groceries & Fresh Produce
  ('groceries-fresh-produce', 'organic-hass-avocados-pack', 'GROC-AVO-001', 'Organic Hass Avocados (Pack of 4)', 'अर्गानिक हास एभोकाडो (४ वटा)', 'Hand-picked ripe Hass avocados known for their rich, buttery texture and wholesome healthy fats. Perfectly conditioned for gourmet salads, toast spreads, and fresh guacamole.', 65000, 59000, 45, 340, 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=1000'),
  ('groceries-fresh-produce', 'whole-wheat-artisan-bread', 'GROC-BRD-002', 'Whole Wheat Artisan Sourdough Bread', 'होल ह्वीट आर्टिसन सावरडो पाउरोटी', 'Naturally fermented stone-ground sourdough baked fresh daily with a crisp golden crust and chewy crumb. Packed with complex grains and wholesome fiber for nutritious everyday meals.', 35000, 29900, 50, 420, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000'),
  ('groceries-fresh-produce', 'fresh-atlantic-salmon-fillet', 'GROC-SAL-003', 'Fresh Atlantic Salmon Fillet (500g)', 'ताजा एटलान्टिक सामन माछा (५०० ग्राम)', 'Sustainably farmed premium Atlantic salmon cut into boneless skin-on center fillets rich in Omega-3. Flakes tenderly upon pan searing or gentle grilling for a gourmet dining experience.', 185000, 169900, 25, 195, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=1000'),
  ('groceries-fresh-produce', 'organic-medjool-dates-box', 'GROC-DAT-004', 'Organic Medjool Dates (500g)', 'अर्गानिक मेडजूल खजुर (५०० ग्राम)', 'Plump and succulent jumbo Medjool dates naturally sun-ripened with a soft caramel finish. An energizing natural sweetener loaded with potassium and essential dietary minerals.', 89000, 78000, 40, 260, 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=1000'),
  ('groceries-fresh-produce', 'extra-virgin-olive-oil-1l', 'GROC-OIL-005', 'Cold-Pressed Extra Virgin Olive Oil (1L)', 'एक्स्ट्रा भर्जिन जैतुनको तेल (१ लिटर)', 'First cold-extracted single-estate olive oil bearing a fragrant peppery aroma and low acidity. Ideal for dressing fresh garden greens, drizzling pasta, and healthy Mediterranean cooking.', 145000, 129000, 35, 310, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=1000'),

  -- Tech & Gadgets
  ('tech-gadgets', 'apple-macbook-pro-14-m3', 'TECH-MBP-001', 'Apple MacBook Pro 14" M3 Pro', 'एप्पल म्याकबुक प्रो १४ इन्च', 'Supercharged by the M3 Pro chip featuring a breathtaking 120Hz Liquid Retina XDR display and 18-hour battery. The definitive workstation laptop for demanding creative professionals and engineers.', 29500000, 28490000, 12, 45, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000'),
  ('tech-gadgets', 'logitech-mx-master-3s-mouse', 'TECH-LOG-002', 'Logitech MX Master 3S Wireless Mouse', 'लजिटेक एमएक्स मास्टर ३एस वायरलेस माउस', 'Engineered with ultra-quiet clicks and an 8K DPI track-on-glass sensor for peerless desktop precision. Electromagnetic MagSpeed scrolling zips through thousands of lines of spreadsheets effortlessly.', 1450000, 1299900, 30, 210, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=1000'),
  ('tech-gadgets', 'keychron-k2-mechanical-keyboard', 'TECH-KEY-003', 'Keychron K2 Mechanical Keyboard (RGB Hot-Swap)', 'किक्रोन के२ मेकानिकल किबोर्ड', 'Compact 75% wireless mechanical keyboard fitted with hot-swappable Gateron G Pro mechanical switches. Pairs seamlessly with Mac and Windows devices over high-speed Bluetooth 5.1.', 1150000, 999900, 28, 175, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=1000'),
  ('tech-gadgets', 'bose-quietcomfort-ultra-headphones', 'TECH-BOS-004', 'Bose QuietComfort Ultra Headphones', 'बोस क्वाइट कम्फर्ट अल्ट्रा हेडफोन', 'World-class active noise cancellation with breakthrough spatial audio that places sound naturally in front of you. CustomTune technology personalizes acoustic output directly to the shape of your ears.', 5200000, 4690000, 18, 88, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000'),
  ('tech-gadgets', 'anker-prime-20000mah-power-bank', 'TECH-ANK-005', 'Anker Prime 20,000mAh 200W Power Bank', 'एङ्कर प्राइम २०००० एमएएच पावर बैंक', 'Massive 200W total output capable of fast charging two high-power laptops and a phone simultaneously. Integrated digital smart display gives real-time wattage, battery capacity, and recharge estimates.', 1850000, 1599900, 35, 140, 'https://images.unsplash.com/photo-1609592806024-5e58129528f8?q=80&w=1000'),

  -- Home Electronics
  ('home-electronics', 'sony-65-bravia-xr-oled-tv', 'ELEC-SNY-001', 'Sony 65" 4K OLED Bravia XR TV', 'सोनी ६५ इन्च फोरके ओलेड टिभी', 'Breathtaking OLED contrast driven by Cognitive Processor XR creates pure inky blacks and lifelike peak brightness. Acoustic Surface Audio+ turns the entire screen into an immersive multi-channel speaker.', 34500000, 31990000, 8, 32, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=1000'),
  ('home-electronics', 'dyson-v15-detect-vacuum', 'ELEC-DYS-002', 'Dyson V15 Detect Cordless Vacuum', 'डाइसन भि१५ डिटेक्ट भ्याकुम', 'Illuminating laser reveal technology exposes microscopic dust invisible to the naked human eye on hard floors. Piezo sensor continuously sizes and counts debris to intelligently boost suction on demand.', 9800000, 8990000, 14, 64, 'https://images.unsplash.com/photo-1558317374-067fb5f30001?q=80&w=1000'),
  ('home-electronics', 'philips-airfryer-xxl-smart', 'ELEC-PHI-003', 'Philips Airfryer XXL Smart Sensing', 'फिलिप्स एयरफ्रायर एक्सएक्सएल स्मार्ट', 'Smart sensing technology automatically adjusts cooking time and temperature for impeccably crisp results. Twin TurboStar technology extracts excess fat so you enjoy indulgent fried favorites guilt-free.', 3400000, 2950000, 22, 115, 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=1000'),
  ('home-electronics', 'delonghi-magnifica-s-espresso', 'ELEC-DEL-004', 'De''Longhi Magnifica S Espresso Machine', 'डिलङ्गी म्याग्निफिका एस एस्प्रेसो मेसिन', 'Compact bean-to-cup espresso system equipped with a 15-bar professional pump and integrated conical burr grinder. Manual milk frothing wand crafts velvety microfoam for authentic cappuccinos and lattes.', 7800000, 6990000, 10, 52, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1000'),
  ('home-electronics', 'marshall-stanmore-iii-speaker', 'ELEC-MSH-005', 'Marshall Stanmore III Bluetooth Home Speaker', 'मार्शल स्ट्यानमोर ३ ब्लुटुथ स्पिकर', 'Iconic vintage brass and vinyl aesthetic delivering an expansive Marshall signature soundstage that fills any room. Outward-angled tweeters and updated waveguides present deeply immersive, heavy bass response.', 4600000, 4150000, 16, 78, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=1000'),

  -- Mobile Phones & Accessories
  ('mobile-phones-accessories', 'samsung-galaxy-s24-ultra', 'MOBL-S24-001', 'Samsung Galaxy S24 Ultra (512GB Titanium Black)', 'सैमसंग ग्यालेक्सी एस२४ अल्ट्रा', 'Groundbreaking Galaxy AI phone built with a satin titanium frame and crystal-clear flat 6.8-inch Dynamic AMOLED display. Quad Tele 200MP camera setup captures cinema-grade detail in any lighting condition.', 19999900, 18999900, 15, 92, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=1000'),
  ('mobile-phones-accessories', 'apple-iphone-15-pro-max', 'MOBL-IPH-002', 'Apple iPhone 15 Pro Max (256GB Natural Titanium)', 'एप्पल आइफोन १५ प्रो म्याक्स', 'Aerospace-grade titanium design housing the cutting-edge 3nm A17 Pro GPU chip and customizable Action Button. 5x telephoto optical zoom lens captures astonishing close-up portraits from extraordinary distances.', 21490000, 20490000, 18, 110, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1000'),
  ('mobile-phones-accessories', 'anker-20w-fast-charger', 'MOBL-ANK-003', 'Anker 20W USB-C Nano Fast Charger', 'एङ्कर २० वाट फास्ट चार्जर', 'Ultra-compact miniature wall adapter engineered to charge modern flagship smartphones up to three times faster. Dynamic temperature sensor safety system prevents overheating during rapid charging cycles.', 245000, 199900, 80, 540, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=1000'),
  ('mobile-phones-accessories', 'apple-airpods-pro-2-usbc', 'MOBL-AIR-004', 'Apple AirPods Pro (2nd Generation USB-C)', 'एप्पल एयरपड्स प्रो २', 'Next-generation H2 chip drives twice as much active noise cancellation with personalized spatial audio tracking. MagSafe charging case features an onboard speaker and lanyard loop for precision Find My locating.', 3650000, 3290000, 25, 160, 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=1000'),
  ('mobile-phones-accessories', 'spigen-ultra-hybrid-magfit-case', 'MOBL-SPG-005', 'Spigen Ultra Hybrid MagFit Protective Case', 'स्पिगेन अल्ट्रा हाइब्रिड म्यागफिट केस', 'Crystal-clear polycarbonate backplate backed by shock-absorbing TPU bumper cushions equipped with Air Cushion technology. Integrated magnetic ring aligns perfectly with all MagSafe wireless charging pucks.', 320000, 269900, 45, 230, 'https://images.unsplash.com/photo-1541877944-ac82a091518a?q=80&w=1000'),

  -- Pharmacy & Health
  ('pharmacy-health', 'optimum-nutrition-gold-standard-whey', 'HLTH-WHE-001', 'Optimum Nutrition Gold Standard 100% Whey (5 lbs)', 'अप्टिमम न्युट्रिसन गोल्ड स्ट्यान्डर्ड व्हे प्रोटिन', 'The world''s most trusted post-workout protein delivering 24g of pure whey protein isolates and 5.5g BCAAs per scoop. Instantized powder mixes effortlessly in cold water or milk for rapid muscle recovery.', 1250000, 1099900, 35, 280, 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?q=80&w=1000'),
  ('pharmacy-health', 'omron-blood-pressure-monitor', 'HLTH-OMR-002', 'Omron Complete Blood Pressure & EKG Monitor', 'ओमरोन रक्तचाप तथा इसीजी मनिटर', 'Clinically validated upper arm blood pressure monitor featuring simultaneous single-lead ECG recording capability. Syncs readings instantly to your smartphone over Bluetooth for convenient health tracking.', 890000, 780000, 20, 120, 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?q=80&w=1000'),
  ('pharmacy-health', 'daily-multivitamin-gummies', 'HLTH-VIT-003', 'Daily Multivitamin & Mineral Gummies (90 Count)', 'दैनिक मल्टिभिटामिन गमीज', 'Delicious berry-flavored dietary gummies loaded with Vitamin C, D3, Zinc, and B-complex for immune vitality. Crafted without artificial corn syrups, gelatin, or synthetic coloring agents.', 220000, 185000, 60, 390, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=1000'),
  ('pharmacy-health', 'theragun-relief-percussive-massage', 'HLTH-THR-004', 'Theragun Relief Percussive Massage Gun', 'थेरागान रिलिफ मसाज गन', 'Comfortable ergonomic massage gun engineered to melt away muscle knots and alleviate everyday body stiffness. Whisper-quiet motor delivers 10mm percussive depth across three scientifically calibrated speed settings.', 2400000, 2090000, 18, 75, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000'),
  ('pharmacy-health', 'nordic-naturals-ultimate-omega', 'HLTH-OMG-005', 'Nordic Naturals Ultimate Omega Fish Oil (1280mg)', 'नर्डिक नेचुरल्स ओमेगा माछाको तेल', 'High-potency wild deep-sea fish oil providing concentrated EPA and DHA in triglyceride molecular form. Certified pure by third-party testing with a fresh natural lemon flavor and no fishy aftertaste.', 480000, 420000, 40, 210, 'https://images.unsplash.com/photo-1550572017-ed2112467d16?q=80&w=1000'),

  -- Premium Footwear
  ('premium-footwear', 'nike-air-force-1-07', 'FOOT-AF1-001', 'Nike Air Force 1 ''07 Triple White', 'नाइकी एयर फोर्स १ ०७ स्नीकर्स', 'Crisp white leather overlays stitched to perfection atop encapsulated full-length Nike Air cushioning. The enduring street style icon celebrated worldwide for timeless versatility and all-day comfort.', 1450000, null, 40, 310, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1000'),
  ('premium-footwear', 'adidas-ultraboost-10-shoes', 'FOOT-UB1-002', 'Adidas Ultraboost 1.0 Running Shoes', 'एडिडास अल्ट्राबुस्ट १.० रनिङ जुत्ता', 'Form-fitting Primeknit upper hugs the foot dynamically while legendary Boost midsole energy return cushions every stride. Continental Natural Rubber outsole maintains unshakeable traction in wet and dry conditions.', 2150000, 1899900, 25, 180, 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=1000'),
  ('premium-footwear', 'timberland-premium-6-inch-boots', 'FOOT-TMB-003', 'Timberland Premium 6-Inch Waterproof Boots', 'टिम्बरल्यान्ड ६ इन्च वाटरप्रूफ बुट', 'Iconic wheat nubuck leather boots sealed with seam-shield waterproof construction and 400g PrimaLoft insulation. Padded leather collar and anti-fatigue footbeds keep feet comfortable on city pavements or mountain trails.', 2600000, 2290000, 20, 115, 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?q=80&w=1000'),
  ('premium-footwear', 'new-balance-990v6-grey', 'FOOT-NB9-004', 'New Balance 990v6 Made in USA', 'न्यू ब्यालेन्स ९९० भि६ स्नीकर्स', 'Crafted in the United States with premium pigskin suede overlays and breathable mesh underlays. FuelCell foam cushioning works in tandem with ENCAP midsole rims to support stable, continuous daily movement.', 2800000, 2490000, 18, 95, 'https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=1000'),
  ('premium-footwear', 'dr-martens-1460-smooth-boot', 'FOOT-DOC-005', 'Dr. Martens 1460 Smooth Leather Boot', 'डा. मार्टेन्स १४६० लेदर बुट', 'The original 8-eye heritage boot recognizable by its yellow welt stitching, grooved edges, and air-cushioned sole. Sturdy smooth leather polishes to a high shine or wears naturally for authentic character.', 2250000, 1990000, 22, 130, 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=1000'),

  -- Apparel & Fashion
  ('apparel-fashion', 'levis-501-original-fit-jeans', 'FASH-LEV-001', 'Levi''s 501 Original Fit Denim Jeans', 'लिभाइज ५०१ ओरिजिनल फिट जिन्स', 'The archetypal straight-leg blue jean tailored with authentic non-stretch cotton and iconic copper button fly. Classic five-pocket construction anchored by the trademark red tab on the back pocket.', 780000, 649900, 45, 290, 'https://images.unsplash.com/photo-1542272604-780c96856592?q=80&w=1000'),
  ('apparel-fashion', 'north-face-retro-nuptse-jacket', 'FASH-TNF-002', 'The North Face 1996 Retro Nuptse Jacket', 'द नर्थ फेस नुप्ट्से ज्याकेट', 'Ultra-warm boxy silhouette insulated with 700-fill certified goose down encased in durable water-repellent ripstop. Packs down compactly into its own right-hand pocket for effortless travel packing.', 3800000, 3350000, 15, 84, 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000'),
  ('apparel-fashion', 'uniqlo-supima-cotton-tshirt', 'FASH-UNQ-003', 'Uniqlo Supima Cotton Crew Neck T-Shirt (3-Pack)', 'युनिक्लो सुपाइमा कटन टी-सर्ट', 'Spun from 100% extra-long staple Supima cotton renowned for silky texture, breathability, and deep color retention. Clean minimal seams pair elegantly under open dress shirts or worn solo with chinos.', 360000, 299900, 50, 340, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1000'),
  ('apparel-fashion', 'patagonia-better-sweater-fleece', 'FASH-PAT-004', 'Patagonia Better Sweater Fleece Jacket', 'पाटागोनिया बेटर स्वेटर फ्लिस ज्याकेट', 'Warm sweater-knit aesthetic on the exterior with plush moisture-wicking fleece interior made from recycled polyester. Raglan sleeve patterning allows unhindered arm movement beneath heavy hiking backpacks.', 1850000, 1620000, 24, 110, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1000'),
  ('apparel-fashion', 'ralph-lauren-classic-oxford-shirt', 'FASH-RLX-005', 'Ralph Lauren Classic Fit Oxford Shirt', 'राल्फ लरेन क्लासिक अक्सफोर्ड सर्ट', 'Garment-washed pinpoint cotton oxford woven with a relaxed button-down collar and signature embroidered pony. Tailored for comfortable draping that transitions smoothly from boardroom presentations to weekend dinners.', 1400000, 1190000, 30, 165, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=1000'),

  -- Designer Eyewear
  ('designer-eyewear', 'ray-ban-aviator-classic', 'EYE-RAY-001', 'Ray-Ban Aviator Classic Gold & Green', 'रे-ब्यान एभिएटर क्लासिक सनग्लास', 'Originally designed in 1937 for US aviators, featuring a teardrop metal frame with legendary G-15 crystal green lenses. Delivers 100% UV protection and exceptional visual clarity with minimal color distortion.', 1850000, 1620000, 30, 240, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1000'),
  ('designer-eyewear', 'oakley-holbrook-polarized', 'EYE-OAK-002', 'Oakley Holbrook Polarized Sunglasses', 'ओक्ली होलब्रुक पोलराइज्ड सनग्लास', 'Timeless American frame design accented with metal rivets and lightweight, stress-resistant O Matter material. Prizm polarized lenses maximize contrast and enhance visibility on sunny streets and open water.', 1950000, 1740000, 25, 170, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1000'),
  ('designer-eyewear', 'tom-ford-blue-block-glasses', 'EYE-TMF-003', 'Tom Ford Blue-Block Square Optical Glasses', 'टम फोर्ड ब्लु-ब्लक अप्टिकल चश्मा', 'Handcrafted Italian acetate frames distinguished by the signature rose-gold T-logo temples. Fitted with blue-light filtering lenses to prevent ocular fatigue during extended digital screen sessions.', 4200000, 3690000, 16, 75, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?q=80&w=1000'),
  ('designer-eyewear', 'persol-714-folding-sunglasses', 'EYE-PER-004', 'Persol 714 Folding Havana Sunglasses', 'पर्सोल ७१४ फोल्डिङ सनग्लास', 'The celebrated folding sunglasses famously worn by Steve McQueen, handmade in Italy with flexible Meflecto stem stems. Crystal glare-reducing lenses fold in half at the bridge for effortless pocket carrying.', 3400000, 2990000, 14, 62, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=1000'),
  ('designer-eyewear', 'gucci-oversized-square-sunglasses', 'EYE-GUC-005', 'Gucci Oversized Square Tinted Sunglasses', 'गुच्ची ओभरसाइज्ड स्क्वायर सनग्लास', 'Dramatic 70s-inspired square acetate sunglasses emblazoned with interlocking gold-tone GG monogram emblems. Gradient amber lenses add a commanding touch of vintage glamour to any high-fashion ensemble.', 4800000, 4190000, 12, 48, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=1000');

-- 5. Insert or update products in public.products
insert into public.products (
  tenant_id, category_id, slug, sku, name_en, name_ne,
  description_en, price_paisa, discount_price_paisa,
  stock_quantity, units_sold, status, min_purchase_qty, published_at
)
select
  t.id as tenant_id,
  c.id as category_id,
  tmp.slug,
  tmp.sku,
  tmp.name_en,
  tmp.name_ne,
  tmp.description_en,
  tmp.price_paisa,
  tmp.discount_price_paisa,
  tmp.stock_quantity,
  tmp.units_sold,
  'published' as status,
  1 as min_purchase_qty,
  now() as published_at
from temp_myshop_products tmp
join public.tenants t on t.slug = 'myshop'
join public.categories c on c.tenant_id = t.id and c.slug = tmp.cat_slug
on conflict (tenant_id, slug) do update set
  category_id = excluded.category_id,
  sku = excluded.sku,
  name_en = excluded.name_en,
  name_ne = excluded.name_ne,
  description_en = excluded.description_en,
  price_paisa = excluded.price_paisa,
  discount_price_paisa = excluded.discount_price_paisa,
  stock_quantity = excluded.stock_quantity,
  units_sold = excluded.units_sold,
  status = 'published';

-- 6. Insert primary images for each product
insert into public.product_images (product_id, storage_path, alt_en, is_primary, sort_order)
select
  p.id as product_id,
  tmp.image_url as storage_path,
  tmp.name_en as alt_en,
  true as is_primary,
  0 as sort_order
from temp_myshop_products tmp
join public.tenants t on t.slug = 'myshop'
join public.products p on p.tenant_id = t.id and p.slug = tmp.slug
on conflict (product_id) where is_primary do update set
  storage_path = excluded.storage_path,
  alt_en = excluded.alt_en;
