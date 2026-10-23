-- Multi-tenant Local Business Network Platform
-- Phase 0: Core schema for business profiles, services, gallery, inquiries, and analytics.
-- Each business (tenant) gets its own slug-based website rendered from the same codebase.

-- ============================================================================
-- 1. TENANTS — the core business entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),

  -- Business profile
  business_name TEXT NOT NULL,
  business_name_ne TEXT,
  tagline TEXT,
  tagline_ne TEXT,
  about TEXT,
  about_ne TEXT,
  logo_path TEXT,
  cover_path TEXT,

  -- Contact
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,

  -- Location
  address TEXT,
  address_ne TEXT,
  municipality TEXT,
  district TEXT,
  province TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  map_embed_url TEXT,

  -- Branding
  brand_primary TEXT DEFAULT '#F5A524',
  brand_config JSONB DEFAULT '{}',

  -- Social
  social_links JSONB DEFAULT '{}',
  -- Example: {"facebook":"...","instagram":"...","tiktok":"...","youtube":"..."}

  -- Category (free text for now; normalized table later if needed)
  business_type TEXT,
  business_type_ne TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','suspended')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  custom_domain TEXT UNIQUE,

  -- SEO
  seo_title TEXT,
  seo_description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_status ON tenants (status) WHERE status = 'active';
CREATE INDEX idx_tenants_owner ON tenants (owner_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_tenant_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_tenant_updated_at();

-- ============================================================================
-- 2. TENANT_HOURS — opening hours per day of the week
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(tenant_id, day_of_week)
);

-- ============================================================================
-- 3. TENANT_SERVICES — products / services offered by the business
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ne TEXT,
  description_en TEXT,
  description_ne TEXT,
  price_display TEXT, -- free-text price ("Rs. 500", "Starting at Rs. 1,000", etc.)
  image_path TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_services_tenant ON tenant_services (tenant_id);

-- ============================================================================
-- 4. TENANT_GALLERY — photo gallery
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption_en TEXT,
  caption_ne TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_gallery_tenant ON tenant_gallery (tenant_id);

-- ============================================================================
-- 5. TENANT_INQUIRIES — contact form submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_inquiries_tenant ON tenant_inquiries (tenant_id, created_at DESC);

-- ============================================================================
-- 6. TENANT_STAFF — access control per tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_staff (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

-- ============================================================================
-- 7. PLATFORM_SETTINGS — network-wide configuration (single row)
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  network_name TEXT NOT NULL DEFAULT 'Dumarwana',
  network_name_ne TEXT DEFAULT 'दुमरवाना',
  network_tagline TEXT DEFAULT 'Local businesses, online.',
  network_tagline_ne TEXT DEFAULT 'स्थानीय व्यवसायहरू, अनलाइन।',
  cta_text TEXT DEFAULT 'Get Your Business Online',
  cta_text_ne TEXT DEFAULT 'आफ्नो व्यवसाय अनलाइन बनाउनुहोस्',
  contact_email TEXT,
  contact_phone TEXT,
  featured_tenant_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. TENANT_ANALYTICS — basic page view tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_analytics (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_analytics_tenant_date ON tenant_analytics (tenant_id, created_at DESC);

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

-- tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_public_read" ON tenants FOR SELECT USING (status = 'active');
CREATE POLICY "tenants_owner_all" ON tenants FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "tenants_staff_read" ON tenants FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenants.id AND ts.user_id = auth.uid())
);
CREATE POLICY "tenants_staff_update" ON tenants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenants.id AND ts.user_id = auth.uid() AND ts.role IN ('owner','editor'))
);

-- tenant_hours
ALTER TABLE tenant_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hours_public_read" ON tenant_hours FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_hours.tenant_id AND t.status = 'active')
);
CREATE POLICY "hours_staff_all" ON tenant_hours FOR ALL USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenant_hours.tenant_id AND ts.user_id = auth.uid() AND ts.role IN ('owner','editor'))
);
CREATE POLICY "hours_owner_all" ON tenant_hours FOR ALL USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_hours.tenant_id AND t.owner_id = auth.uid())
);

-- tenant_services
ALTER TABLE tenant_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_public_read" ON tenant_services FOR SELECT USING (
  is_active AND EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_services.tenant_id AND t.status = 'active')
);
CREATE POLICY "services_staff_all" ON tenant_services FOR ALL USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenant_services.tenant_id AND ts.user_id = auth.uid() AND ts.role IN ('owner','editor'))
);
CREATE POLICY "services_owner_all" ON tenant_services FOR ALL USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_services.tenant_id AND t.owner_id = auth.uid())
);

-- tenant_gallery
ALTER TABLE tenant_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery_public_read" ON tenant_gallery FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_gallery.tenant_id AND t.status = 'active')
);
CREATE POLICY "gallery_staff_all" ON tenant_gallery FOR ALL USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenant_gallery.tenant_id AND ts.user_id = auth.uid() AND ts.role IN ('owner','editor'))
);
CREATE POLICY "gallery_owner_all" ON tenant_gallery FOR ALL USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_gallery.tenant_id AND t.owner_id = auth.uid())
);

-- tenant_inquiries: public insert, staff read
ALTER TABLE tenant_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inquiries_public_insert" ON tenant_inquiries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_inquiries.tenant_id AND t.status = 'active')
);
CREATE POLICY "inquiries_staff_read" ON tenant_inquiries FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenant_inquiries.tenant_id AND ts.user_id = auth.uid())
);
CREATE POLICY "inquiries_owner_read" ON tenant_inquiries FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_inquiries.tenant_id AND t.owner_id = auth.uid())
);
CREATE POLICY "inquiries_staff_update" ON tenant_inquiries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenant_inquiries.tenant_id AND ts.user_id = auth.uid() AND ts.role IN ('owner','editor'))
);
CREATE POLICY "inquiries_owner_update" ON tenant_inquiries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_inquiries.tenant_id AND t.owner_id = auth.uid())
);

-- tenant_staff
ALTER TABLE tenant_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_self_read" ON tenant_staff FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "staff_owner_all" ON tenant_staff FOR ALL USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_staff.tenant_id AND t.owner_id = auth.uid())
);

-- platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_public_read" ON platform_settings FOR SELECT USING (true);

-- tenant_analytics: public insert (anon), staff/owner read
ALTER TABLE tenant_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_public_insert" ON tenant_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "analytics_staff_read" ON tenant_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenant_analytics.tenant_id AND ts.user_id = auth.uid())
);
CREATE POLICY "analytics_owner_read" ON tenant_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_analytics.tenant_id AND t.owner_id = auth.uid())
);

-- ============================================================================
-- 10. STORAGE BUCKET for tenant assets (logos, covers, gallery images)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read, authenticated upload for owners/staff
CREATE POLICY "tenant_assets_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'tenant-assets');
CREATE POLICY "tenant_assets_auth_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'tenant-assets' AND auth.uid() IS NOT NULL
);
CREATE POLICY "tenant_assets_auth_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'tenant-assets' AND auth.uid() IS NOT NULL
);
CREATE POLICY "tenant_assets_auth_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'tenant-assets' AND auth.uid() IS NOT NULL
);

-- ============================================================================
-- 11. HELPER: resolve tenant by slug (RPC for fast lookups)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_tenant_by_slug(p_slug TEXT)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(t) FROM (
    SELECT
      id, slug, business_name, business_name_ne, tagline, tagline_ne,
      about, about_ne, logo_path, cover_path,
      phone, whatsapp, email, website,
      address, address_ne, municipality, district, province,
      latitude, longitude, map_embed_url,
      brand_primary, brand_config, social_links,
      business_type, business_type_ne,
      seo_title, seo_description,
      custom_domain
    FROM tenants WHERE slug = p_slug AND status = 'active'
  ) t;
$$;

-- Grant anon + authenticated access to the RPC
GRANT EXECUTE ON FUNCTION get_tenant_by_slug(TEXT) TO anon, authenticated;

-- ============================================================================
-- 12. SEED DATA: Platform settings + Demo business
-- ============================================================================
INSERT INTO platform_settings (id, network_name, network_name_ne, network_tagline, network_tagline_ne, cta_text, cta_text_ne, contact_phone, contact_email)
VALUES (
  1,
  'Dumarwana',
  'दुमरवाना',
  'Local businesses in Dumarwana, all in one place.',
  'दुमरवानाका स्थानीय व्यवसायहरू, सबै एकै ठाउँमा।',
  'Get Your Business Online',
  'आफ्नो व्यवसाय अनलाइन बनाउनुहोस्',
  '+977 9800000000',
  'support@dumarwana.com'
)
ON CONFLICT (id) DO UPDATE SET
  network_name = EXCLUDED.network_name,
  network_name_ne = EXCLUDED.network_name_ne,
  network_tagline = EXCLUDED.network_tagline,
  network_tagline_ne = EXCLUDED.network_tagline_ne;

-- Demo Tenant: Royal Bakery & Cafe
INSERT INTO tenants (
  slug,
  business_name,
  business_name_ne,
  tagline,
  tagline_ne,
  about,
  about_ne,
  phone,
  whatsapp,
  email,
  address,
  address_ne,
  municipality,
  district,
  province,
  brand_primary,
  business_type,
  business_type_ne,
  status,
  seo_title,
  seo_description
)
VALUES (
  'royal-bakery',
  'Royal Bakery & Cafe',
  'रोयल बेकरी तथा क्याफे',
  'Freshly baked artisanal cakes, pastries & aromatic coffee.',
  'ताजा बेक्ड केक, पेस्ट्री र अर्गानिक कफी।',
  'Welcome to Royal Bakery & Cafe, Dumarwana’s favorite spot for fresh pastries, customized celebration cakes, and warm artisan hospitality. Established in 2020, we take pride in using premium local ingredients and baking fresh every morning.\n\nWhether you need an elaborate birthday cake or want to relax over a hot cappuccino, we are here to serve you with love.',
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

-- Seed services and hours for royal-bakery
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'royal-bakery' LIMIT 1;
  IF v_tenant_id IS NOT NULL THEN
    -- Opening hours
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

    -- Services
    INSERT INTO tenant_services (tenant_id, name_en, name_ne, description_en, description_ne, price_display, sort_order)
    VALUES
      (v_tenant_id, 'Customized Celebration Cakes', 'विशेष अवसरका केकहरू', 'Birthday, anniversary, and wedding cakes tailored to your theme and favorite flavors.', 'जन्मदिन, वार्षिकोत्सव र विवाहका लागि विशेष डिजाइन गरिएका स्वादिष्ट केकहरू।', 'Rs. 750 / pound', 1),
      (v_tenant_id, 'Fresh Black Forest & Red Velvet', 'ब्ल्याक फरेस्ट र रेड भेल्भेट', 'Daily baked slices and whole cakes topped with real cream and rich chocolate.', 'दैनिक ताजा बनाइएको चकलेट तथा क्रिम केकहरू।', 'Rs. 650 / pound', 2),
      (v_tenant_id, 'Artisan Espresso & Cappuccino', 'अर्गानिक कफी र क्यापुचिनो', 'Locally sourced Nepali organic coffee beans brewed fresh by experienced baristas.', 'नेपाली अर्गानिक कफीको ताजा स्वाद।', 'Rs. 150 – 250', 3),
      (v_tenant_id, 'Party & Event Bulk Orders', 'पार्टी तथा कार्यक्रम अर्डर', 'Fresh muffins, cookies, and sandwich platters for meetings and family events.', 'सभा-समारोह र पारिवारिक कार्यक्रमका लागि खाजा तथा बेकरी प्याकेज।', 'Custom Quote', 4)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

