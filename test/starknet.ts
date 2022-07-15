import { DeployTransaction, defaultProvider } from 'starknet'
import JSON = require("json5")

function log(o: any) {
  console.log(JSON.stringify(o, null, 2))
}

describe('starknet', function () {
  this.timeout(6000000)

  it('gets a transaction', async () => {
    const txHash = '0x53facbf470346c7e21452e5b8ef4c2b210547f9463b00b73b8a16e8daa5e58c'

    const getTransactionResponse = await defaultProvider.getTransaction(txHash)
    const blockNumber = getTransactionResponse.block_number as number
    const tx = getTransactionResponse.transaction  as DeployTransaction
    log(tx)
  })

  it('gets abi', async () => {
    const contractAddress = '0x1317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e'
    const blockNumber = 200000

    const getCodeResponse = await defaultProvider.getCode(contractAddress, blockNumber)
    const abi = getCodeResponse.abi
    log(abi)
  })

  xit('finds a block with events', async () => {
    let found;
    for (let blockNumber = 100000; blockNumber < 100100; blockNumber++) {
      const block = await defaultProvider.getBlock(blockNumber) as any;

      for (let txIndex = 0; txIndex < block.transaction_receipts.length; txIndex++) {
        const tx = block.transaction_receipts[txIndex];
        console.log(`${blockNumber} ${txIndex} ${tx.transaction_hash} ${tx.events}`);
        if (tx.events.length > 0) {
          found = tx.events;
          break;
        }
      }

      if (found) {
        break;
      }
    }
    log(found);
  });

});