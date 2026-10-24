
create extension if not exists pg_cron;
create or replace function public.purge_expired_data() returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.carts where guest_token_hash is not null and updated_at < now() - interval '30 days';
  delete from public.rate_limit_hits where window_start < now() - interval '24 hours';
  delete from public.notification_events where status in ('sent','dead') and created_at < now() - interval '90 days';
  delete from public.push_subscriptions where revoked_at is not null and revoked_at < now() - interval '7 days';
end $$;
revoke execute on function public.purge_expired_data() from public, anon, authenticated;
select cron.schedule('release-expired-orders', '*/5 * * * *', 'select public.release_expired_orders()');
select cron.schedule('purge-expired-data', '17 * * * *', 'select public.purge_expired_data()');
