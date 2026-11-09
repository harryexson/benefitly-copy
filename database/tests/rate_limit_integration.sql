-- Integration tests for migration 0022: the shared rate limiter. Run as `benefitly_app`.
-- Prints "RATE LIMIT INTEGRATION TESTS PASSED" on success.
\set ON_ERROR_STOP on
\pset pager off

select public.rate_limit_hit('test-bucket-a', 2, 3600) as first_allowed;
select public.rate_limit_hit('test-bucket-a', 2, 3600) as second_allowed;
select public.rate_limit_hit('test-bucket-a', 2, 3600) as third_refused;
select public.rate_limit_hit('test-bucket-b', 2, 3600) as other_bucket_unaffected;

do $$ begin
  perform public.rate_limit_hit('test-bucket-c', 0, 60);
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if sqlerrm not like '%invalid rate limit%' then raise exception 'wrong failure: %', sqlerrm; end if;
end $$;

do $$ begin
  perform * from public.rate_limit_buckets;
  raise exception 'EXPECTED FAILURE NOT RAISED';
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
end $$;

select 'RATE LIMIT INTEGRATION TESTS PASSED' as final_result;
