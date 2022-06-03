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

select count(*) from argument;
select count(*) from input;
select count(*) from event;
select count(*) from transaction;
select count(*) from block;

select count(*) from block where block_number <= 210000;

-- select * from block where block_number < 140010;

SELECT reltuples AS argument FROM pg_class where relname = 'argument';
SELECT reltuples AS input FROM pg_class where relname = 'input';
SELECT reltuples AS event FROM pg_class where relname = 'event';
SELECT reltuples AS transaction FROM pg_class where relname = 'transaction';
SELECT reltuples AS block FROM pg_class where relname = 'block';


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