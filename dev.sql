-- drop table argument;
-- drop table input;
-- drop table event;
-- drop table transaction;
-- drop table block;

-- drop table raw_block;
-- drop table raw_abi;

select * from argument;
select * from input;
select * from event;
select * from transaction;
select * from block;

select * from raw_block;
select * from raw_abi;
select * from raw_view;

select count(*) from argument;
select count(*) from input;
select count(*) from event;
select count(*) from transaction;
select count(*) from block;

select count(*) from raw_block;
select count(*) from raw_abi;
select count(*) from raw_view;

SELECT reltuples AS argument FROM pg_class where relname = 'argument';
SELECT reltuples AS input FROM pg_class where relname = 'input';
SELECT reltuples AS event FROM pg_class where relname = 'event';
SELECT reltuples AS transaction FROM pg_class where relname = 'transaction';
SELECT reltuples AS block FROM pg_class where relname = 'block';
SELECT reltuples AS raw_block FROM pg_class where relname = 'raw_block';
SELECT reltuples AS raw_abi FROM pg_class where relname = 'raw_abi';
SELECT reltuples AS raw_view FROM pg_class where relname = 'raw_view';

select distinct function from transaction;

select t.function, count(t.function) as ct from transaction t group by t.function order by ct desc;

select * from transaction t where t.function = 'anonymous' order by block_number asc;

select distinct contract_address, entry_point_selector, transaction_hash from transaction t where t.function = 'anonymous';

SELECT  block_number + 1
FROM    block mo
WHERE   NOT EXISTS
(
    SELECT  NULL
    FROM    block mi
    WHERE   mi.block_number = mo.block_number + 1
)
ORDER BY
  block_number
LIMIT 1;


CREATE INDEX transaction_blockBlockNumber_index ON public.transaction ("blockBlockNumber");
CREATE INDEX transaction_contract_address_function_index ON public.transaction (contract_address, function);
CREATE INDEX transaction_contract_address_index ON public.transaction (contract_address);

CREATE INDEX event_transactionTransactionHash_index ON public.event ("transactionTransactionHash");
CREATE INDEX event_name_transmitter_contract_index ON public.event (name, transmitter_contract);
CREATE INDEX event_transmitter_contract_index ON public.event (transmitter_contract);

CREATE INDEX input_transactionTransactionHash_index ON public.input ("transactionTransactionHash");

CREATE INDEX argument_eventId_index ON public.argument ("eventId");


select distinct transmitter_contract from event where name = 'Transfer';

select * from argument as a, event as e where e.transmitter_contract = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8' and a."eventId" = e.id;

select distinct e.name from event as e where e.transmitter_contract = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8';

select distinct e.name from event as e where e.transmitter_contract = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921';

select * from argument as a, event as e where e.transmitter_contract = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921' and a."eventId" = e.id;

select * from argument as a, event as e, transaction as t, block as b where e.transmitter_contract = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921' and a."eventId" = e.id and e.name ilike '%upgrade%' and e."transactionTransactionHash" = t.transaction_hash and t."blockBlockNumber" = b.block_number;

select * from block;

SELECT "i"."id" AS "i_id", "i"."name" AS "i_name", "i"."type" AS "i_type", "i"."value" AS "i_value", "i"."transaction_hash" AS "i_transaction_hash" FROM "input" "i"
  LEFT JOIN "transaction" "t" ON "t"."transaction_hash"="i"."transaction_hash"
  LEFT JOIN "block" "b" ON "b"."block_number"="t"."block_number"
WHERE "b"."block_number" <= 62135
      AND "t"."contract_address" = '0x1317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e'
      AND "t"."type" = 'DEPLOY'
      AND "i"."name" ilike '%implement%'
      AND "i"."type" = 'felt'
ORDER BY "b"."block_number" DESC LIMIT 1

select distinct function from transaction;

select t.function, count(t.function) as ct from transaction t group by t.function;

select * from transaction t where t.function = 'anonymous' order by block_number asc;

select distinct entry_point_selector from transaction t where t.function = 'anonymous';

SELECT current_user;

drop database test;

create database test with template dev owner 'postgres';

select t.function, count(t.function) as ct from transaction t group by t.function order by ct desc;

select * from transaction t where t.function = 'anonymous' order by block_number asc;

select distinct contract_address, entry_point_selector, transaction_hash from transaction t where t.function = 'anonymous';

select distinct contract_address, entry_point_selector from transaction t where t.function = 'anonymous';

select distinct entry_point_selector from transaction t where t.function = 'anonymous';

ALTER TABLE public.raw_abi ALTER COLUMN raw DROP NOT NULL;

create recursive view daily_mint(amount0, dt) as
select sum(a.decimal) as sum, (to_timestamp((b."timestamp")))::date AS dt
from argument a left join event e on a.event_id = e.id left join transaction t on e.transaction_hash = t.transaction_hash left join block b on t.block_number = b.block_number
where e.transmitter_contract = '0x4b05cce270364e2e4bf65bde3e9429b50c97ea3443b133442f838045f41e733' and e.name = 'Mint' and a.name = 'amount0'
group by dt order by dt desc;

create recursive view daily_transactions (count, date) as
select count(t.transaction_hash), to_timestamp(b.timestamp)::date as dt from transaction as t
left join block b on t.block_number = b.block_number
group by dt order by dt desc;

select * from daily_transactions;

create recursive view top_functions (function, ct) as
select t.function, count(t.function) ct from transaction t group by t.function order by ct desc;

select * from top_functions;

select distinct type from input;

select i.name, i.value, t.contract_address, t.function from input i left join transaction t on i.transaction_hash = t.transaction_hash where i.type = 'IndexAndValues';

drop view argument_view;

select (to_timestamp((b."timestamp")))::date AS dt, a.name, sum(a.decimal) as sum
from argument a left join event e on a.event_id = e.id left join transaction t on e.transaction_hash = t.transaction_hash left join block b on t.block_number = b.block_number
where e.transmitter_contract = '0x4b05cce270364e2e4bf65bde3e9429b50c97ea3443b133442f838045f41e733' and e.name = 'Mint' and (a.name = 'amount0' or a.name = 'amount1')
group by dt, a.name
order by dt desc;

-- top anonymous contracts
select count(*) ct, contract_address from transaction where function = 'anonymous' group by contract_address order by ct desc;
-- top anonymous functions
select count(*) ct, contract_address, entry_point_selector from transaction where function = 'anonymous' group by contract_address, entry_point_selector order by ct desc;
-- top anonymous events
select count(*) ct, transmitter_contract from event where name = 'anonymous' group by transmitter_contract order by ct desc;

-- view functions that may return implementation
select distinct e->>'name' from (select jsonb_array_elements(raw) e from raw_abi where raw <> '{}' and raw is not null) as e where e->>'type' = 'function' and e->>'stateMutability' = 'view' and e->>'name' ilike '%implement%';

select * from raw_abi where raw::text like '%get_implementation_class_hash%';

select * from raw_abi where raw::text like '%implementation_time%';

select * from raw_abi where raw::text like '%oracle_implementation%';

select * from raw_abi where raw::text like '%getImplementationHash%';

SELECT "a"."id" AS "a_id", "a"."name" AS "a_name", "a"."type" AS "a_type", "a"."value" AS "a_value", "a"."decimal" AS "a_decimal", "a"."event_id" AS "a_event_id" FROM "argument" "a" LEFT JOIN "event" "e" ON "e"."id"="a"."event_id"  LEFT JOIN "transaction" "t" ON "t"."transaction_hash"="e"."transaction_hash"  LEFT JOIN "block" "b" ON "b"."block_number"="t"."block_number" WHERE "b"."block_number" <= 266476 AND "e"."transmitter_contract" = '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7' AND "e"."name" = 'implementation_upgraded' AND "a"."name" ilike '%implement%' AND "a"."type" = 'felt' ORDER BY "b"."block_number" DESC LIMIT 1 -- PARAMETERS: [266476,"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","implementation_upgraded","%implement%","felt"]

SELECT "a"."id" AS "a_id", "a"."name" AS "a_name", "a"."type" AS "a_type", "a"."value" AS "a_value", "a"."decimal" AS "a_decimal", "a"."event_id" AS "a_event_id" FROM "argument" "a" LEFT JOIN "event" "e" ON "e"."id"="a"."event_id"  LEFT JOIN "transaction" "t" ON "t"."transaction_hash"="e"."transaction_hash"  LEFT JOIN "block" "b" ON "b"."block_number"="t"."block_number" WHERE "b"."block_number" <= 266476 AND "e"."transmitter_contract" = '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7' AND "e"."name" = 'implementation_upgraded' AND "a"."name" ilike '%implement%' AND "a"."type" = 'felt' ORDER BY "b"."block_number" DESC

select * from event where name = 'Mint';

CREATE EXTENSION IF NOT EXISTS tablefunc;

select a.event_id, a.name, a.value from argument a left join event e on a.event_id = e.id where e.name = 'Mint' and e.transmitter_contract = '0x13386f165f065115c1da38d755be261023c32f0134a03a8e66b6bb1e0016014' order by 1, 2 desc limit 30;

select a.event_id, a.name, (case when (a.name = 'sender') then a.value::text else a.decimal::text end) from argument a left join event e on a.event_id = e.id where e.name = 'Mint' and e.transmitter_contract = '0x13386f165f065115c1da38d755be261023c32f0134a03a8e66b6bb1e0016014' order by 1, 2 desc limit 30;

select * from crosstab('select a.event_id, a.name, a.decimal from argument a left join event e on a.event_id = e.id where e.name = ''Mint'' and e.transmitter_contract = ''0x13386f165f065115c1da38d755be261023c32f0134a03a8e66b6bb1e0016014'' order by 1, 2 desc limit 300')
as ct (event_id int, sender numeric, amount0 numeric, amount1 numeric);

select * from crosstab('select a.event_id, a.name, a.decimal from argument a left join event e on a.event_id = e.id where e.name = ''Mint'' and e.transmitter_contract = ''0x13386f165f065115c1da38d755be261023c32f0134a03a8e66b6bb1e0016014'' order by 1, 2 desc')
as ct (event_id int, sender numeric, amount0 numeric, amount1 numeric);

select min(block_number) from block;

create database test3;

select block_number, to_timestamp(timestamp)::timestamp without time zone as timestamp from block where timestamp between '2022-07-30 00:00:00+00'::timestamp and '2022-07-31 00:00:00+00'::timestamp order by block_number desc limit 10;

 SELECT '2011-01-01 00:00:00+03'::TIMESTAMP


with block_number_timestamp as (select b.block_number, to_timestamp(b.timestamp)::timestamp as t from block b) select * from block_number_timestamp where t > '2022-08-01 00:00:00'::timestamp and t < '2022-08-01 01:00:00'::timestamp order by block_number desc;

with block_number_timestamp as (select b.block_number, to_timestamp(b.timestamp)::timestamp as t from block b order by b.block_number desc limit 10) select * from block_number_timestamp;

select b.block_number, to_timestamp(b.timestamp)::timestamp as t from block b order by b.block_number desc limit 10;




