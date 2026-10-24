
revoke execute on function public.transition_order(uuid,text,text,text) from public, anon;
grant execute on function public.transition_order(uuid,text,text,text) to authenticated;
alter function app_private.touch_updated_at() set search_path = '';
alter function app_private.block_mutation() set search_path = '';
alter function app_private.role_permissions(text) set search_path = '';
alter function app_private.order_transition_allowed(text,text) set search_path = '';
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
alter extension citext set schema extensions;
