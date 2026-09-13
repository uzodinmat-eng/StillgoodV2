-- Store access and auditable withdrawal fee support.
alter table public.stores add column if not exists password_hash text;
alter table public.store_withdrawals add column if not exists gross_amount integer;
alter table public.store_withdrawals add column if not exists fee_amount integer not null default 0;
alter table public.store_withdrawals add column if not exists net_amount integer;

create or replace function public.reserve_store_withdrawal(p_store_id text, p_amount integer, p_withdrawal_id text, p_recipient_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_available integer; v_fee integer; v_net integer;
begin
  v_fee := least(5000, greatest(0, round(p_amount * 0.01)));
  v_net := p_amount - v_fee;
  select coalesce(sum(amount), 0) into v_available from public.ledger_entries where wallet_id = 'wallet_store_available_' || p_store_id;
  if p_amount <= 0 or p_amount > v_available then raise exception 'Withdrawal exceeds available balance'; end if;
  insert into public.store_withdrawals (id, store_id, amount, gross_amount, fee_amount, net_amount, recipient_code)
    values (p_withdrawal_id, p_store_id, p_amount, p_amount, v_fee, v_net, p_recipient_code)
    on conflict (id) do nothing;
  insert into public.ledger_entries (txn_id, wallet_id, amount, kind, ref_type, ref_id, note)
    values ('txn_withdrawal_' || p_withdrawal_id, 'wallet_store_available_' || p_store_id, -p_amount, 'withdrawal', 'store_withdrawal', p_withdrawal_id, 'Gross Paystack withdrawal reserved'),
           ('txn_withdrawal_fee_' || p_withdrawal_id, 'wallet_platform', v_fee, 'withdrawal_fee', 'store_withdrawal', p_withdrawal_id, '1% store withdrawal fee')
    on conflict (txn_id, wallet_id, kind) do nothing;
end; $$;
