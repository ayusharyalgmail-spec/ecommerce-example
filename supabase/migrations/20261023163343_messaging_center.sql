create or replace function app_private.role_permissions(r text) returns text[]
 language sql immutable set search_path to '' as $f$
  select case r
   when 'owner' then array['products.view','products.manage','orders.view','orders.manage','orders.verify_payment','orders.override_confirmation','customers.view','coupons.manage','delivery.manage','reviews.moderate','reports.view','csv.manage','staff.manage','settings.manage','audit.view','messages.reply','messages.manage']
   when 'manager' then array['products.view','products.manage','orders.view','orders.manage','orders.verify_payment','customers.view','coupons.manage','delivery.manage','reviews.moderate','reports.view','csv.manage','audit.view','messages.reply','messages.manage']
   else array['products.view','orders.view','orders.manage','messages.reply'] end $f$;

create table public.msg_guests (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  display_name text not null check (char_length(display_name) between 1 and 80),
  phone text check (phone is null or phone ~ '^\+?[0-9][0-9 -]{5,18}[0-9]$'),
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.msg_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app boolean not null default true,
  orders boolean not null default true,
  replies boolean not null default true,
  announcements boolean not null default true,
  promos boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.msg_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_id uuid references public.msg_guests(id) on delete cascade,
  status text not null default 'open' check (status in ('open','resolved')),
  assigned_to uuid references auth.users(id) on delete set null,
  last_sender text check (last_sender in ('customer','staff')),
  last_preview text not null default '',
  last_message_at timestamptz not null default now(),
  customer_unread int not null default 0 check (customer_unread >= 0),
  staff_unread int not null default 0 check (staff_unread >= 0),
  created_at timestamptz not null default now(),
  check ((user_id is null) <> (guest_id is null))
);
create unique index msg_conv_one_per_user on public.msg_conversations(user_id) where user_id is not null;
create unique index msg_conv_one_per_guest on public.msg_conversations(guest_id) where guest_id is not null;
create index msg_conv_inbox on public.msg_conversations(last_message_at desc);

create table public.msg_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.msg_conversations(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer','staff')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  client_id uuid not null,
  created_at timestamptz not null default now(),
  unique (conversation_id, client_id)
);
create index msg_messages_conv on public.msg_messages(conversation_id, created_at);

create table public.msg_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  order_id uuid references public.orders(id) on delete cascade,
  order_number text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index msg_notif_user on public.msg_notifications(user_id, created_at desc);

create table public.msg_campaigns (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('alert','promo')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 1000),
  title_ne text check (char_length(title_ne) <= 120),
  body_ne text check (char_length(body_ne) <= 1000),
  image_path text check (image_path is null or image_path ~ '^messages/[A-Za-z0-9._-]{1,120}$'),
  cta_label text check (char_length(cta_label) <= 40),
  cta_label_ne text check (char_length(cta_label_ne) <= 40),
  cta_url text check (cta_url is null or (char_length(cta_url) <= 300 and cta_url ~ '^(/[^/\\\s]|/$|https://[^\s]+$)')),
  audience text not null default 'all' check (audience in ('all','signed_in','guests')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index msg_campaigns_live on public.msg_campaigns(status, kind);

create table public.msg_campaign_reads (
  campaign_id uuid not null references public.msg_campaigns(id) on delete cascade,
  reader text not null,
  read_at timestamptz not null default now(),
  primary key (campaign_id, reader)
);

alter table public.msg_guests enable row level security;
alter table public.msg_preferences enable row level security;
alter table public.msg_conversations enable row level security;
alter table public.msg_messages enable row level security;
alter table public.msg_notifications enable row level security;
alter table public.msg_campaigns enable row level security;
alter table public.msg_campaign_reads enable row level security;
revoke all on public.msg_guests, public.msg_preferences, public.msg_conversations, public.msg_messages,
  public.msg_notifications, public.msg_campaigns, public.msg_campaign_reads from anon, authenticated;

create trigger trg_msg_campaigns_audit after insert or update or delete on public.msg_campaigns
  for each row execute function app_private.audit_row();

create or replace function app_private.msg_actor(p_token text, out o_user uuid, out o_guest uuid)
 language plpgsql security definer set search_path to '' as $f$
begin
  o_user := auth.uid();
  if o_user is not null then return; end if;
  if p_token is null or char_length(p_token) < 40 then raise exception 'FORBIDDEN: identity required'; end if;
  select g.id into o_guest from public.msg_guests g
   where g.token_hash = sha256(convert_to(p_token, 'UTF8')) and g.last_seen_at > now() - interval '180 days';
  if o_guest is null then raise exception 'FORBIDDEN: session expired'; end if;
end $f$;

create or replace function app_private.msg_reader(a_user uuid, a_guest uuid) returns text
 language sql immutable set search_path to '' as $f$ select case when a_user is not null then 'u:' || a_user else 'g:' || a_guest end $f$;

create or replace function app_private.msg_prefs(a_user uuid, a_guest uuid) returns jsonb
 language sql stable security definer set search_path to '' as $f$
  select jsonb_build_object('in_app', true, 'orders', true, 'replies', true, 'announcements', true, 'promos', true)
    || coalesce(case when a_user is not null
         then (select to_jsonb(p) - 'user_id' - 'updated_at' from public.msg_preferences p where p.user_id = a_user)
         else (select g.prefs from public.msg_guests g where g.id = a_guest) end, '{}'::jsonb) $f$;

create or replace function app_private.msg_need(p_perm text) returns void
 language plpgsql security definer set search_path to '' as $f$
begin
  if auth.uid() is null or not app_private.has_permission(p_perm) then raise exception 'FORBIDDEN: %', p_perm; end if;
end $f$;

create or replace function app_private.msg_live_campaigns(a_user uuid) returns setof public.msg_campaigns
 language sql stable security definer set search_path to '' as $f$
  select c.* from public.msg_campaigns c
   where c.status = 'published'
     and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at > now())
     and (c.audience = 'all' or (c.audience = 'signed_in' and a_user is not null) or (c.audience = 'guests' and a_user is null)) $f$;

create or replace function app_private.msg_on_order_event() returns trigger
 language plpgsql security definer set search_path to '' as $f$
declare o record;
begin
  select user_id, order_number into o from public.orders where id = new.order_id;
  if o.user_id is not null then
    insert into public.msg_notifications (user_id, code, order_id, order_number) values (o.user_id, new.to_status, new.order_id, o.order_number);
  end if;
  return new;
end $f$;
create trigger trg_msg_order_notice after insert on public.order_status_events
  for each row execute function app_private.msg_on_order_event();

create or replace function public.msg_guest_start(p_name text, p_phone text default null) returns jsonb
 language plpgsql security definer set search_path to '' as $f$
declare v_name text := btrim(coalesce(p_name, '')); v_phone text := nullif(btrim(coalesce(p_phone, '')), ''); v_token text; v_id uuid;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 80 then raise exception 'VALIDATION_FAILED: name'; end if;
  if v_phone is not null and v_phone !~ '^\+?[0-9][0-9 -]{5,18}[0-9]$' then raise exception 'VALIDATION_FAILED: phone'; end if;
  if not public.check_rate_limit('msg_guest_start', 200, 3600) then raise exception 'RATE_LIMIT_EXCEEDED: try later'; end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.msg_guests (token_hash, display_name, phone) values (sha256(convert_to(v_token, 'UTF8')), v_name, v_phone) returning id into v_id;
  return jsonb_build_object('guest_id', v_id, 'token', v_token, 'name', v_name, 'phone', v_phone);
end $f$;

create or replace function public.msg_me(p_token text default null) returns jsonb
 language plpgsql security definer set search_path to '' as $f$
declare a record; v jsonb;
begin
  select * into a from app_private.msg_actor(p_token);
  if a.o_user is not null then
    select jsonb_build_object('kind', 'user', 'name', p.full_name, 'phone', p.phone) into v from public.profiles p where p.id = a.o_user;
    return coalesce(v, jsonb_build_object('kind', 'user'));
  end if;
  update public.msg_guests set last_seen_at = now() where id = a.o_guest and last_seen_at < now() - interval '1 day';
  select jsonb_build_object('kind', 'guest', 'name', g.display_name, 'phone', g.phone) into v from public.msg_guests g where g.id = a.o_guest;
  return v;
end $f$;

create or replace function public.msg_unread(p_token text default null) returns jsonb
 language plpgsql stable security definer set search_path to '' as $f$
declare a record; pr jsonb; v_chat int := 0; v_order int := 0; v_alert int := 0; v_promo int := 0; rd text;
begin
  select * into a from app_private.msg_actor(p_token);
  pr := app_private.msg_prefs(a.o_user, a.o_guest); rd := app_private.msg_reader(a.o_user, a.o_guest);
  select count(*) into v_chat from public.msg_conversations c
   where c.customer_unread > 0 and (c.user_id = a.o_user or c.guest_id = a.o_guest);
  if a.o_user is not null then
    select count(*) into v_order from public.msg_notifications n where n.user_id = a.o_user and n.read_at is null;
  end if;
  select count(*) filter (where c.kind = 'alert'), count(*) filter (where c.kind = 'promo') into v_alert, v_promo
    from app_private.msg_live_campaigns(a.o_user) c
   where not exists (select 1 from public.msg_campaign_reads r where r.campaign_id = c.id and r.reader = rd);
  if not (pr->>'replies')::boolean then v_chat := 0; end if;
  if not (pr->>'orders')::boolean then v_order := 0; end if;
  if not (pr->>'announcements')::boolean then v_alert := 0; end if;
  if not (pr->>'promos')::boolean then v_promo := 0; end if;
  if not (pr->>'in_app')::boolean then v_chat := 0; v_order := 0; v_alert := 0; v_promo := 0; end if;
  return jsonb_build_object('total', v_chat + v_order + v_alert + v_promo, 'chat', v_chat, 'order', v_order, 'alert', v_alert, 'promo', v_promo);
end $f$;

create or replace function public.msg_feed(p_token text, p_kind text, p_limit int default 50) returns jsonb
 language plpgsql stable security definer set search_path to '' as $f$
declare a record; pr jsonb; rd text; v jsonb; lim int := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  select * into a from app_private.msg_actor(p_token);
  pr := app_private.msg_prefs(a.o_user, a.o_guest); rd := app_private.msg_reader(a.o_user, a.o_guest);
  if p_kind = 'order' then
    select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') into v from (
      select jsonb_build_object('ref', 'notification', 'id', n.id, 'kind', 'order', 'code', n.code, 'order_id', n.order_id,
             'order_number', n.order_number, 'at', n.created_at, 'unread', n.read_at is null) x
        from public.msg_notifications n where n.user_id = a.o_user order by n.created_at desc limit lim) s;
  elsif p_kind in ('alert', 'promo') then
    if (p_kind = 'alert' and not (pr->>'announcements')::boolean) or (p_kind = 'promo' and not (pr->>'promos')::boolean) then return '[]'; end if;
    select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') into v from (
      select jsonb_build_object('ref', 'campaign', 'id', c.id, 'kind', c.kind, 'title', c.title, 'body', c.body, 'title_ne', c.title_ne,
             'body_ne', c.body_ne, 'image_path', c.image_path, 'cta_label', c.cta_label, 'cta_label_ne', c.cta_label_ne, 'cta_url', c.cta_url,
             'at', coalesce(c.starts_at, c.published_at, c.created_at), 'ends_at', c.ends_at,
             'unread', not exists (select 1 from public.msg_campaign_reads r where r.campaign_id = c.id and r.reader = rd)) x
        from app_private.msg_live_campaigns(a.o_user) c where c.kind = p_kind
       order by coalesce(c.starts_at, c.published_at, c.created_at) desc limit lim) s;
  else
    raise exception 'VALIDATION_FAILED: kind';
  end if;
  return v;
end $f$;

create or replace function public.msg_mark_read(p_token text, p_ref text, p_id uuid) returns void
 language plpgsql security definer set search_path to '' as $f$
declare a record;
begin
  select * into a from app_private.msg_actor(p_token);
  if p_ref = 'notification' then
    update public.msg_notifications set read_at = now() where id = p_id and user_id = a.o_user and read_at is null;
  elsif p_ref = 'campaign' then
    insert into public.msg_campaign_reads (campaign_id, reader)
      select c.id, app_private.msg_reader(a.o_user, a.o_guest) from app_private.msg_live_campaigns(a.o_user) c where c.id = p_id
      on conflict do nothing;
  else raise exception 'VALIDATION_FAILED: ref'; end if;
end $f$;

create or replace function public.msg_mark_all_read(p_token text, p_kind text default null) returns void
 language plpgsql security definer set search_path to '' as $f$
declare a record; rd text;
begin
  select * into a from app_private.msg_actor(p_token); rd := app_private.msg_reader(a.o_user, a.o_guest);
  if p_kind is null or p_kind = 'order' then
    update public.msg_notifications set read_at = now() where user_id = a.o_user and read_at is null;
  end if;
  if p_kind is null or p_kind in ('alert', 'promo') then
    insert into public.msg_campaign_reads (campaign_id, reader)
      select c.id, rd from app_private.msg_live_campaigns(a.o_user) c where p_kind is null or c.kind = p_kind
      on conflict do nothing;
  end if;
  if p_kind is null or p_kind = 'chat' then
    update public.msg_conversations set customer_unread = 0 where customer_unread > 0 and (user_id = a.o_user or guest_id = a.o_guest);
  end if;
end $f$;

create or replace function public.msg_conversation(p_token text default null) returns jsonb
 language plpgsql security definer set search_path to '' as $f$
declare a record; c public.msg_conversations; v jsonb;
begin
  select * into a from app_private.msg_actor(p_token);
  select * into c from public.msg_conversations x where x.user_id = a.o_user or x.guest_id = a.o_guest;
  if c.id is null then return jsonb_build_object('conversation', null, 'messages', '[]'::jsonb); end if;
  if c.customer_unread > 0 then update public.msg_conversations set customer_unread = 0 where id = c.id; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'role', m.sender_role, 'body', m.body, 'client_id', m.client_id, 'at', m.created_at) order by m.created_at), '[]')
    into v from (select * from public.msg_messages where conversation_id = c.id order by created_at desc limit 200) m;
  return jsonb_build_object('conversation', jsonb_build_object('id', c.id, 'status', c.status, 'last_message_at', c.last_message_at), 'messages', v);
end $f$;

create or replace function public.msg_send(p_token text, p_body text, p_client_id uuid) returns jsonb
 language plpgsql security definer set search_path to '' as $f$
declare a record; c public.msg_conversations; v_body text := btrim(coalesce(p_body, '')); m public.msg_messages;
begin
  select * into a from app_private.msg_actor(p_token);
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'VALIDATION_FAILED: body'; end if;
  if p_client_id is null then raise exception 'VALIDATION_FAILED: client_id'; end if;
  if not public.check_rate_limit('msg_send:' || app_private.msg_reader(a.o_user, a.o_guest), 20, 60) then raise exception 'RATE_LIMIT_EXCEEDED: slow down'; end if;
  select * into c from public.msg_conversations x where x.user_id = a.o_user or x.guest_id = a.o_guest;
  if c.id is null then
    insert into public.msg_conversations (user_id, guest_id) values (a.o_user, a.o_guest) returning * into c;
  end if;
  insert into public.msg_messages (conversation_id, sender_role, sender_user_id, body, client_id)
    values (c.id, 'customer', a.o_user, v_body, p_client_id)
    on conflict (conversation_id, client_id) do nothing returning * into m;
  if m.id is null then
    select * into m from public.msg_messages where conversation_id = c.id and client_id = p_client_id;
  else
    update public.msg_conversations set status = 'open', last_sender = 'customer', last_preview = left(v_body, 140),
      last_message_at = m.created_at, staff_unread = staff_unread + 1 where id = c.id;
  end if;
  return jsonb_build_object('id', m.id, 'role', m.sender_role, 'body', m.body, 'client_id', m.client_id, 'at', m.created_at);
end $f$;

create or replace function public.msg_get_prefs(p_token text default null) returns jsonb
 language plpgsql stable security definer set search_path to '' as $f$
declare a record;
begin select * into a from app_private.msg_actor(p_token); return app_private.msg_prefs(a.o_user, a.o_guest); end $f$;

create or replace function public.msg_set_prefs(p_token text, p_prefs jsonb) returns jsonb
 language plpgsql security definer set search_path to '' as $f$
declare a record; k text; clean jsonb := '{}'::jsonb;
begin
  select * into a from app_private.msg_actor(p_token);
  foreach k in array array['in_app', 'orders', 'replies', 'announcements', 'promos'] loop
    if p_prefs ? k then
      if jsonb_typeof(p_prefs->k) <> 'boolean' then raise exception 'VALIDATION_FAILED: %', k; end if;
      clean := clean || jsonb_build_object(k, p_prefs->k);
    end if;
  end loop;
  if a.o_user is not null then
    insert into public.msg_preferences (user_id) values (a.o_user) on conflict do nothing;
    update public.msg_preferences p set
      in_app = coalesce((clean->>'in_app')::boolean, p.in_app), orders = coalesce((clean->>'orders')::boolean, p.orders),
      replies = coalesce((clean->>'replies')::boolean, p.replies), announcements = coalesce((clean->>'announcements')::boolean, p.announcements),
      promos = coalesce((clean->>'promos')::boolean, p.promos), updated_at = now() where p.user_id = a.o_user;
  else
    update public.msg_guests set prefs = prefs || clean where id = a.o_guest;
  end if;
  return app_private.msg_prefs(a.o_user, a.o_guest);
end $f$;

create or replace function public.msg_claim_guest(p_token text) returns void
 language plpgsql security definer set search_path to '' as $f$
declare u uuid := auth.uid(); g public.msg_guests; gc public.msg_conversations; uc public.msg_conversations;
begin
  if u is null then raise exception 'FORBIDDEN: sign in first'; end if;
  select * into g from public.msg_guests where token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'));
  if g.id is null then return; end if;
  select * into gc from public.msg_conversations where guest_id = g.id;
  if gc.id is not null then
    select * into uc from public.msg_conversations where user_id = u;
    if uc.id is null then
      update public.msg_conversations set user_id = u, guest_id = null where id = gc.id;
    else
      update public.msg_messages set conversation_id = uc.id where conversation_id = gc.id;
      update public.msg_conversations set staff_unread = staff_unread + gc.staff_unread,
        last_message_at = greatest(last_message_at, gc.last_message_at) where id = uc.id;
      delete from public.msg_conversations where id = gc.id;
    end if;
  end if;
  insert into public.msg_preferences (user_id, in_app, orders, replies, announcements, promos)
    select u, coalesce((g.prefs->>'in_app')::boolean, true), coalesce((g.prefs->>'orders')::boolean, true), coalesce((g.prefs->>'replies')::boolean, true),
           coalesce((g.prefs->>'announcements')::boolean, true), coalesce((g.prefs->>'promos')::boolean, true)
    on conflict do nothing;
  insert into public.msg_campaign_reads (campaign_id, reader) select campaign_id, 'u:' || u from public.msg_campaign_reads where reader = 'g:' || g.id on conflict do nothing;
  delete from public.msg_guests where id = g.id;
end $f$;

create or replace function public.msg_staff_overview() returns jsonb
 language plpgsql stable security definer set search_path to '' as $f$
begin
  perform app_private.msg_need('messages.reply');
  return jsonb_build_object(
    'conversations', (select count(*) from public.msg_conversations),
    'unread', (select count(*) from public.msg_conversations where staff_unread > 0),
    'awaiting', (select count(*) from public.msg_conversations where status = 'open' and last_sender = 'customer'),
    'announcements', (select count(*) from public.msg_campaigns where kind = 'alert' and status = 'published' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())),
    'promos', (select count(*) from public.msg_campaigns where kind = 'promo' and status = 'published' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())),
    'drafts', (select count(*) from public.msg_campaigns where status = 'draft'));
end $f$;

create or replace function public.msg_staff_inbox(p_filter text default 'all', p_search text default null, p_limit int default 100) returns jsonb
 language plpgsql stable security definer set search_path to '' as $f$
declare v jsonb; q text := lower(btrim(coalesce(p_search, '')));
begin
  perform app_private.msg_need('messages.reply');
  select coalesce(jsonb_agg(x order by x->>'last_message_at' desc), '[]') into v from (
    select jsonb_build_object('id', c.id, 'name', coalesce(p.full_name, g.display_name, 'Customer'), 'phone', coalesce(p.phone, g.phone),
             'is_guest', c.guest_id is not null, 'preview', c.last_preview, 'last_sender', c.last_sender, 'last_message_at', c.last_message_at,
             'unread', c.staff_unread, 'status', c.status, 'assigned_to', c.assigned_to) x
      from public.msg_conversations c
      left join public.profiles p on p.id = c.user_id
      left join public.msg_guests g on g.id = c.guest_id
     where (p_filter = 'all' or p_filter is null
            or (p_filter = 'unread' and c.staff_unread > 0)
            or (p_filter = 'awaiting' and c.status = 'open' and c.last_sender = 'customer')
            or (p_filter = 'open' and c.status = 'open')
            or (p_filter = 'resolved' and c.status = 'resolved'))
       and (q = '' or position(q in lower(coalesce(p.full_name, g.display_name, ''))) > 0
                   or position(q in lower(coalesce(p.phone, g.phone, ''))) > 0
                   or position(q in lower(c.last_preview)) > 0)
     order by c.last_message_at desc limit least(greatest(coalesce(p_limit, 100), 1), 200)) s;
  return v;
end $f$;

create or replace function public.msg_staff_conversation(p_id uuid) returns jsonb
 language plpgsql security definer set search_path to '' as $f$
declare c public.msg_conversations; v_msgs jsonb; v_orders jsonb := '[]'; v_who jsonb;
begin
  perform app_private.msg_need('messages.reply');
  select * into c from public.msg_conversations where id = p_id;
  if c.id is null then raise exception 'NOT_FOUND: conversation'; end if;
  if c.staff_unread > 0 then update public.msg_conversations set staff_unread = 0 where id = c.id; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'role', m.sender_role, 'body', m.body, 'client_id', m.client_id, 'at', m.created_at) order by m.created_at), '[]')
    into v_msgs from (select * from public.msg_messages where conversation_id = c.id order by created_at desc limit 300) m;
  select jsonb_build_object('name', coalesce(p.full_name, g.display_name, 'Customer'), 'phone', coalesce(p.phone, g.phone), 'is_guest', c.guest_id is not null)
    into v_who from (select 1) d left join public.profiles p on p.id = c.user_id left join public.msg_guests g on g.id = c.guest_id;
  if c.user_id is not null and app_private.has_permission('orders.view') then
    select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'number', o.order_number, 'status', o.status, 'total_paisa', o.total_paisa, 'placed_at', o.placed_at) order by o.placed_at desc), '[]')
      into v_orders from (select * from public.orders where user_id = c.user_id order by placed_at desc limit 5) o;
  end if;
  return jsonb_build_object('id', c.id, 'status', c.status, 'customer', v_who, 'messages', v_msgs, 'orders', v_orders);
end $f$;

create or replace function public.msg_staff_reply(p_id uuid, p_body text, p_client_id uuid) returns jsonb
 language plpgsql security definer set search_path to '' as $f$
declare v_body text := btrim(coalesce(p_body, '')); m public.msg_messages;
begin
  perform app_private.msg_need('messages.reply');
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'VALIDATION_FAILED: body'; end if;
  if not exists (select 1 from public.msg_conversations where id = p_id) then raise exception 'NOT_FOUND: conversation'; end if;
  insert into public.msg_messages (conversation_id, sender_role, sender_user_id, body, client_id)
    values (p_id, 'staff', auth.uid(), v_body, p_client_id)
    on conflict (conversation_id, client_id) do nothing returning * into m;
  if m.id is null then
    select * into m from public.msg_messages where conversation_id = p_id and client_id = p_client_id;
  else
    update public.msg_conversations set last_sender = 'staff', last_preview = left(v_body, 140), last_message_at = m.created_at,
      customer_unread = customer_unread + 1, assigned_to = coalesce(assigned_to, auth.uid()) where id = p_id;
  end if;
  return jsonb_build_object('id', m.id, 'role', m.sender_role, 'body', m.body, 'client_id', m.client_id, 'at', m.created_at);
end $f$;

create or replace function public.msg_staff_set_status(p_id uuid, p_status text) returns void
 language plpgsql security definer set search_path to '' as $f$
begin
  perform app_private.msg_need('messages.reply');
  if p_status not in ('open', 'resolved') then raise exception 'VALIDATION_FAILED: status'; end if;
  update public.msg_conversations set status = p_status where id = p_id;
  if not found then raise exception 'NOT_FOUND: conversation'; end if;
end $f$;

create or replace function public.msg_staff_campaigns() returns jsonb
 language plpgsql stable security definer set search_path to '' as $f$
declare v jsonb;
begin
  perform app_private.msg_need('messages.manage');
  select coalesce(jsonb_agg(to_jsonb(c) - 'created_by' order by c.updated_at desc), '[]') into v from public.msg_campaigns c;
  return v;
end $f$;

create or replace function public.msg_audience_count(p_audience text) returns int
 language plpgsql stable security definer set search_path to '' as $f$
declare u int; g int;
begin
  perform app_private.msg_need('messages.manage');
  select count(*) into u from public.profiles;
  select count(*) into g from public.msg_guests where last_seen_at > now() - interval '180 days';
  return case p_audience when 'signed_in' then u when 'guests' then g else u + g end;
end $f$;

create or replace function public.msg_save_campaign(p_id uuid, p_data jsonb) returns uuid
 language plpgsql security definer set search_path to '' as $f$
declare v_id uuid := p_id; cur public.msg_campaigns;
  d_title text := nullif(btrim(p_data->>'title'), ''); d_body text := nullif(btrim(p_data->>'body'), '');
  d_starts timestamptz := nullif(p_data->>'starts_at', '')::timestamptz; d_ends timestamptz := nullif(p_data->>'ends_at', '')::timestamptz;
begin
  perform app_private.msg_need('messages.manage');
  if d_title is null or d_body is null then raise exception 'VALIDATION_FAILED: title and message are required'; end if;
  if (p_data->>'kind') not in ('alert', 'promo') or (p_data->>'audience') not in ('all', 'signed_in', 'guests') then raise exception 'VALIDATION_FAILED: kind or audience'; end if;
  if d_starts is not null and d_ends is not null and d_ends <= d_starts then raise exception 'VALIDATION_FAILED: end must be after start'; end if;
  if v_id is not null then
    select * into cur from public.msg_campaigns where id = v_id for update;
    if cur.id is null then raise exception 'NOT_FOUND: campaign'; end if;
    if cur.status <> 'draft' then raise exception 'INVALID_TRANSITION: only drafts can be edited'; end if;
    update public.msg_campaigns set kind = p_data->>'kind', title = d_title, body = d_body, title_ne = nullif(btrim(p_data->>'title_ne'), ''),
      body_ne = nullif(btrim(p_data->>'body_ne'), ''), image_path = nullif(p_data->>'image_path', ''), cta_label = nullif(btrim(p_data->>'cta_label'), ''),
      cta_label_ne = nullif(btrim(p_data->>'cta_label_ne'), ''), cta_url = nullif(btrim(p_data->>'cta_url'), ''), audience = p_data->>'audience',
      starts_at = d_starts, ends_at = d_ends, updated_at = now() where id = v_id;
  else
    insert into public.msg_campaigns (kind, title, body, title_ne, body_ne, image_path, cta_label, cta_label_ne, cta_url, audience, starts_at, ends_at, created_by)
    values (p_data->>'kind', d_title, d_body, nullif(btrim(p_data->>'title_ne'), ''), nullif(btrim(p_data->>'body_ne'), ''), nullif(p_data->>'image_path', ''),
      nullif(btrim(p_data->>'cta_label'), ''), nullif(btrim(p_data->>'cta_label_ne'), ''), nullif(btrim(p_data->>'cta_url'), ''), p_data->>'audience', d_starts, d_ends, auth.uid())
    returning id into v_id;
  end if;
  return v_id;
end $f$;

create or replace function public.msg_set_campaign_status(p_id uuid, p_status text) returns int
 language plpgsql security definer set search_path to '' as $f$
declare cur public.msg_campaigns;
begin
  perform app_private.msg_need('messages.manage');
  select * into cur from public.msg_campaigns where id = p_id for update;
  if cur.id is null then raise exception 'NOT_FOUND: campaign'; end if;
  if p_status = 'published' then
    if cur.status = 'published' then return public.msg_audience_count(cur.audience); end if;
    if cur.ends_at is not null and cur.ends_at <= now() then raise exception 'VALIDATION_FAILED: already expired'; end if;
    update public.msg_campaigns set status = 'published', published_at = now(), updated_at = now() where id = p_id;
  elsif p_status = 'archived' then
    update public.msg_campaigns set status = 'archived', updated_at = now() where id = p_id;
  elsif p_status = 'draft' then
    update public.msg_campaigns set status = 'draft', updated_at = now() where id = p_id;
  else raise exception 'VALIDATION_FAILED: status'; end if;
  return public.msg_audience_count(cur.audience);
end $f$;

create or replace function public.msg_delete_campaign(p_id uuid) returns void
 language plpgsql security definer set search_path to '' as $f$
begin
  perform app_private.msg_need('messages.manage');
  delete from public.msg_campaigns where id = p_id and status = 'draft';
  if not found then raise exception 'INVALID_TRANSITION: only drafts can be deleted'; end if;
end $f$;

revoke execute on function app_private.msg_actor(text), app_private.msg_reader(uuid, uuid), app_private.msg_prefs(uuid, uuid),
  app_private.msg_need(text), app_private.msg_live_campaigns(uuid), app_private.msg_on_order_event() from public, anon, authenticated;
revoke execute on function public.msg_guest_start(text, text), public.msg_me(text), public.msg_unread(text), public.msg_feed(text, text, int),
  public.msg_mark_read(text, text, uuid), public.msg_mark_all_read(text, text), public.msg_conversation(text), public.msg_send(text, text, uuid),
  public.msg_get_prefs(text), public.msg_set_prefs(text, jsonb), public.msg_claim_guest(text) from public;
grant execute on function public.msg_guest_start(text, text), public.msg_me(text), public.msg_unread(text), public.msg_feed(text, text, int),
  public.msg_mark_read(text, text, uuid), public.msg_mark_all_read(text, text), public.msg_conversation(text), public.msg_send(text, text, uuid),
  public.msg_get_prefs(text), public.msg_set_prefs(text, jsonb) to anon, authenticated;
grant execute on function public.msg_claim_guest(text) to authenticated;
revoke execute on function public.msg_staff_overview(), public.msg_staff_inbox(text, text, int), public.msg_staff_conversation(uuid),
  public.msg_staff_reply(uuid, text, uuid), public.msg_staff_set_status(uuid, text), public.msg_staff_campaigns(), public.msg_save_campaign(uuid, jsonb),
  public.msg_set_campaign_status(uuid, text), public.msg_delete_campaign(uuid), public.msg_audience_count(text) from public, anon;
grant execute on function public.msg_staff_overview(), public.msg_staff_inbox(text, text, int), public.msg_staff_conversation(uuid),
  public.msg_staff_reply(uuid, text, uuid), public.msg_staff_set_status(uuid, text), public.msg_staff_campaigns(), public.msg_save_campaign(uuid, jsonb),
  public.msg_set_campaign_status(uuid, text), public.msg_delete_campaign(uuid), public.msg_audience_count(text) to authenticated;

drop policy if exists "staff upload message images" on storage.objects;
create policy "staff upload message images" on storage.objects for insert to authenticated
  with check (bucket_id = 'store-assets' and name like 'messages/%' and app_private.has_permission('messages.manage'));
drop policy if exists "staff delete message images" on storage.objects;
create policy "staff delete message images" on storage.objects for delete to authenticated
  using (bucket_id = 'store-assets' and name like 'messages/%' and app_private.has_permission('messages.manage'));
