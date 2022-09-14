import { MockAbiProvider } from "../src/providers/abi/mock"
import { OnlineAbiProvider } from "../src/providers/abi/online"
import { TransactionCallOrganizer } from "../src/organizers/transaction-call"
import { ContractCallOrganizer } from "../src/organizers/contract-call"
import { Abi, Block, TransactionReceipt, InvokeFunctionTransaction, DeployTransaction } from "../src/types/raw-starknet"
import { getFullSelector } from "../src/helpers/helpers"
import assert = require("node:assert")
// import JSON = require("json5")
import * as console from "../src/helpers/console";
import {ComboApiProvider} from "../src/providers/api/combo";

function log(o: any) {
  console.log(JSON.stringify(o, null, 2))
}

const pathfinderUrl = 'http://54.80.141.84:9545'/*'https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a'*/
const network = 'goerli-alpha'

const apiProvider = new ComboApiProvider(pathfinderUrl, network)

describe('organizers', function () {
  this.timeout(6000000)

  describe('TransactionCallOrganizer', async () => {

    it('getFullSelector', async() => {
      log(getFullSelector('Upgraded'))
      log(getFullSelector('upgraded'))
      log(getFullSelector('account_initialized'))
    })

    it('organizeConstructorFunction', async () => {
      const txHash = '0x53facbf470346c7e21452e5b8ef4c2b210547f9463b00b73b8a16e8daa5e58c'
      const blockNumber = 62135

      const tx = await apiProvider.getTransaction(txHash) as DeployTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedFunction = await transactionCallOrganizer.organizeConstructorFunction(tx, blockNumber)

      log(organizedFunction)

      assert.deepEqual(organizedFunction, JSON.parse('{"name":"constructor","inputs":[{"name":"admin","type":"felt","value":"0x6043ed114a9a1987fe65b100d0da46fe71b2470e7e5ff8bf91be5346f5e5e3"},{"name":"implementation_address","type":"felt","value":"0x74db315cc7e1e821dfd229890068ea197594ac3e29fa0038dc12704f63ebb83"}]}'))
    })

    it('organizeFunction with input a struct whose properties are also structs', async () => {
      const txHash = '0x45564463661ab4da01e11593ab461b405db3489d2e0699b1a56db8809e3d57e'
      const blockNumber = 171140

      const tx = await apiProvider.getTransaction(txHash) as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      assert.deepEqual(organizedFunction, JSON.parse('{"name":"fill_order","inputs":[{"name":"buy_order","type":"ZZ_Message","value":{"message_prefix":"0x537461726b4e6574204d657373616765","domain_prefix":{"name":"0x7a69677a61672e65786368616e6765","version":"0x1","chain_id":"0x534e5f474f45524c49"},"sender":"0xe9bf0d1245a45b159ecafcb612aa2bf5c4de080970b4cb68e7788c326d0e76","order":{"base_asset":"0x5c35af748884f62eb46acdfa38bc09af527d7fcf46cc8296d3768540d5fa1dc","quote_asset":"0x7e9148256552d13721c8a2af43f6e14449277e4fd8b123af866037bbc74f6cf","side":"0x0","base_quantity":"0xddb6480c5d05b90","price":{"numerator":"0x11c0dccd","denominator":"0x186a0"},"expiration":"0x267254cadc"},"sig_r":"0x4f28ba9f1fc5f6b37284fc2d3e67ecf82d30b05d657c51db944e4e6bfe11cb3","sig_s":"0x29d89a503ad7402b9e9cae57a1b06e0ab356f9d2718910c8580e09e27bc0f87"}},{"name":"sell_order","type":"ZZ_Message","value":{"message_prefix":"0x537461726b4e6574204d657373616765","domain_prefix":{"name":"0x7a69677a61672e65786368616e6765","version":"0x1","chain_id":"0x534e5f474f45524c49"},"sender":"0x28326f49bc8f3cbae1308d4bad7c8986bf9d54ce9feee7fdc247a362956a4a8","order":{"base_asset":"0x5c35af748884f62eb46acdfa38bc09af527d7fcf46cc8296d3768540d5fa1dc","quote_asset":"0x7e9148256552d13721c8a2af43f6e14449277e4fd8b123af866037bbc74f6cf","side":"0x1","base_quantity":"0x8ac7230489e80000","price":{"numerator":"0xb1447ec1","denominator":"0xf4240"},"expiration":"0x26745d73bf"},"sig_r":"0x6c96ef196050bfdcd5e72a486c320b9d36f87c79f19998d17bd0bbf5001ef24","sig_s":"0x1967d4124ac10787b8d8017371041e101c8e7bf9ed38f7f9128e1bf5083610"}},{"name":"fill_price","type":"PriceRatio","value":{"numerator":"0xb1447ec1","denominator":"0xf4240"}},{"name":"base_fill_quantity","type":"felt","value":"0xddb6480c5d05b80"}]}'))

      /*
      https://starktx.info/testnet/0x45564463661ab4da01e11593ab461b405db3489d2e0699b1a56db8809e3d57e/

      0x2aa8af6f.fill_order(
      buy_order={
        message_prefix=110930206544689809660069706067448260453,
        domain_prefix={
          name=635598068125295627618390822041315173,
          version=1,
          chain_id=1536727068981429685321
        },
        sender=0xe9bf0d1245a45b159ecafcb612aa2bf5c4de080970b4cb68e7788c326d0e76,
        order={
          base_asset=0x5c35af748884f62eb46acdfa38bc09af527d7fcf46cc8296d3768540d5fa1dc,
          quote_asset=0x7e9148256552d13721c8a2af43f6e14449277e4fd8b123af866037bbc74f6cf,
          side=0,
          base_quantity=998502246630054800,
          price={
            numerator=297852109,
            denominator=100000
          },
          expiration=165126916828
        },
        sig_r=0x4f28ba9f1fc5f6b37284fc2d3e67ecf82d30b05d657c51db944e4e6bfe11cb3,
        sig_s=0x29d89a503ad7402b9e9cae57a1b06e0ab356f9d2718910c8580e09e27bc0f87
      },
      sell_order={
        message_prefix=110930206544689809660069706067448260453,
        domain_prefix={
          name=635598068125295627618390822041315173,
          version=1,
          chain_id=1536727068981429685321
        },
        sender=0x28326f49bc8f3cbae1308d4bad7c8986bf9d54ce9feee7fdc247a362956a4a8,
        order={
          base_asset=0x5c35af748884f62eb46acdfa38bc09af527d7fcf46cc8296d3768540d5fa1dc,
          quote_asset=0x7e9148256552d13721c8a2af43f6e14449277e4fd8b123af866037bbc74f6cf,
          side=1,
          base_quantity=10000000000000000000,
          price={
            numerator=2974056129,
            denominator=1000000
          },
          expiration=165161038783
        },
        sig_r=0x6c96ef196050bfdcd5e72a486c320b9d36f87c79f19998d17bd0bbf5001ef24,
        sig_s=0x1967d4124ac10787b8d8017371041e101c8e7bf9ed38f7f9128e1bf5083610
      },
      fill_price={
        numerator=2974056129,
        denominator=1000000
      },
      base_fill_quantity=998502246630054784
      ) => ()

      {
        "contract_address": "0x2aa8af6fb8e6ab7d07ad94d0b3b9bb6010fe7258b8d23eced19ba0ccbb68d1a",
        "entry_point_selector": "0x254ca97d6180424d717147781144b3875e0b2c2d63314b1c1c85535da592d0d",
        "entry_point_type": "EXTERNAL",
        "calldata": [
          "0x537461726b4e6574204d657373616765",
          "0x7a69677a61672e65786368616e6765",
          "0x1",
          "0x534e5f474f45524c49",
          "0xe9bf0d1245a45b159ecafcb612aa2bf5c4de080970b4cb68e7788c326d0e76",
          "0x5c35af748884f62eb46acdfa38bc09af527d7fcf46cc8296d3768540d5fa1dc",
          "0x7e9148256552d13721c8a2af43f6e14449277e4fd8b123af866037bbc74f6cf",
          "0x0",
          "0xddb6480c5d05b90",
          "0x11c0dccd",
          "0x186a0",
          "0x267254cadc",
          "0x4f28ba9f1fc5f6b37284fc2d3e67ecf82d30b05d657c51db944e4e6bfe11cb3",
          "0x29d89a503ad7402b9e9cae57a1b06e0ab356f9d2718910c8580e09e27bc0f87",
          "0x537461726b4e6574204d657373616765",
          "0x7a69677a61672e65786368616e6765",
          "0x1",
          "0x534e5f474f45524c49",
          "0x28326f49bc8f3cbae1308d4bad7c8986bf9d54ce9feee7fdc247a362956a4a8",
          "0x5c35af748884f62eb46acdfa38bc09af527d7fcf46cc8296d3768540d5fa1dc",
          "0x7e9148256552d13721c8a2af43f6e14449277e4fd8b123af866037bbc74f6cf",
          "0x1",
          "0x8ac7230489e80000",
          "0xb1447ec1",
          "0xf4240",
          "0x26745d73bf",
          "0x6c96ef196050bfdcd5e72a486c320b9d36f87c79f19998d17bd0bbf5001ef24",
          "0x1967d4124ac10787b8d8017371041e101c8e7bf9ed38f7f9128e1bf5083610",
          "0xb1447ec1",
          "0xf4240",
          "0xddb6480c5d05b80"
        ],
        "signature": [],
        "transaction_hash": "0x45564463661ab4da01e11593ab461b405db3489d2e0699b1a56db8809e3d57e",
        "max_fee": "0x0",
        "type": "INVOKE_FUNCTION"
      }
      {
        "name": "fill_order",
        "inputs": [
          {
            "name": "buy_order",
            "type": "ZZ_Message",
            "value": {
              "message_prefix": "0x537461726b4e6574204d657373616765",
              "domain_prefix": {
                "name": "0x7a69677a61672e65786368616e6765",
                "version": "0x1",
                "chain_id": "0x534e5f474f45524c49"
              },
              "sender": "0xe9bf0d1245a45b159ecafcb612aa2bf5c4de080970b4cb68e7788c326d0e76",
              "order": {
                "base_asset": "0x5c35af748884f62eb46acdfa38bc09af527d7fcf46cc8296d3768540d5fa1dc",
                "quote_asset": "0x7e9148256552d13721c8a2af43f6e14449277e4fd8b123af866037bbc74f6cf",
                "side": "0x0",
                "base_quantity": "0xddb6480c5d05b90",
                "price": {
                  "numerator": "0x11c0dccd",
                  "denominator": "0x186a0"
                },
                "expiration": "0x267254cadc"
              },
              "sig_r": "0x4f28ba9f1fc5f6b37284fc2d3e67ecf82d30b05d657c51db944e4e6bfe11cb3",
              "sig_s": "0x29d89a503ad7402b9e9cae57a1b06e0ab356f9d2718910c8580e09e27bc0f87"
            }
          },
          {
            "name": "sell_order",
            "type": "ZZ_Message",
            "value": {
              "message_prefix": "0x537461726b4e6574204d657373616765",
              "domain_prefix": {
                "name": "0x7a69677a61672e65786368616e6765",
                "version": "0x1",
                "chain_id": "0x534e5f474f45524c49"
              },
              "sender": "0x28326f49bc8f3cbae1308d4bad7c8986bf9d54ce9feee7fdc247a362956a4a8",
              "order": {
                "base_asset": "0x5c35af748884f62eb46acdfa38bc09af527d7fcf46cc8296d3768540d5fa1dc",
                "quote_asset": "0x7e9148256552d13721c8a2af43f6e14449277e4fd8b123af866037bbc74f6cf",
                "side": "0x1",
                "base_quantity": "0x8ac7230489e80000",
                "price": {
                  "numerator": "0xb1447ec1",
                  "denominator": "0xf4240"
                },
                "expiration": "0x26745d73bf"
              },
              "sig_r": "0x6c96ef196050bfdcd5e72a486c320b9d36f87c79f19998d17bd0bbf5001ef24",
              "sig_s": "0x1967d4124ac10787b8d8017371041e101c8e7bf9ed38f7f9128e1bf5083610"
            }
          },
          {
            "name": "fill_price",
            "type": "PriceRatio",
            "value": {
              "numerator": "0xb1447ec1",
              "denominator": "0xf4240"
            }
          },
          {
            "name": "base_fill_quantity",
            "type": "felt",
            "value": "0xddb6480c5d05b80"
          }
        ]
      }
       */
    })

    it('organizeFunction with no inputs in the abi', async () => {
      const txHash = '0x5cd6501c2ea648ed414855f26a0be2b68d120051d45d91198afd03f226bf1cd'
      const blockNumber = 160690

      const tx = await apiProvider.getTransaction(txHash) as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      /*
      note this fails with 500 possibly due to this error
      https://starktx.info/testnet/0x5cd6501c2ea648ed414855f26a0be2b68d120051d45d91198afd03f226bf1cd/

      {
        "contract_address": "0x4e92c47465af2761ee3c182faac48294b76a612832420db62d2c32007208b48",
        "entry_point_selector": "0x7a44dde9fea32737a5cf3f9683b3235138654aa2d189f6fe44af37a61dc60d",
        "entry_point_type": "EXTERNAL",
        "calldata": [],
        "signature": [],
        "transaction_hash": "0x5cd6501c2ea648ed414855f26a0be2b68d120051d45d91198afd03f226bf1cd",
        "max_fee": "0x0",
        "type": "INVOKE_FUNCTION"
      }
      {
        "name": "increment",
        "type": "function",
        "outputs": [
          {
            "name": "count",
            "type": "felt"
          }
        ]
      }
      {
        "name": "increment"
      }
       */
    })

    // xit('getCalldataPerCallFromTx', async () => {
    //   const txHash = '0x2e9d400084b55cb7b4f8517567f141aaa9334f64a3061f39e98069e7dd47707'
    //
    //   const getTransactionResponse = await defaultProvider.getTransaction(txHash)
    //   const tx = getTransactionResponse.transaction  as InvokeFunctionTransaction
    //   log(tx)
    //
    //   const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(defaultProvider))
    //
    //   const functionCalls = await transactionCallOrganizer.getCalldataPerCallFromTx(tx)
    //
    //   log(functionCalls)
    //
    //   /*
    //   https://starktx.info/testnet/0x2e9d400084b55cb7b4f8517567f141aaa9334f64a3061f39e98069e7dd47707/
    //
    //   0x3c31bbfd.__execute__(call_array=['{to=0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7, selector=0x2a4bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab, data_offset=0, data_len=0}'], calldata=[], nonce=0) => (retdata_size=1)
    //    */
    // })

    it('organizeFunction with a tuple (felt, felt) in struct', async () => {
      const txHash = '0x4e38472afe5cdc6bffd2f9d0154ffa9281a64dbe2a8e5b0026cb31055530346'
      const blockNumber = 100001

      const tx = await apiProvider.getTransaction(txHash) as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      assert.deepEqual(organizedFunction, JSON.parse('{"name":"xor_counters","inputs":[{"name":"index_and_x","type":"IndexAndValues","value":{"index":"0x691dee6fe3b8227e97b72e9400edd0fc50014cb3b013584d6c1cb74c187a307","values":["0x204397801322a9ddc78aa393b96eac79727b4ef2cfc6cf2f29e2c8aa1717241","0x66adf6e724d3ff5621b1445a227d735af934e5af3a37d5965cde54c516fbea1"]}}]}\n'))

      /*
      https://starktx.info/testnet/0x4e38472afe5cdc6bffd2f9d0154ffa9281a64dbe2a8e5b0026cb31055530346/

      0x68660373.xor_counters(index_and_x={index=0x691dee6fe3b8227e97b72e9400edd0fc50014cb3b013584d6c1cb74c187a307, values=0x204397801322a9ddc78aa393b96eac79727b4ef2cfc6cf2f29e2c8aa1717241}) => ()

      {
        "contract_address": "0x68660373616bc2ed7d7b3b770395e02589967000d0915b0aa4aeb714b97a59b",
        "entry_point_selector": "0x7772be8b80a8a33dc6c1f9a6ab820c02e537c73e859de67f288c70f92571bb",
        "entry_point_type": "EXTERNAL",
        "calldata": [
          "0x691dee6fe3b8227e97b72e9400edd0fc50014cb3b013584d6c1cb74c187a307",
          "0x204397801322a9ddc78aa393b96eac79727b4ef2cfc6cf2f29e2c8aa1717241",
          "0x66adf6e724d3ff5621b1445a227d735af934e5af3a37d5965cde54c516fbea1"
        ],
        "signature": [],
        "transaction_hash": "0x4e38472afe5cdc6bffd2f9d0154ffa9281a64dbe2a8e5b0026cb31055530346",
        "max_fee": "0x0",
        "type": "INVOKE_FUNCTION"
      }
      {
        "name": "xor_counters",
        "inputs": [
          {
            "name": "index_and_x",
            "type": "IndexAndValues",
            "value": {
              "index": "0x691dee6fe3b8227e97b72e9400edd0fc50014cb3b013584d6c1cb74c187a307",
              "values": [
                "0x204397801322a9ddc78aa393b96eac79727b4ef2cfc6cf2f29e2c8aa1717241",
                "0x66adf6e724d3ff5621b1445a227d735af934e5af3a37d5965cde54c516fbea1"
              ]
            }
          }
        ]
      }
       */
    })

    it('organizeFunction with a tuple (x : felt, y : felt) in struct', async () => {
      const txHash = '0x5cf59149e8176360448c8fcdde8a1888179f70ae038b9a48b85a0a2a2156b58'
      const blockNumber = 130013

      const tx = await apiProvider.getTransaction(txHash) as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      assert.deepEqual(organizedFunction, JSON.parse('{"name":"xor_counters","inputs":[{"name":"index_and_x","type":"IndexAndValues","value":{"index":"0x2ccb88725fd79278b80a8f476ae5e2c54adcc243c7b4d7be8a00f28feabf003","values":["0x264cb2e95d3fb4b0bc78879b27ef860d25e0fe9e0e2944f40a1b1e4300544b5","0x62cf20a8421dd5249ac762efe0c95dcc5fafc5ba068ef0c8be493b0be0ad961"]}}]}'))

      /*
      https://starktx.info/testnet/0x5cf59149e8176360448c8fcdde8a1888179f70ae038b9a48b85a0a2a2156b58/

      0x1a782b28.xor_counters(index_and_x={index=0x2ccb88725fd79278b80a8f476ae5e2c54adcc243c7b4d7be8a00f28feabf003, values=0x264cb2e95d3fb4b0bc78879b27ef860d25e0fe9e0e2944f40a1b1e4300544b5}) => ()

      {
        "contract_address": "0x1a782b281fb4e7f81aff2f47b49e62629d70e3a4ee48ba65fc4ac2ec8d5d62",
        "entry_point_selector": "0x7772be8b80a8a33dc6c1f9a6ab820c02e537c73e859de67f288c70f92571bb",
        "entry_point_type": "EXTERNAL",
        "calldata": [
          "0x2ccb88725fd79278b80a8f476ae5e2c54adcc243c7b4d7be8a00f28feabf003",
          "0x264cb2e95d3fb4b0bc78879b27ef860d25e0fe9e0e2944f40a1b1e4300544b5",
          "0x62cf20a8421dd5249ac762efe0c95dcc5fafc5ba068ef0c8be493b0be0ad961"
        ],
        "signature": [],
        "transaction_hash": "0x5cf59149e8176360448c8fcdde8a1888179f70ae038b9a48b85a0a2a2156b58",
        "max_fee": "0x0",
        "type": "INVOKE_FUNCTION"
      }
      {
        "name": "xor_counters",
        "inputs": [
          {
            "name": "index_and_x",
            "type": "IndexAndValues",
            "value": {
              "index": "0x2ccb88725fd79278b80a8f476ae5e2c54adcc243c7b4d7be8a00f28feabf003",
              "values": [
                "0x264cb2e95d3fb4b0bc78879b27ef860d25e0fe9e0e2944f40a1b1e4300544b5",
                "0x62cf20a8421dd5249ac762efe0c95dcc5fafc5ba068ef0c8be493b0be0ad961"
              ]
            }
          }
        ]
      }
       */
    })

    it('organizeFunction with a size 1 array of CallArray struct', async () => {
      const txHash = '0x2e9d400084b55cb7b4f8517567f141aaa9334f64a3061f39e98069e7dd47707'
      const blockNumber = 120071

      const tx = await apiProvider.getTransaction(txHash) as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      assert.deepEqual(organizedFunction, JSON.parse('{"name":"__execute__","inputs":[{"name":"call_array","type":"CallArray[1]","value":[{"to":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x2a4bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x0","data_len":"0x0"}]},{"name":"calldata","type":"felt[0]","value":[]},{"name":"nonce","type":"felt","value":"0x0"}]}'))

      /*
      https://starktx.info/testnet/0x2e9d400084b55cb7b4f8517567f141aaa9334f64a3061f39e98069e7dd47707/

      0x3c31bbfd.__execute__(call_array=['{to=0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7, selector=0x2a4bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab, data_offset=0, data_len=0}'], calldata=[], nonce=0) => (retdata_size=1)

      {
        "contract_address": "0x3c31bbfd817f44d9cf41b54bb714cb6e6d480dbfea156622ce3b828f59e01ca",
        "entry_point_selector": "0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad",
        "entry_point_type": "EXTERNAL",
        "calldata": [
          "0x1",
          "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          "0x2a4bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
          "0x0",
          "0x0",
          "0x0",
          "0x0"
        ],
        "signature": [
          "0x76658d7dfffdf57813b15659b171cf96fb671785d00797103fbbb7c4751ba6b",
          "0x2a17010bc19379985fe749a8ba2f1f410f59ed562b1075df619f325475a84dd"
        ],
        "transaction_hash": "0x2e9d400084b55cb7b4f8517567f141aaa9334f64a3061f39e98069e7dd47707",
        "max_fee": "0x28fa6ae0000",
        "type": "INVOKE_FUNCTION"
      }
      {
        "name": "__execute__",
        "inputs": [
          {
            "name": "call_array",
            "type": "CallArray[1]",
            "value": [
              {
                "to": "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                "selector": "0x2a4bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
                "data_offset": "0x0",
                "data_len": "0x0"
              }
            ]
          },
          {
            "name": "calldata",
            "type": "felt[0]",
            "value": []
          },
          {
            "name": "nonce",
            "type": "felt",
            "value": "0x0"
          }
        ]
      }
       */
    })

    it('organizeFunction with an array of CallArray struct and a felt array', async () => {
      const tx = JSON.parse('{"contract_address":"0x3c31bbfd817f44d9cf41b54bb714cb6e6d480dbfea156622ce3b828f59e01ca","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","entry_point_type":"EXTERNAL","calldata":["0x3","0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x3","0x4","0x55536570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x666bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x7","0x8","0x99936570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x000bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x1","0x2","0x3","0x17736570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x288bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x399bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x4"],"signature":["0x76658d7dfffdf57813b15659b171cf96fb671785d00797103fbbb7c4751ba6b","0x2a17010bc19379985fe749a8ba2f1f410f59ed562b1075df619f325475a84dd"],"transaction_hash":"0x2e9d400084b55cb7b4f8517567f141aaa9334f64a3061f39e98069e7dd47707","max_fee":"0x28fa6ae0000","type":"INVOKE_FUNCTION"}')
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, 171140)

      log(organizedFunction)

      assert.deepEqual(organizedFunction, JSON.parse('{"name":"__execute__","inputs":[{"name":"call_array","type":"CallArray[3]","value":[{"to":"0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x3","data_len":"0x4"},{"to":"0x55536570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x666bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x7","data_len":"0x8"},{"to":"0x99936570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x000bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x1","data_len":"0x2"}]},{"name":"calldata","type":"felt[3]","value":["0x17736570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x288bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x399bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab"]},{"name":"nonce","type":"felt","value":"0x4"}]}'))

      /*
      {
        "contract_address": "0x3c31bbfd817f44d9cf41b54bb714cb6e6d480dbfea156622ce3b828f59e01ca",
        "entry_point_selector": "0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad",
        "entry_point_type": "EXTERNAL",
        "calldata": [
          "0x3",
          "0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          "0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
          "0x3",
          "0x4",
          "0x55536570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          "0x666bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
          "0x7",
          "0x8",
          "0x99936570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          "0x000bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
          "0x1",
          "0x2",
          "0x3",
          "0x17736570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
          "0x288bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
          "0x399bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
          "0x4"
        ],
        "signature": [
          "0x76658d7dfffdf57813b15659b171cf96fb671785d00797103fbbb7c4751ba6b",
          "0x2a17010bc19379985fe749a8ba2f1f410f59ed562b1075df619f325475a84dd"
        ],
        "transaction_hash": "0x2e9d400084b55cb7b4f8517567f141aaa9334f64a3061f39e98069e7dd47707",
        "max_fee": "0x28fa6ae0000",
        "type": "INVOKE_FUNCTION"
      }
      {
        "name": "__execute__",
        "inputs": [
          {
            "name": "call_array",
            "type": "CallArray[3]",
            "value": [
              {
                "to": "0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                "selector": "0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
                "data_offset": "0x3",
                "data_len": "0x4"
              },
              {
                "to": "0x55536570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                "selector": "0x666bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
                "data_offset": "0x7",
                "data_len": "0x8"
              },
              {
                "to": "0x99936570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                "selector": "0x000bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
                "data_offset": "0x1",
                "data_len": "0x2"
              }
            ]
          },
          {
            "name": "calldata",
            "type": "felt[3]",
            "value": [
              "0x17736570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
              "0x288bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab",
              "0x399bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab"
            ]
          },
          {
            "name": "nonce",
            "type": "felt",
            "value": "0x4"
          }
        ]
      }

       */
    });

    it('parseFunction', async () => {
      const txj = JSON.parse('{"contract_address":"0x3c31bbfd817f44d9cf41b54bb714cb6e6d480dbfea156622ce3b828f59e01ca","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","entry_point_type":"EXTERNAL","calldata":["0x3","0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x3","0x4","0x55536570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x666bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x7","0x8","0x99936570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x000bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x1","0x2","0x3","0x17736570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x288bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x399bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x4"],"signature":["0x76658d7dfffdf57813b15659b171cf96fb671785d00797103fbbb7c4751ba6b","0x2a17010bc19379985fe749a8ba2f1f410f59ed562b1075df619f325475a84dd"],"transaction_hash":"0x2e9d400084b55cb7b4f8517567f141aaa9334f64a3061f39e98069e7dd47707","max_fee":"0x28fa6ae0000","type":"INVOKE_FUNCTION"}')
      const tx = txj as InvokeFunctionTransaction
      log(tx)

      const abi = JSON.parse('[{"members":[{"name":"to","offset":0,"type":"felt"},{"name":"selector","offset":1,"type":"felt"},{"name":"data_offset","offset":2,"type":"felt"},{"name":"data_len","offset":3,"type":"felt"}],"name":"CallArray","size":4,"type":"struct"},{"inputs":[],"name":"assert_only_self","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[],"name":"get_public_key","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"get_nonce","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"new_public_key","type":"felt"}],"name":"set_public_key","outputs":[],"type":"function"},{"inputs":[{"name":"_public_key","type":"felt"}],"name":"constructor","outputs":[],"type":"constructor"},{"inputs":[{"name":"transaction_hash","type":"felt"},{"name":"signature_len","type":"felt"},{"name":"signature","type":"felt*"}],"name":"is_valid_signature","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"name":"call_array_len","type":"felt"},{"name":"call_array","type":"CallArray*"},{"name":"calldata_len","type":"felt"},{"name":"calldata","type":"felt*"},{"name":"nonce","type":"felt"}],"name":"__execute__","outputs":[{"name":"retdata_size","type":"felt"},{"name":"retdata","type":"felt*"}],"type":"function"}]')
      log(abi)

      const abiMap: { [address: string]: Abi } = {}
      abiMap[tx.contract_address] = abi
      const abiProvider = new MockAbiProvider(abiMap)
      const transactionCallOrganizer = new TransactionCallOrganizer(abiProvider)
      const contractOrganizer = new ContractCallOrganizer(tx.contract_address, 0, abiProvider)
      await contractOrganizer.initialize()
      const functionAbi = contractOrganizer.getFunctionAbiFromSelector(tx.entry_point_selector)
      console.debug(functionAbi)

      const organizedFunction = transactionCallOrganizer.parseFunction(contractOrganizer, tx.calldata, functionAbi)

      log(organizedFunction)

      assert.deepEqual(organizedFunction, JSON.parse('{"name":"__execute__","inputs":[{"name":"call_array","type":"CallArray[3]","value":[{"to":"0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x3","data_len":"0x4"},{"to":"0x55536570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x666bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x7","data_len":"0x8"},{"to":"0x99936570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x000bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x1","data_len":"0x2"}]},{"name":"calldata","type":"felt[3]","value":["0x17736570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x288bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x399bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab"]},{"name":"nonce","type":"felt","value":"0x4"}]}'))
    })

    it('parseFunction with extra structs, extra felts, one array of structs and one array of felts', async () => {
      const tx = JSON.parse('{"contract_address":"0x3c31bbfd817f44d9cf41b54bb714cb6e6d480dbfea156622ce3b828f59e01ca","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","entry_point_type":"EXTERNAL","calldata":["0x3","0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x3","0x4","0x55536570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x666bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x7","0x8","0x99936570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x000bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x1","0x2","0x3","0x17736570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x288bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x399bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x4","0x10036570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x200bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x300","0x400","0x5","0x6","0x50036570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x600bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x700","0x800","0x7","0x8"],"signature":["0x76658d7dfffdf57813b15659b171cf96fb671785d00797103fbbb7c4751ba6b","0x2a17010bc19379985fe749a8ba2f1f410f59ed562b1075df619f325475a84dd"],"transaction_hash":"0x2e9d400084b55cb7b4f8517567f141aaa9334f64a3061f39e98069e7dd47707","max_fee":"0x28fa6ae0000","type":"INVOKE_FUNCTION"}')
      log(tx)

      const abi = JSON.parse('[{"members":[{"name":"to","offset":0,"type":"felt"},{"name":"selector","offset":1,"type":"felt"},{"name":"data_offset","offset":2,"type":"felt"},{"name":"data_len","offset":3,"type":"felt"}],"name":"CallArray","size":4,"type":"struct"},{"inputs":[],"name":"assert_only_self","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[],"name":"get_public_key","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"get_nonce","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"new_public_key","type":"felt"}],"name":"set_public_key","outputs":[],"type":"function"},{"inputs":[{"name":"_public_key","type":"felt"}],"name":"constructor","outputs":[],"type":"constructor"},{"inputs":[{"name":"transaction_hash","type":"felt"},{"name":"signature_len","type":"felt"},{"name":"signature","type":"felt*"}],"name":"is_valid_signature","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"name":"call_array_len","type":"felt"},{"name":"call_array","type":"CallArray*"},{"name":"calldata_len","type":"felt"},{"name":"calldata","type":"felt*"},{"name":"nonce","type":"felt"},{"name":"extra_struct_1","type":"CallArray"},{"name":"extra_felt_1","type":"felt"},{"name":"extra_felt_2","type":"felt"},{"name":"extra_struct_2","type":"CallArray"},{"name":"extra_felt_3","type":"felt"},{"name":"extra_felt_4","type":"felt"}],"name":"__execute__","outputs":[{"name":"retdata_size","type":"felt"},{"name":"retdata","type":"felt*"}],"type":"function"}]')
      log(abi)

      const abiMap: { [address: string]: Abi } = {}
      abiMap[tx.contract_address] = abi
      const abiProvider = new MockAbiProvider(abiMap)
      const transactionCallOrganizer = new TransactionCallOrganizer(abiProvider)
      const contractOrganizer = new ContractCallOrganizer(tx.contract_address, 0, abiProvider)
      await contractOrganizer.initialize()
      const functionAbi = contractOrganizer.getFunctionAbiFromSelector(tx.entry_point_selector)
      console.debug(functionAbi)

      const organizedFunction = transactionCallOrganizer.parseFunction(contractOrganizer, tx.calldata, functionAbi)

      log(organizedFunction)

      assert.deepEqual(organizedFunction, JSON.parse('{"name":"__execute__","inputs":[{"name":"call_array","type":"CallArray[3]","value":[{"to":"0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x3","data_len":"0x4"},{"to":"0x55536570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x666bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x7","data_len":"0x8"},{"to":"0x99936570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x000bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x1","data_len":"0x2"}]},{"name":"calldata","type":"felt[3]","value":["0x17736570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x288bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x399bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab"]},{"name":"nonce","type":"felt","value":"0x4"},{"name":"extra_struct_1","type":"CallArray","value":{"to":"0x10036570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x200bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x300","data_len":"0x400"}},{"name":"extra_felt_1","type":"felt","value":"0x5"},{"name":"extra_felt_2","type":"felt","value":"0x6"},{"name":"extra_struct_2","type":"CallArray","value":{"to":"0x50036570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x600bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x700","data_len":"0x800"}},{"name":"extra_felt_3","type":"felt","value":"0x7"},{"name":"extra_felt_4","type":"felt","value":"0x8"}]}'))
    })

    it('parseStruct with two structs in calldata in different places', async () => {
      const calldata = JSON.parse('["0x3","0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x3","0x4","0x55536570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x666bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x7","0x8","0x99936570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x000bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x1","0x2","0x3","0x17736570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x288bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x399bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x4"]')
      log(calldata)

      const structType = 'TestStruct'
      const structAbi = JSON.parse('{"type":"struct", "size":4,"members":[{"name":"to","offset":0,"type":"felt"},{"name":"selector","offset":1,"type":"felt"},{"name":"data_offset","offset":2,"type":"felt"},{"name":"data_len","offset":3,"type":"felt"}]}')
      structAbi.name = structType
      log(structAbi)

      const contract_address = 'test'
      const abiMap: { [address: string]: Abi } = {}
      abiMap[contract_address] = [structAbi]
      const abiProvider = new MockAbiProvider(abiMap)
      const transactionCallOrganizer = new TransactionCallOrganizer(abiProvider)
      const contractOrganizer = new ContractCallOrganizer(contract_address, 0, abiProvider)
      await contractOrganizer.initialize()

      let ret = transactionCallOrganizer.parseStruct(calldata,1, structType, contractOrganizer)
      log(ret)
      assert.deepEqual(ret, JSON.parse('{"struct":{"to":"0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x3","data_len":"0x4"},"size":4}'))

      ret = transactionCallOrganizer.parseStruct(calldata,5, structType, contractOrganizer)
      log(ret)
      assert.deepEqual(ret, JSON.parse('{"struct":{"to":"0x55536570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","selector":"0x666bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","data_offset":"0x7","data_len":"0x8"},"size":4}'))
    })

    it('parseStruct with tuples', async () => {
      const calldata = JSON.parse('["0x1","0x2","0x31","0x32","0x41","0x42","0x5","0x61","0x62"]')
      log(calldata)

      const structType = 'TestStruct'
      const structAbi = JSON.parse('{"type":"struct", "size":9,"members":[{"name":"property_1","offset":0,"type":"felt"},{"name":"property_2","offset":1,"type":"felt"},{"name":"property_3","offset":2,"type":"(felt, felt)"},{"name":"property_4","offset":4,"type":"(x : felt, y : felt)"},{"name":"property_5","offset":6,"type":"felt"},{"name":"property_6","offset":7,"type":"(x : felt, y : felt)"}]}')
      structAbi.name = structType
      log(structAbi)

      const contract_address = 'test'
      const abiMap: { [address: string]: Abi } = {}
      abiMap[contract_address] = [structAbi]
      const abiProvider = new MockAbiProvider(abiMap)
      const transactionCallOrganizer = new TransactionCallOrganizer(abiProvider)
      const contractOrganizer = new ContractCallOrganizer(contract_address, 0, abiProvider)
      await contractOrganizer.initialize()

      let ret = transactionCallOrganizer.parseStruct(calldata,0, structType, contractOrganizer)
      log(ret)

      assert.deepEqual(ret, JSON.parse('{"struct":{"property_1":"0x1","property_2":"0x2","property_3":["0x31","0x32"],"property_4":["0x41","0x42"],"property_5":"0x5","property_6":["0x61","0x62"]},"size":9}'))
    })

    xit('parseStruct with an extra array of felts and extra felts', async () => {
      const calldata = JSON.parse('["0x11136570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x222bb4205277617b698a9a2950b938d0a236dd4619f82f05bec02bdbd245fab","0x3","0x4","0x3","0x1","0x2","0x3","0x4","0x5","0x6"]')
      log(calldata)

      const structType = 'TestStruct'
      const structAbi = JSON.parse('{"type":"struct", "size":8,"members":[{"name":"to","offset":0,"type":"felt"},{"name":"selector","offset":1,"type":"felt"},{"name":"data_offset","offset":2,"type":"felt"},{"name":"data_len","offset":3,"type":"felt"},{"name":"extra_felt_array_len","offset":4,"type":"felt"},{"name":"extra_felt_array","offset":5,"type":"felt*"},{"name":"extra_felt_1","offset":6,"type":"felt"},{"name":"extra_felt_2","offset":7,"type":"felt"}]}')
      structAbi.name = structType
      log(structAbi)

      const contract_address = 'test'
      const abiMap: { [address: string]: Abi } = {}
      abiMap[contract_address] = [structAbi]
      const abiProvider = new MockAbiProvider(abiMap)
      const transactionCallOrganizer = new TransactionCallOrganizer(abiProvider)
      const contractOrganizer = new ContractCallOrganizer(contract_address, 0, abiProvider)
      await contractOrganizer.initialize()

      let struct = transactionCallOrganizer.parseStruct(calldata,0, structType, contractOrganizer)
      log(struct)
    })

    it('organizeEvent for proxy contract', async () => {
      const txHash = '0x61fb0f3732a9af7c37351238482e2f51e027955a7797c1202995efb9e49b620'
      const blockNumber = 206784

      const receipt = await apiProvider.getTransactionReceipt(txHash)
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt.events!, blockNumber)

      log(organizedEvents);

      /*
      https://starktx.info/testnet/0x61fb0f3732a9af7c37351238482e2f51e027955a7797c1202995efb9e49b620/

      0x328eddfa.log_add_reserves(benefactor=0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921, add_amount={low=0, high=0}, new_total_reserves={low=0, high=0})
      0x328eddfa.log_accrue_interest(cash_prior={low=7947168521, high=0}, interest_accumulated={low=9, high=0}, borrow_index={low=1001341693928150530, high=0}, total_borrows={low=60040932, high=0})
      0x3815b591.Transfer(_from=0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8, to=0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921, value={low=81850000, high=0})
      0x328eddfa.Transfer(from_=0, to=0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8, value={low=4091477130717320669832, high=0})
      0x328eddfa.log_mint(minter=0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8, mint_underlying_amount={low=81850000, high=0}, mint_xtoken_amount={low=4091477130717320669832, high=0})
      0x328eddfa.log_transfer(sender=0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921, receiver=0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8, amount={low=4091477130717320669832, high=0})
      0x47495c73.transaction_executed(hash=0x61fb0f3732a9af7c37351238482e2f51e027955a7797c1202995efb9e49b620, response=['0x4e0ee90', '0x0'])
       */
    })

    it('organizeEvent with multiple keys', async () => {
      const txHash = '0x5ac92ccfa0fc4d13806fe9234c53a0d2d7ad8aa8cd8a7901e6b2a9310610f99'
      const blockNumber = 100000

      const receipt = await apiProvider.getTransactionReceipt(txHash)
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt.events!, blockNumber)

      log(organizedEvents)

      /*
      https://starktx.info/testnet/0x11868eafa0e42577ea5c1929e1e05a274ff86b5292fc24047977c28ef98983b/

      0x4e34321e.Transfer(from_=0, to=0x1778c6596d715a8613d0abcbe4fc08c052d208dce3b43eeb6b4dc24ddd62ed9, tokenId={low=15707, high=0})
       */
    })

    it('organizeEvent with no abi', async () => {
      //0x2ba1c8dfc5b1fe09afd70f5429397a29d768c25d21ee6fd0f484513a2791672
      const txHash = '0x49652ed2ec3857cbc6e5dfd6b39ee6102c0f060f0fe96f55ee5f6d972fa5c09'
      const getTransactionReceiptResponse = await apiProvider.getTransactionReceipt(txHash) as any
      const blockNumber = getTransactionReceiptResponse.block_number as number
      const receipt = getTransactionReceiptResponse as TransactionReceipt
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt.events!, blockNumber)

      log(organizedEvents)

      /*
      https://starktx.info/testnet/0x11868eafa0e42577ea5c1929e1e05a274ff86b5292fc24047977c28ef98983b/

      0x4e34321e.Transfer(from_=0, to=0x1778c6596d715a8613d0abcbe4fc08c052d208dce3b43eeb6b4dc24ddd62ed9, tokenId={low=15707, high=0})
       */
    })

    it('organizeEvent', async () => {
      const txHash = '0x11868eafa0e42577ea5c1929e1e05a274ff86b5292fc24047977c28ef98983b'
      const blockNumber = 100000

      const receipt = await apiProvider.getTransactionReceipt(txHash)
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt.events!, blockNumber)

      log(organizedEvents)

      /*
      https://starktx.info/testnet/0x11868eafa0e42577ea5c1929e1e05a274ff86b5292fc24047977c28ef98983b/

      0x4e34321e.Transfer(from_=0, to=0x1778c6596d715a8613d0abcbe4fc08c052d208dce3b43eeb6b4dc24ddd62ed9, tokenId={low=15707, high=0})

      {
        "status": "ACCEPTED_ON_L1",
        "block_hash": "0x390ac08560da4de53c9ab93c6fe8c1cdb43f89ffd9a8dabc19467285a126cc1",
        "block_number": 100000,
        "transaction_index": 15,
        "transaction_hash": "0x11868eafa0e42577ea5c1929e1e05a274ff86b5292fc24047977c28ef98983b",
        "l2_to_l1_messages": [],
        "events": [
          {
            "from_address": "0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a",
            "keys": [
              "0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9"
            ],
            "data": [
              "0x0",
              "0x1778c6596d715a8613d0abcbe4fc08c052d208dce3b43eeb6b4dc24ddd62ed9",
              "0x3d5b",
              "0x0"
            ]
          }
        ],
        "execution_resources": {
          "n_steps": 1730,
          "builtin_instance_counter": {
            "pedersen_builtin": 22,
            "range_check_builtin": 54,
            "ecdsa_builtin": 1,
            "output_builtin": 0,
            "bitwise_builtin": 0,
            "ec_op_builtin": 0
          },
          "n_memory_holes": 63
        },
        "actual_fee": "0x0"
      }
      {
        "data": [
          {
            "name": "from_",
            "type": "felt"
          },
          {
            "name": "to",
            "type": "felt"
          },
          {
            "name": "tokenId",
            "type": "Uint256"
          }
        ],
        "keys": [],
        "name": "Transfer",
        "type": "event"
      }
      [
        {
          "name": "Transfer",
          "transmitter_contract": "0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a",
          "arguments": [
            {
              "name": "from_",
              "type": "felt",
              "value": "0x0"
            },
            {
              "name": "to",
              "type": "felt",
              "value": "0x1778c6596d715a8613d0abcbe4fc08c052d208dce3b43eeb6b4dc24ddd62ed9"
            },
            {
              "name": "tokenId",
              "type": "Uint256",
              "value": {
                "low": "0x3d5b",
                "high": "0x0"
              }
            }
          ]
        }
      ]
       */
    })

    it('organizeFunction with no function abi', async () => {
      const blockNumber = 100000

      const tx = await apiProvider.getTransaction('0x5772cdd88ca51effeeeff8fcdcd9635c90226bd56ed6b5b6b0e3a318c0a2e9a') as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      /*
      {
        "contract_address": "0x45c2f280c6d96a1e1ff740fd38eb6caab833db833ff03a23fbc10fc746025f8",
        "entry_point_selector": "0x3d7e9aabaee46b2e84062eb3bca33a0c08e1142b329c095d47ec3d6af1adbc6",
        "entry_point_type": "L1_HANDLER",
        "calldata": [
          "0xd9cedf07afdd92ef2733b919637744d5e166492e",
          "0x54ae80a9c33ee3b65961d8a97d29fd9cc5d23e2d4efa521462f6cf00f6fd4b2",
          "0x2e695b94dc82ae61d665d9f546029f379ffa8bac",
          "0x53c9f44836ad00b25c65b360c111bdf2d32115faf2f705d84f1acf69f244775",
          "0x434d"
        ],
        "signature": [],
        "transaction_hash": "0x5772cdd88ca51effeeeff8fcdcd9635c90226bd56ed6b5b6b0e3a318c0a2e9a",
        "max_fee": "0x0",
        "type": "INVOKE_FUNCTION"
      }
      undefined
      {
        "name": "0x3d7e9aabaee46b2e84062eb3bca33a0c08e1142b329c095d47ec3d6af1adbc6",
        "inputs": [
          {
            "name": "input_0",
            "value": "0xd9cedf07afdd92ef2733b919637744d5e166492e"
          },
          {
            "name": "input_1",
            "value": "0x54ae80a9c33ee3b65961d8a97d29fd9cc5d23e2d4efa521462f6cf00f6fd4b2"
          },
          {
            "name": "input_2",
            "value": "0x2e695b94dc82ae61d665d9f546029f379ffa8bac"
          },
          {
            "name": "input_3",
            "value": "0x53c9f44836ad00b25c65b360c111bdf2d32115faf2f705d84f1acf69f244775"
          },
          {
            "name": "input_4",
            "value": "0x434d"
          }
        ]
      }

      https://starktx.info/testnet/0x3a7dcf65c03cb540f856b2dd29a894f829c2e9d27d1d7bfd7545488a03d31bb/

      0x45c2f280.0x3d7e9aabaee46b2e84062eb3bca33a0c08e1142b329c095d47ec3d6af1adbc6(input_0=0xd9cedf07afdd92ef2733b919637744d5e166492e, input_1=0x54ae80a9c33ee3b65961d8a97d29fd9cc5d23e2d4efa521462f6cf00f6fd4b2, input_2=0x2e695b94dc82ae61d665d9f546029f379ffa8bac, input_3=0x53c9f44836ad00b25c65b360c111bdf2d32115faf2f705d84f1acf69f244775, input_4=0x434d) => ()

      https://goerli.voyager.online/contract/0x45c2f280c6d96a1e1ff740fd38eb6caab833db833ff03a23fbc10fc746025f8#writeContract

       */
    })

    it('organizeFunction with a felt array in one of the inputs', async () => {
      const blockNumber = 100000

      const tx = await apiProvider.getTransaction('0x3a7dcf65c03cb540f856b2dd29a894f829c2e9d27d1d7bfd7545488a03d31bb') as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      /*
      {
        contract_address: '0x541a729f1292df2c3abfaa02d8527955602367b3151693b50856b7f44ace41',
        entry_point_selector: '0x240060cdb34fcc260f41eac7474ee1d7c80b7e3607daff9ac67c7ea2ebb1c44',
        entry_point_type: 'EXTERNAL',
        calldata: [
          '0x4bc8ac16658025bff4a3bd0760e84fcf075417a4c55c6fae716efdd8f1ed26c',
          '0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c',
          '0x3',
          '0x263acca23357479031157e30053fe10598077f24f427ac1b1de85487f5cd124',
          '0x204fce5e3e25026110000000',
          '0x0',
          '0x64'
        ],
        signature: [
          '0x76566a729b7cfd3f3d719ca68c47b0443eda642dab69356ceb5a80cd2689b15',
          '0x56fd602a9d1462594fc05f4ebc75611bd18d98b01e66b67da5d46d2b8e473b8'
        ],
        transaction_hash: '0x3a7dcf65c03cb540f856b2dd29a894f829c2e9d27d1d7bfd7545488a03d31bb',
        max_fee: '0x0',
        type: 'INVOKE_FUNCTION'
      }
      {
        inputs: [
          { name: 'to', type: 'felt' },
          { name: 'selector', type: 'felt' },
          { name: 'calldata_len', type: 'felt' },
          { name: 'calldata', type: 'felt*' },
          { name: 'nonce', type: 'felt' }
        ],
        name: 'execute',
        outputs: [ { name: 'response', type: 'felt' } ],
        type: 'function'
      }

      https://starktx.info/testnet/0x3a7dcf65c03cb540f856b2dd29a894f829c2e9d27d1d7bfd7545488a03d31bb/

      0x541a729f.execute(to=0x4bc8ac16658025bff4a3bd0760e84fcf075417a4c55c6fae716efdd8f1ed26c, selector=0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c, calldata=['0x263acca23357479031157e30053fe10598077f24f427ac1b1de85487f5cd124', '0x204fce5e3e25026110000000', '0x0'], nonce=100) => (response=1)
       */
    })

    it('organizeFunction with two felt arrays in the inputs', async () => {
      const blockNumber = 100000

      const tx = await apiProvider.getTransaction('0x5ac92ccfa0fc4d13806fe9234c53a0d2d7ad8aa8cd8a7901e6b2a9310610f99') as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(new OnlineAbiProvider(apiProvider))

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      /*
      {
        "contract_address": "0x74f0ac325c1609156dd011945800b4ef43ba06bacc8def68c597eb085cb321f",
        "entry_point_selector": "0x2913ee03e5e3308c41e308bd391ea4faac9b9cb5062c76a6b3ab4f65397e106",
        "entry_point_type": "EXTERNAL",
        "calldata": [
          "0x7",
          "0x11dd7cd5453549767333bd11c1f4f239bf9714d4caf210295f199075986321e",
          "0x78e86435c11168ea423fa8dd8fc599f12cf323f24c6fec162b03ac61e593d62",
          "0x2a3e53a95289170486416402a3241b77bff6bc06bb4b3f69415af4d17e0605b",
          "0x60aeaaf09454627ae7f18661e5f008a48e6d0dff3c6c4b8ee70693ce1855d0c",
          "0x4cd5894b621530efe112412535a287168b43d498faf4c087296f1ed4a1ce006",
          "0x6e0f186eb4af3b6e33fd2c73b7a68b466e428094b9aebf968b9c0313a079833",
          "0x38086712b576666f1582f1e04b022bc3cb0f7edf779d626e12a4cf482f7bcb0",
          "0x5",
          "0x9b905d228f38f68d4abfaddcfef9bdd2a3cf331acc7a3700201a50dbe91db2",
          "0x434c12a93122f18805f9b3dadd4802a200a75c789940fdd7ef3a32902710483",
          "0x7856023f5f8b6007ab17f7839c87882e2d867e1584f890c531fee4a16a53df9",
          "0x13f6aea661b89abe5e5b1942b8e5b004971efe72099ddf98744cea3696aeb41",
          "0x41d43f0c10746a78a7e5ae13726c8f8e326d55a614ecf964ad709a3210cde88"
        ],
        "signature": [],
        "transaction_hash": "0x5ac92ccfa0fc4d13806fe9234c53a0d2d7ad8aa8cd8a7901e6b2a9310610f99",
        "max_fee": "0x0",
        "type": "INVOKE_FUNCTION"
      }
      {
        "inputs": [
          {
            "name": "keys_len",
            "type": "felt"
          },
          {
            "name": "keys",
            "type": "felt*"
          },
          {
            "name": "data_len",
            "type": "felt"
          },
          {
            "name": "data",
            "type": "felt*"
          }
        ],
        "name": "test_emit_event",
        "outputs": [],
        "type": "function"
      }

      https://starktx.info/testnet/0x5ac92ccfa0fc4d13806fe9234c53a0d2d7ad8aa8cd8a7901e6b2a9310610f99/

      0x74f0ac32.test_emit_event(keys=['0x11dd7cd5453549767333bd11c1f4f239bf9714d4caf210295f199075986321e', '0x78e86435c11168ea423fa8dd8fc599f12cf323f24c6fec162b03ac61e593d62', '0x2a3e53a95289170486416402a3241b77bff6bc06bb4b3f69415af4d17e0605b', '0x60aeaaf09454627ae7f18661e5f008a48e6d0dff3c6c4b8ee70693ce1855d0c', '0x4cd5894b621530efe112412535a287168b43d498faf4c087296f1ed4a1ce006', '0x6e0f186eb4af3b6e33fd2c73b7a68b466e428094b9aebf968b9c0313a079833', '0x38086712b576666f1582f1e04b022bc3cb0f7edf779d626e12a4cf482f7bcb0'], data=['0x9b905d228f38f68d4abfaddcfef9bdd2a3cf331acc7a3700201a50dbe91db2', '0x434c12a93122f18805f9b3dadd4802a200a75c789940fdd7ef3a32902710483', '0x7856023f5f8b6007ab17f7839c87882e2d867e1584f890c531fee4a16a53df9', '0x13f6aea661b89abe5e5b1942b8e5b004971efe72099ddf98744cea3696aeb41', '0x41d43f0c10746a78a7e5ae13726c8f8e326d55a614ecf964ad709a3210cde88']) => ()
       */
    })

  });


});