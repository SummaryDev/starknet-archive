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

