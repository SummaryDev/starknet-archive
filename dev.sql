-- drop table argument;
-- drop table input;
-- drop table event;
-- drop table transaction;
-- drop table block;

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