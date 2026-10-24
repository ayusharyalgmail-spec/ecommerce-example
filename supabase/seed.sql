-- DEVELOPMENT ONLY. Never run against a real control-plane project (audit P1-4).
update public.platform_settings set network_name = 'Demo Network', network_tagline = 'Local businesses, online.' where id = 1;

insert into public.tenants (slug, business_name, tagline, business_type, status, brand_primary)
values ('demo-bakery', 'Demo Bakery', 'Fresh every morning (demo data).', 'Bakery', 'active', '#E8A317')
on conflict (slug) do nothing;

-- Demo vendor (moved here from the 20261021100516 migration: sample data does not belong in a schema migration).
INSERT INTO tenants (
  slug, business_name, business_name_ne, tagline, tagline_ne, about, about_ne,
  phone, whatsapp, email, address, address_ne, municipality, district, province,
  brand_primary, business_type, business_type_ne, status, seo_title, seo_description
)
VALUES (
  'royal-bakery',
  'Royal Bakery & Cafe',
  'रोयल बेकरी तथा क्याफे',
  'Freshly baked artisanal cakes, pastries & aromatic coffee.',
  'ताजा बेक्ड केक, पेस्ट्री र अर्गानिक कफी।',
  'Welcome to Royal Bakery & Cafe, Dumarwana’s favorite spot for fresh pastries, customized celebration cakes, and warm artisan hospitality. Established in 2020, we take pride in using premium local ingredients and baking fresh every morning.

Whether you need an elaborate birthday cake or want to relax over a hot cappuccino, we are here to serve you with love.',
  'रोयल बेकरी तथा क्याफेमा यहाँहरूलाई हार्दिक स्वागत छ। दुमरवानाको मुटुमा अवस्थित हाम्रो बेकरीमा ताजा केक, पेस्ट्री, र उत्कृष्ट कफी उपलब्ध छ। २०२० मा स्थापना भएको हाम्रो बेकरीले सधैं उच्च गुणस्तरको सामग्री प्रयोग गरेर ताजा परिकारहरू तयार पार्दै आएको छ।',
  '+977 9812345678',
  '+977 9812345678',
  'royalbakery.dumarwana@gmail.com',
  'Main Road, Near Chowk',
  'मुख्य सडक, चोक नजिकै',
  'Jeetpur Simara - 16',
  'Bara',
  'Madhesh Province',
  '#E8A317',
  'Bakery & Cafe',
  'बेकरी तथा क्याफे',
  'active',
  'Royal Bakery & Cafe — Dumarwana',
  'Best cakes, celebration bakery, and coffee in Dumarwana, Bara.'
)
ON CONFLICT (slug) DO UPDATE SET
  status = 'active',
  business_name = EXCLUDED.business_name;

DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'royal-bakery' LIMIT 1;
  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO tenant_hours (tenant_id, day_of_week, open_time, close_time, is_closed)
    VALUES
      (v_tenant_id, 0, '07:00:00', '20:30:00', false),
      (v_tenant_id, 1, '07:00:00', '20:30:00', false),
      (v_tenant_id, 2, '07:00:00', '20:30:00', false),
      (v_tenant_id, 3, '07:00:00', '20:30:00', false),
      (v_tenant_id, 4, '07:00:00', '20:30:00', false),
      (v_tenant_id, 5, '07:00:00', '21:00:00', false),
      (v_tenant_id, 6, '08:00:00', '21:00:00', false)
    ON CONFLICT (tenant_id, day_of_week) DO NOTHING;

    INSERT INTO tenant_services (tenant_id, name_en, name_ne, description_en, description_ne, price_display, sort_order)
    VALUES
      (v_tenant_id, 'Customized Celebration Cakes', 'विशेष अवसरका केकहरू', 'Birthday, anniversary, and wedding cakes tailored to your theme and favorite flavors.', 'जन्मदिन, वार्षिकोत्सव र विवाहका लागि विशेष डिजाइन गरिएका स्वादिष्ट केकहरू।', 'Rs. 750 / pound', 1),
      (v_tenant_id, 'Fresh Black Forest & Red Velvet', 'ब्ल्याक फरेस्ट र रेड भेल्भेट', 'Daily baked slices and whole cakes topped with real cream and rich chocolate.', 'दैनिक ताजा बनाइएको चकलेट तथा क्रिम केकहरू।', 'Rs. 650 / pound', 2),
      (v_tenant_id, 'Artisan Espresso & Cappuccino', 'अर्गानिक कफी र क्यापुचिनो', 'Locally sourced Nepali organic coffee beans brewed fresh by experienced baristas.', 'नेपाली अर्गानिक कफीको ताजा स्वाद।', 'Rs. 150 – 250', 3),
      (v_tenant_id, 'Party & Event Bulk Orders', 'पार्टी तथा कार्यक्रम अर्डर', 'Fresh muffins, cookies, and sandwich platters for meetings and family events.', 'सभा-समारोह र पारिवारिक कार्यक्रमका लागि खाजा तथा बेकरी प्याकेज।', 'Custom Quote', 4)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;