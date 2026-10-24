CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  business_name TEXT NOT NULL,
  business_name_ne TEXT,
  tagline TEXT,
  tagline_ne TEXT,
  about TEXT,
  about_ne TEXT,
  logo_path TEXT,
  cover_path TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  address_ne TEXT,
  municipality TEXT,
  district TEXT,
  province TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  map_embed_url TEXT,
  brand_primary TEXT DEFAULT '#F5A524',
  brand_config JSONB DEFAULT '{}',
  social_links JSONB DEFAULT '{}',
  business_type TEXT,
  business_type_ne TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','suspended')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  custom_domain TEXT UNIQUE,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_status ON tenants (status) WHERE status = 'active';
CREATE INDEX idx_tenants_owner ON tenants (owner_id);

CREATE OR REPLACE FUNCTION set_tenant_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_tenant_updated_at();

CREATE TABLE IF NOT EXISTS tenant_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(tenant_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS tenant_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ne TEXT,
  description_en TEXT,
  description_ne TEXT,
  price_display TEXT,
  image_path TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_services_tenant ON tenant_services (tenant_id);

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

CREATE TABLE IF NOT EXISTS tenant_staff (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS tenant_analytics (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_analytics_tenant_date ON tenant_analytics (tenant_id, created_at DESC);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_public_read" ON tenants FOR SELECT USING (status = 'active');
CREATE POLICY "tenants_owner_all" ON tenants FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "tenants_staff_read" ON tenants FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenants.id AND ts.user_id = auth.uid())
);
CREATE POLICY "tenants_staff_update" ON tenants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenants.id AND ts.user_id = auth.uid() AND ts.role IN ('owner','editor'))
);

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

ALTER TABLE tenant_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_self_read" ON tenant_staff FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "staff_owner_all" ON tenant_staff FOR ALL USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_staff.tenant_id AND t.owner_id = auth.uid())
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_public_read" ON platform_settings FOR SELECT USING (true);

ALTER TABLE tenant_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_public_insert" ON tenant_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "analytics_staff_read" ON tenant_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenant_staff ts WHERE ts.tenant_id = tenant_analytics.tenant_id AND ts.user_id = auth.uid())
);
CREATE POLICY "analytics_owner_read" ON tenant_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_analytics.tenant_id AND t.owner_id = auth.uid())
);

INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

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

GRANT EXECUTE ON FUNCTION get_tenant_by_slug(TEXT) TO anon, authenticated;

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

