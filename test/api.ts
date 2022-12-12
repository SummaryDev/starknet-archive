import {createConnection, DataSource} from "typeorm"
import { FeederApi } from "../src/api/feeder";
import { PathfinderApi } from "../src/api/pathfinder";
import { AbiApi } from "../src/api/abi";
import { ComboApi } from "../src/api/combo";
import { DatabaseApi } from "../src/api/database";
import * as console from '../src/helpers/console'
import {Block, InvokeFunctionTransaction, TransactionReceipt} from '../src/types/raw-starknet'
import {TransactionCallOrganizer} from '../src/organizers/transaction-call'
import {BlockOrganizer} from '../src/organizers/block'
//import JSON = require("json5")
import { MemoryCache } from "../src/helpers/cache";
import { Api } from "../src/api/interfaces";

import * as chai from 'chai'
import chaiAsPromised = require('chai-as-promised');
import {RawReceipt} from "../src/entities";
chai.use(chaiAsPromised)
const expect = chai.expect

function log(o: any) {
  console.log(JSON.stringify(o, null, 2))
}

const pathfinderUrl = 'https://pathfinder-mainnet.dev.summary.dev/rpc/v0.2'/*'https://pathfinder-goerli.dev.summary.dev'/*'http://54.80.141.84:9545'/*'https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a'*/
const network = 'mainnet-alpha'/*'goerli-alpha'*/
const apiAbiUrl = 'https://api-abi-mainnet.dev.summary.dev'
const api: Api = new ComboApi(pathfinderUrl, network, apiAbiUrl)

describe('api', function() {
  this.timeout(6000000)

  let ds:DataSource

  let databaseApi:DatabaseApi

  before(() => {
    return createConnection().then(o => {
      ds = o
      log(`connected to db`)

      databaseApi = new DatabaseApi(api, ds)
    })
  })

  describe('DatabaseApi', async function() {
    xit('deletes block, cascades, deletes raw block and raw receipts', async() => {
      for(let blockNumber=386700; blockNumber <= 386823; blockNumber++) {
        await databaseApi.deleteBlock(blockNumber)
      }
    })

    it('finds implementation contract address for proxy contract with implementation getter view function get_implementation_class_hash', async() => {
      // 0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29 has view function get_implementation_class_hash

      const blockNumber = 241859 // <-- WAS DEPLOYED IN THIS BLOCK https://beta-goerli.voyager.online/tx/0x26780a818432b6739a23ab8e1ad0c0463ada881a563034a6d5c3d7e46850883
      const contractAddressProxy = '0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29'
      const abiProxy = await databaseApi.getAbi(contractAddressProxy)
      log(abiProxy)
      expect(abiProxy).not.undefined
      const isProxy = DatabaseApi.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await databaseApi.findImplementation(contractAddressProxy, abiProxy, 266476)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x1ecfc4bf6c3b5317a25fec2eb942db4f336077f7506acc3eb253889d73a45d4')

      implementationContractAddress = await databaseApi.findImplementation(contractAddressProxy, abiProxy, blockNumber)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x42687c59528cd15c17c1ec7029a3c6196e004fac5dea4ac9fdc99b58ded01e1')

      expect(databaseApi.findImplementation(contractAddressProxy, abiProxy, blockNumber-1)).to.throw
    })

    it('finds implementation contract address for proxy contract with multiple implementation getter view functions', async() => {
      // 0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7 has two view functions implementation and implementation_time
      // exact match to 'implementation' should return one correct view function

      const blockNumber = 102959 // <-- WAS DEPLOYED IN THIS BLOCK https://beta-goerli.voyager.online/tx/0x550088c7427d9734c801e7dd3a5e166d515276849034071ee87905510dbe3c6
      const contractAddressProxy = '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
      const abiProxy = await databaseApi.getAbi(contractAddressProxy)
      log(abiProxy)
      expect(abiProxy).not.undefined
      const isProxy = DatabaseApi.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await databaseApi.findImplementation(contractAddressProxy, abiProxy, 266476)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0xfa904eea70850fdd44e155dcc79a8d96515755ed43990ff4e7e7c096673e7')

      implementationContractAddress = await databaseApi.findImplementation(contractAddressProxy, abiProxy, blockNumber)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x0')

      expect(databaseApi.findImplementation(contractAddressProxy, abiProxy, blockNumber-1)).to.throw
    })

    it('finds implementation contract address for proxy contract with a getter view function', async() => {
      const blockNumber = 119485 // <-- WAS DEPLOYED IN THIS BLOCK https://goerli.voyager.online/tx/0x3d86f1b062475dc31f57ad8666ee78c332ed2588ad360f6316108702a066123
      const contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      const abiProxy = await databaseApi.getAbi(contractAddressProxy)
      log(abiProxy)
      expect(abiProxy).not.undefined
      const isProxy = DatabaseApi.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await databaseApi.findImplementation(contractAddressProxy, abiProxy, 200000)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30')

      implementationContractAddress = await databaseApi.findImplementation(contractAddressProxy, abiProxy, blockNumber)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704')

      expect(databaseApi.findImplementation(contractAddressProxy, abiProxy, blockNumber-1)).to.throw
    })

    it('finds implementation contract address for proxy contract with a constructor and events', async() => {
      const blockNumber = 134018
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await databaseApi.getAbi(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseApi.isProxy(abiProxy!)
      expect(isProxy).true

      let implementationContractAddress = await databaseApi.findImplementation(contractAddressProxy, abiProxy, blockNumber)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      expect(databaseApi.findImplementation(contractAddressProxy, abiProxy, blockNumber-1)).to.throw
    })

    it('finds implementation contract address from proxy constructor', async() => {
      const blockNumber = 134018
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await databaseApi.getAbi(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseApi.isProxy(abiProxy)
      expect(isProxy).true

      /*
      select b.block_number, t.transaction_hash, t.constructor_calldata from transaction as t, block as b where t.contract_address = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921' and t.type = 'DEPLOY' and t."blockBlockNumber" = b.block_number order by b.block_number desc;

      134018	0x2dd6e7e242921c61c8b3b8dc07cf88a8792562dc21b732550af4fbfb5aee217	["0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae"] <-- WAS DEPLOYED IN THIS BLOCK
       */

      let implementationContractAddress = await databaseApi.findImplementationByConstructor(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      expect(databaseApi.findImplementationByConstructor(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw
    })

    it('finds implementation contract address from proxy constructor with multiple inputs', async() => {
      const blockNumber = 62135
      const contractAddressProxy = '0x1317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e'
      const abiProxy = await databaseApi.getAbi(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseApi.isProxy(abiProxy)
      expect(isProxy).true

      /*
      select b.block_number, t.transaction_hash, t.constructor_calldata from transaction as t, block as b where t.contract_address = '0x1317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e' and t.type = 'DEPLOY' and t."block_number" = b.block_number order by b.block_number desc;

      62135	0x53facbf470346c7e21452e5b8ef4c2b210547f9463b00b73b8a16e8daa5e58c	["0x6043ed114a9a1987fe65b100d0da46fe71b2470e7e5ff8bf91be5346f5e5e3", "0x74db315cc7e1e821dfd229890068ea197594ac3e29fa0038dc12704f63ebb83"] <-- WAS DEPLOYED IN THIS BLOCK
       */

      let implementationContractAddress = await databaseApi.findImplementationByConstructor(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x74db315cc7e1e821dfd229890068ea197594ac3e29fa0038dc12704f63ebb83')

      expect(databaseApi.findImplementationByConstructor(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw
    })

    it('finds implementation contract address from upgrade event', async() => {
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await databaseApi.getAbi(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseApi.isProxy(abiProxy)
      expect(isProxy).true

      /*
      select b.block_number, a.value, e.name, a.name from argument as a, event as e, transaction as t, block as b where e.transmitter_contract = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921' and a."eventId" = e.id and e.name ilike '%upgrade%' and e."transactionTransactionHash" = t.transaction_hash and t."block_number" = b.block_number order by b.block_number desc;

      164233	"0x65c4fe3e8d1eaa783a62417271af5546d9164cc81d7780617b1295722bfd535"	Upgraded	implementation
      161300	"0x3a29ab9db30291ab762af40a510cb0fe61c4a4f1050142d1ea9d58754cbd641"	Upgraded	implementation
      146407	"0x1e7bad045fbf062272ba29f3d95d678868c3151399b25ba8bb1092077a85edd"	Upgraded	implementation
      134018	"0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae"	Upgraded	implementation <-- WAS DEPLOYED IN THIS BLOCK
       */

      let implementationContractAddress = await databaseApi.findImplementationByEvent(contractAddressProxy, abiProxy!, 164233)
      expect(implementationContractAddress).eq('0x65c4fe3e8d1eaa783a62417271af5546d9164cc81d7780617b1295722bfd535')

      implementationContractAddress = await databaseApi.findImplementationByEvent(contractAddressProxy, abiProxy!, 161300)
      expect(implementationContractAddress).eq('0x3a29ab9db30291ab762af40a510cb0fe61c4a4f1050142d1ea9d58754cbd641')

      implementationContractAddress = await databaseApi.findImplementationByEvent(contractAddressProxy, abiProxy!, 146407)
      expect(implementationContractAddress).eq('0x1e7bad045fbf062272ba29f3d95d678868c3151399b25ba8bb1092077a85edd')

      implementationContractAddress = await databaseApi.findImplementationByEvent(contractAddressProxy, abiProxy!, 134018)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      expect(await databaseApi.findImplementationByEvent(contractAddressProxy, abiProxy!, 134017)).to.throw
    })

    it('finds implementation contract address from a getter view function', async() => {
      let contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8' // has get_implementation
      let blockNumber = 200000
      let abiProxy = await databaseApi.getAbi(contractAddressProxy)
      log(abiProxy)
      let isProxy = DatabaseApi.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await databaseApi.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30')

      /*
      was deployed in block 119485
      https://goerli.voyager.online/tx/0x3d86f1b062475dc31f57ad8666ee78c332ed2588ad360f6316108702a066123
       */
      blockNumber = 119485

      implementationContractAddress = await databaseApi.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704')

      expect(databaseApi.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw

      /*
      proxy
      https://goerli.voyager.online/contract/0x01317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e#writeContract

      impl
      https://goerli.voyager.online/contract/0x75a31cd9fc21788e3505f9ca50f2a020cd63430f68dbc66a40fe3a083159ebf

      proxy was deployed in block 62135
      https://goerli.voyager.online/tx/0x3d86f1b062475dc31f57ad8666ee78c332ed2588ad360f6316108702a066123
       */

      contractAddressProxy = '0x1317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e' // has getImplementation

      blockNumber = 200000
      abiProxy = await databaseApi.getAbi(contractAddressProxy)
      log(abiProxy)
      isProxy = DatabaseApi.isProxy(abiProxy)
      expect(isProxy).true

      implementationContractAddress = await databaseApi.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x75a31cd9fc21788e3505f9ca50f2a020cd63430f68dbc66a40fe3a083159ebf')

      blockNumber = 70056

      implementationContractAddress = await databaseApi.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x2c30ac04ab60b7b2be19854f9c7129cc40ff95dd167816fb3be1ea94d7110c8')

      blockNumber = 62135

      implementationContractAddress = await databaseApi.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x74db315cc7e1e821dfd229890068ea197594ac3e29fa0038dc12704f63ebb83')

      expect(databaseApi.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw
    })

    it('detects proxy contract', async() => {
      const contractAddressProxyByConstructor = '0x0328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxyByConstructor = await databaseApi.getAbi(contractAddressProxyByConstructor)
      log(abiProxyByConstructor)
      const isProxyByConstructorProxy = DatabaseApi.isProxy(abiProxyByConstructor)
      expect(isProxyByConstructorProxy).true

      const contractAddressProxyByEvent = '0x0328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxyByEvent = await databaseApi.getAbi(contractAddressProxyByEvent)
      log(abiProxyByEvent)
      const isProxyByEventProxy = DatabaseApi.isProxy(abiProxyByEvent)
      expect(isProxyByEventProxy).true

      const contractAddressProxyByContractAbiReadFunction = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      const abiProxyByContractAbiReadFunction = await databaseApi.getAbi(contractAddressProxyByContractAbiReadFunction)
      log(abiProxyByContractAbiReadFunction)
      const isProxyByContractAbiReadFunctionProxy = DatabaseApi.isProxy(abiProxyByContractAbiReadFunction)
      expect(isProxyByContractAbiReadFunctionProxy).true

      const contractAddressProxyByClassAbiReadFunction = '0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29'
      const abiProxyByClassAbiReadFunction = await databaseApi.getAbi(contractAddressProxyByClassAbiReadFunction)
      log(abiProxyByClassAbiReadFunction)
      const isProxyByClassAbiReadFunctionProxy = DatabaseApi.isProxy(abiProxyByClassAbiReadFunction)
      expect(isProxyByClassAbiReadFunctionProxy).true

      const contractAddressRegular = '0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a'
      const abiRegular = await databaseApi.getAbi(contractAddressRegular)
      log(abiRegular)
      const isRegularProxy = DatabaseApi.isProxy(abiRegular)
      expect(isRegularProxy).false
    })

    it('gets abi for regular contract', async() => {
      const blockNumber = 200000
      const contractAddress = '0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a'
      const abiBare = await databaseApi.getAbi(contractAddress)
      log(abiBare)

      const abi = await databaseApi.getContractAbi(contractAddress, blockNumber)
      log(abi)

      expect(abiBare).deep.eq(abi)

      expect(abi).deep.eq(JSON.parse('[{"name":"Uint256","size":2,"type":"struct","members":[{"name":"low","type":"felt","offset":0},{"name":"high","type":"felt","offset":1}]},{"data":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"keys":[],"name":"Transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"approved","type":"felt"},{"name":"tokenId","type":"Uint256"}],"keys":[],"name":"Approve","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"operator","type":"felt"},{"name":"approved","type":"felt"}],"keys":[],"name":"ApprovalForAll","type":"event"},{"name":"constructor","type":"constructor","inputs":[{"name":"name","type":"felt"},{"name":"symbol","type":"felt"},{"name":"owner","type":"felt"}],"outputs":[]},{"name":"nextMintedTokenId","type":"function","inputs":[],"outputs":[{"name":"nextMintedTokenId","type":"Uint256"}],"stateMutability":"view"},{"name":"totalSupply","type":"function","inputs":[],"outputs":[{"name":"totalSupply","type":"Uint256"}],"stateMutability":"view"},{"name":"getOwner","type":"function","inputs":[],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"supportsInterface","type":"function","inputs":[{"name":"interfaceId","type":"felt"}],"outputs":[{"name":"success","type":"felt"}],"stateMutability":"view"},{"name":"name","type":"function","inputs":[],"outputs":[{"name":"name","type":"felt"}],"stateMutability":"view"},{"name":"symbol","type":"function","inputs":[],"outputs":[{"name":"symbol","type":"felt"}],"stateMutability":"view"},{"name":"balanceOf","type":"function","inputs":[{"name":"owner","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view"},{"name":"ownerOf","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"getApproved","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"approved","type":"felt"}],"stateMutability":"view"},{"name":"isApprovedForAll","type":"function","inputs":[{"name":"owner","type":"felt"},{"name":"operator","type":"felt"}],"outputs":[{"name":"isApproved","type":"felt"}],"stateMutability":"view"},{"name":"tokenURI","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"stateMutability":"view"},{"name":"approve","type":"function","inputs":[{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"setApprovalForAll","type":"function","inputs":[{"name":"operator","type":"felt"},{"name":"approved","type":"felt"}],"outputs":[]},{"name":"transferFrom","type":"function","inputs":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"safeTransferFrom","type":"function","inputs":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"},{"name":"data_len","type":"felt"},{"name":"data","type":"felt*"}],"outputs":[]},{"name":"mint","type":"function","inputs":[{"name":"to","type":"felt"},{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"outputs":[]},{"name":"burn","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"transferOwnership","type":"function","inputs":[{"name":"new_owner","type":"felt"}],"outputs":[{"name":"new_owner","type":"felt"}]},{"name":"setTokenURI","type":"function","inputs":[{"name":"tokenId","type":"Uint256"},{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"outputs":[]}]'))
    })

    it('gets abi for proxy contract', async() => {
      const blockNumber = 200000
      const contractAddress = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await databaseApi.getAbi(contractAddress)
      log(abiProxy)

      const abiImplementation = await databaseApi.getContractAbi(contractAddress, blockNumber)
      log(abiImplementation)

      expect(abiProxy).not.deep.eq(abiImplementation)

      expect(abiProxy).deep.eq(JSON.parse('[{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"name":"constructor","type":"constructor","inputs":[{"name":"implementation_address","type":"felt"}],"outputs":[]},{"name":"__default__","type":"function","inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"outputs":[{"name":"retdata_size","type":"felt"},{"name":"retdata","type":"felt*"}]},{"name":"__l1_default__","type":"l1_handler","inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"outputs":[]}]'))

      expect(abiImplementation).deep.eq(JSON.parse('[{"name":"Uint256","size":2,"type":"struct","members":[{"name":"low","type":"felt","offset":0},{"name":"high","type":"felt","offset":1}]},{"name":"BorrowSnapshot","size":4,"type":"struct","members":[{"name":"principal","type":"Uint256","offset":0},{"name":"interest_index","type":"Uint256","offset":2}]},{"data":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"value","type":"Uint256"}],"keys":[],"name":"Transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"},{"name":"value","type":"Uint256"}],"keys":[],"name":"Approval","type":"event"},{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"data":[{"name":"sender","type":"felt"},{"name":"receiver","type":"felt"},{"name":"amount","type":"Uint256"}],"keys":[],"name":"log_transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"},{"name":"amount","type":"Uint256"}],"keys":[],"name":"log_approve","type":"event"},{"data":[{"name":"cash_prior","type":"Uint256"},{"name":"interest_accumulated","type":"Uint256"},{"name":"borrow_index","type":"Uint256"},{"name":"total_borrows","type":"Uint256"}],"keys":[],"name":"log_accrue_interest","type":"event"},{"data":[{"name":"minter","type":"felt"},{"name":"mint_underlying_amount","type":"Uint256"},{"name":"mint_xtoken_amount","type":"Uint256"}],"keys":[],"name":"log_mint","type":"event"},{"data":[{"name":"redeemer","type":"felt"},{"name":"redeem_underlying_amount","type":"Uint256"},{"name":"redeem_xtoken_amount","type":"Uint256"}],"keys":[],"name":"log_redeem","type":"event"},{"data":[{"name":"borrower","type":"felt"},{"name":"borrow_amount","type":"Uint256"},{"name":"account_borrow_balance","type":"Uint256"},{"name":"total_borrows","type":"Uint256"},{"name":"borrow_index","type":"Uint256"}],"keys":[],"name":"log_borrow","type":"event"},{"data":[{"name":"payer","type":"felt"},{"name":"borrower","type":"felt"},{"name":"repay_amount","type":"Uint256"},{"name":"account_borrow_balance","type":"Uint256"},{"name":"total_borrows","type":"Uint256"},{"name":"borrow_index","type":"Uint256"}],"keys":[],"name":"log_repay","type":"event"},{"data":[{"name":"xcontroller","type":"felt"}],"keys":[],"name":"log_set_xcontroller","type":"event"},{"data":[{"name":"to","type":"felt"},{"name":"reduce_amount","type":"Uint256"},{"name":"new_total_reserves","type":"Uint256"}],"keys":[],"name":"log_reduce_reserves","type":"event"},{"data":[{"name":"benefactor","type":"felt"},{"name":"add_amount","type":"Uint256"},{"name":"new_total_reserves","type":"Uint256"}],"keys":[],"name":"log_add_reserves","type":"event"},{"data":[{"name":"treasury","type":"felt"}],"keys":[],"name":"log_set_treasury","type":"event"},{"data":[{"name":"interest_rate_model","type":"felt"}],"keys":[],"name":"log_set_interest_rate_model","type":"event"},{"data":[{"name":"factor","type":"Uint256"}],"keys":[],"name":"log_set_reserve_factor","type":"event"},{"data":[{"name":"liquidator","type":"felt"},{"name":"borrower","type":"felt"},{"name":"actual_repay_amount","type":"Uint256"},{"name":"xtoken_collateral","type":"felt"},{"name":"actual_xtoken_seize_amount","type":"Uint256"}],"keys":[],"name":"log_liquidate","type":"event"},{"data":[{"name":"admin","type":"felt"}],"keys":[],"name":"log_set_proxy_admin","type":"event"},{"data":[{"name":"new_owner","type":"felt"}],"keys":[],"name":"log_transfer_ownership","type":"event"},{"name":"initializer","type":"function","inputs":[{"name":"_name","type":"felt"},{"name":"_symbol","type":"felt"},{"name":"_decimals","type":"felt"},{"name":"_owner","type":"felt"},{"name":"_underlying","type":"felt"},{"name":"_xcontroller","type":"felt"},{"name":"_interest_rate_model","type":"felt"},{"name":"_initial_exchange_rate","type":"Uint256"},{"name":"_proxy_admin","type":"felt"}],"outputs":[]},{"name":"upgrade","type":"function","inputs":[{"name":"new_implementation","type":"felt"}],"outputs":[]},{"name":"proxy_set_admin","type":"function","inputs":[{"name":"new_proxy_admin","type":"felt"}],"outputs":[]},{"name":"proxy_get_admin","type":"function","inputs":[],"outputs":[{"name":"admin","type":"felt"}],"stateMutability":"view"},{"name":"proxy_get_implementation","type":"function","inputs":[],"outputs":[{"name":"implementation","type":"felt"}],"stateMutability":"view"},{"name":"name","type":"function","inputs":[],"outputs":[{"name":"name","type":"felt"}],"stateMutability":"view"},{"name":"symbol","type":"function","inputs":[],"outputs":[{"name":"symbol","type":"felt"}],"stateMutability":"view"},{"name":"totalSupply","type":"function","inputs":[],"outputs":[{"name":"totalSupply","type":"Uint256"}],"stateMutability":"view"},{"name":"decimals","type":"function","inputs":[],"outputs":[{"name":"decimals","type":"felt"}],"stateMutability":"view"},{"name":"balanceOf","type":"function","inputs":[{"name":"account","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view"},{"name":"allowance","type":"function","inputs":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"}],"outputs":[{"name":"remaining","type":"Uint256"}],"stateMutability":"view"},{"name":"is_xtoken","type":"function","inputs":[],"outputs":[{"name":"bool","type":"felt"}],"stateMutability":"view"},{"name":"get_underlying","type":"function","inputs":[],"outputs":[{"name":"underlying","type":"felt"}],"stateMutability":"view"},{"name":"get_not_entered","type":"function","inputs":[],"outputs":[{"name":"not_entered","type":"felt"}],"stateMutability":"view"},{"name":"get_xcontroller","type":"function","inputs":[],"outputs":[{"name":"xcontroller","type":"felt"}],"stateMutability":"view"},{"name":"get_interest_rate_model","type":"function","inputs":[],"outputs":[{"name":"interest_rate_model","type":"felt"}],"stateMutability":"view"},{"name":"get_owner","type":"function","inputs":[],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"get_initial_exchange_rate","type":"function","inputs":[],"outputs":[{"name":"rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_reserve_factor","type":"function","inputs":[],"outputs":[{"name":"factor","type":"Uint256"}],"stateMutability":"view"},{"name":"get_protocol_seize_share_factor","type":"function","inputs":[],"outputs":[{"name":"factor","type":"Uint256"}],"stateMutability":"view"},{"name":"get_accrual_block_timestamp","type":"function","inputs":[],"outputs":[{"name":"timestamp","type":"felt"}],"stateMutability":"view"},{"name":"get_borrow_index","type":"function","inputs":[],"outputs":[{"name":"index","type":"Uint256"}],"stateMutability":"view"},{"name":"get_total_borrows","type":"function","inputs":[],"outputs":[{"name":"total_borrows","type":"Uint256"}],"stateMutability":"view"},{"name":"get_total_reserves","type":"function","inputs":[],"outputs":[{"name":"total_reserves","type":"Uint256"}],"stateMutability":"view"},{"name":"get_exchange_rate_stored","type":"function","inputs":[],"outputs":[{"name":"rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_borrow_balance_stored","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view"},{"name":"get_account_snapshot","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"xtoken_balance","type":"Uint256"},{"name":"borrow_balance","type":"Uint256"},{"name":"exchange_rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_account_borrows","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"borrow_snapshot","type":"BorrowSnapshot"}],"stateMutability":"view"},{"name":"get_cash","type":"function","inputs":[],"outputs":[{"name":"cash_prior","type":"Uint256"}],"stateMutability":"view"},{"name":"get_borrow_rate","type":"function","inputs":[],"outputs":[{"name":"borrow_rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_supply_rate","type":"function","inputs":[],"outputs":[{"name":"supply_rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_treasury","type":"function","inputs":[],"outputs":[{"name":"treasury","type":"felt"}],"stateMutability":"view"},{"name":"set_xcontroller","type":"function","inputs":[{"name":"_xcontroller","type":"felt"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_reserve_factor","type":"function","inputs":[{"name":"_factor","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_protocol_seize_share_factor","type":"function","inputs":[{"name":"_factor","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_interest_rate_model","type":"function","inputs":[{"name":"_interest_rate_model","type":"felt"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_treasury","type":"function","inputs":[{"name":"_treasury","type":"felt"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"transfer","type":"function","inputs":[{"name":"recipient","type":"felt"},{"name":"amount","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"transferFrom","type":"function","inputs":[{"name":"sender","type":"felt"},{"name":"recipient","type":"felt"},{"name":"amount","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"approve","type":"function","inputs":[{"name":"spender","type":"felt"},{"name":"amount","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"increaseAllowance","type":"function","inputs":[{"name":"spender","type":"felt"},{"name":"added_value","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"decreaseAllowance","type":"function","inputs":[{"name":"spender","type":"felt"},{"name":"subtracted_value","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"get_exchange_rate_current","type":"function","inputs":[],"outputs":[{"name":"rate","type":"Uint256"}]},{"name":"get_borrow_balance_current","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}]},{"name":"accrue_interest","type":"function","inputs":[],"outputs":[]},{"name":"mint","type":"function","inputs":[{"name":"_mint_amount","type":"Uint256"}],"outputs":[{"name":"actual_mint_amount","type":"Uint256"}]},{"name":"redeem","type":"function","inputs":[{"name":"_xtoken_amount","type":"Uint256"}],"outputs":[]},{"name":"redeem_underlying","type":"function","inputs":[{"name":"_underlying_token_amount","type":"Uint256"}],"outputs":[]},{"name":"borrow","type":"function","inputs":[{"name":"_borrow_amount","type":"Uint256"}],"outputs":[]},{"name":"repay","type":"function","inputs":[{"name":"_repay_amount","type":"Uint256"}],"outputs":[]},{"name":"repay_for","type":"function","inputs":[{"name":"_borrower","type":"felt"},{"name":"_repay_amount","type":"Uint256"}],"outputs":[]},{"name":"liquidate","type":"function","inputs":[{"name":"_borrower","type":"felt"},{"name":"_repay_amount","type":"Uint256"},{"name":"_xtoken_collateral","type":"felt"}],"outputs":[]},{"name":"seize","type":"function","inputs":[{"name":"_liquidator","type":"felt"},{"name":"_borrower","type":"felt"},{"name":"_xtoken_seize_amount","type":"Uint256"}],"outputs":[{"name":"actual_xtoken_seize_amount","type":"Uint256"}]},{"name":"transfer_ownership","type":"function","inputs":[{"name":"_new_owner","type":"felt"}],"outputs":[{"name":"new_owner","type":"felt"}]},{"name":"reduce_reserves","type":"function","inputs":[{"name":"_reduce_amount","type":"Uint256"}],"outputs":[]},{"name":"add_reserves","type":"function","inputs":[{"name":"_add_amount","type":"Uint256"}],"outputs":[]},{"name":"constructor","type":"constructor","inputs":[{"name":"implementation_address","type":"felt"}],"outputs":[]}]'))
    })

    it('organizeEvents with error getAbi returned no result for contract', async () => {
      const txHash = '0x103cc13a763b9191165e469aa2a0fbd5b0e8a1ff05dad44f50c397bc56b70a8'
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 271814
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)

    })

    it('organizeEvents for event with multiple keys', async () => {
      const txHash = '0x103cc13a763b9191165e469aa2a0fbd5b0e8a1ff05dad44f50c397bc56b70a8'
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 271814
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)
    })

    it('organizeEvents with one anonymous', async () => {
      const txHash = '0x547acc148d588bed3f975c065c62e118a92c9cb090b839a45b38f0f562cfa43'
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 269354
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)

      const expected = JSON.parse('[{"name":"anonymous","transmitter_contract":"0xe49e58cef6542354a2d4a7aa06146f5ec74d0af489987f34a66a00c8d19be9","arguments":[{"name":"anonymous","value":{"from_address":"0xe49e58cef6542354a2d4a7aa06146f5ec74d0af489987f34a66a00c8d19be9","keys":["0xbec83789b10fd2b9aef8d54476551abc720f4f4bb43b4e45a8a6580b9316"],"data":["0x57c6fd43a33756d09cd694784adf9a5c921e33c15fdef9f1c1f1173cece2c90"]}}]}]\n')

      expect(organizedEvents).deep.eq(expected)
    })

    it('organizeEvents for contract 0x6dc4bd1212e67fd05b456a34b24a060c45aad08ab95843c42af31f86c7bd093 which is not proxy but appears so as it has Upgrade event yet its own abi not implementation succeeds in decoding', async () => {
      const txHash = '0x558b503e068c29c765d4ab14260fbf77d5d9ecb7e3f508ed2271db648a99d23'
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 268464
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)

      const expected = JSON.parse('[{"name":"game_evolved","transmitter_contract":"0x6dc4bd1212e67fd05b456a34b24a060c45aad08ab95843c42af31f86c7bd093","arguments":[{"name":"user_id","type":"felt","value":"0x10a095207c41515af6fb111df155c72ec8a8b118ee95559053fb1ccd21a8cf9","decimal":"470045646481647699904097947483261850371828303436477670538076446949786684665"},{"name":"game_id","type":"felt","value":"0x7300100008000000000000000000000000","decimal":"39132555273291485155644251043342963441664"},{"name":"generation","type":"felt","value":"0x5","decimal":"5"},{"name":"state","type":"felt","value":"0x18004c004400d8000000000000000000000000","decimal":"535243746577714246383551814850719446407839744"}]},{"name":"Transfer","transmitter_contract":"0x6dc4bd1212e67fd05b456a34b24a060c45aad08ab95843c42af31f86c7bd093","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0x10a095207c41515af6fb111df155c72ec8a8b118ee95559053fb1ccd21a8cf9","decimal":"470045646481647699904097947483261850371828303436477670538076446949786684665"},{"name":"value","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"}]},{"name":"transaction_executed","transmitter_contract":"0x10a095207c41515af6fb111df155c72ec8a8b118ee95559053fb1ccd21a8cf9","arguments":[{"name":"hash","type":"felt","value":"0x558b503e068c29c765d4ab14260fbf77d5d9ecb7e3f508ed2271db648a99d23","decimal":"2418296105218488036725301354931596390813567306615674790097044021272132558115"},{"name":"response_len","type":"felt","value":"0x0","decimal":"0"},{"name":"response","type":"felt*","value":[]}]}]')

      expect(organizedEvents).deep.eq(expected)
    })

    xit('organizeEvents for proxy contract 0x392db18ff74961ec261de3342e66da65e6fb25d48eaed58c3539709b8eb4d79', async () => {
      const txHash = '0x472b8995ccb9f08d1031ae72041f867e8d80849fd39cbde1dd55af11003e3ab' // contract has key 0x71f483e04cf4cbfe1556a16c44821525820c33eaf04692a9dcc709b1e0f40b0 that doesn't match the only event defined in the abi log_storage_cells
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 268385
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)
    })

    xit('organizeEvents for contract 0x78f6bcd0d7209c4f593fa86aa16ecd2b15cbaaddb98b6c626dfcd799f633300', async () => {//TODO event has no keys thus results in anonymous perhaps pick up the only event definition in the abi when have no keys?
      const txHash = '0x70884a3b618d2c7565f8e6021d36a26f5f330bddf0092eab4e504d773b40be6' // event has no keys
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 268383
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)
    })

    it('organizeConstructorFunction for proxy contract 0x1b1748e401b692796ac064782e821a93ee0b1f7db2db4262d2ddbd3c8d66508', async () => {
      const txHash = '0x2a3d77061ce9e6437a43478454782ab15c762131cdba308fbe1357dd8890844' // contract has no constructor defined
      const getTransactionResponse = await api.getTransaction(txHash) as any
      const blockNumber = 269717
      log(getTransactionResponse)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedFunction = await transactionCallOrganizer.organizeFunction(getTransactionResponse, blockNumber)

      log(organizedFunction)

      expect(organizedFunction).deep.eq(JSON.parse('{"name":"anonymous","inputs":[]}'))
    })

    it('organizeFunction for proxy contract 0x4081227b89f2e6f0169743b85b8f1aa82cfd793098661f5488d3bc03f190cc', async () => {
      const txHash = '0x1de528f1fbb47901ed345d41fbaf97ac7d543d9233c9d85915f451800237681' // contract has
      const blockNumber = 235884

      const tx = await api.getTransaction(txHash) as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      expect(organizedFunction).deep.eq(JSON.parse('{"name":"__execute__","inputs":[{"name":"call_array","type":"CallArray[1]","value":[{"to":"0x73314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82","selector":"0xe48e45e0642d5f170bb832c637926f4c85b77d555848b693304600c4275f26","data_offset":"0x0","data_len":"0x3"}]},{"name":"calldata","type":"felt[3]","value":["0x15fd32c5df54c5394d892eb74e34bbbca3caa7ba","0x2c68af0bb140000","0x0"]},{"name":"nonce","type":"felt","value":"0x0"}]}'))
    })

    it('organizeFunction for proxy contract 0x35572dec96ab362c35139675abc4f1c9d6b15ee29c98fbf3f0390a0f8500afa with l1_handler', async () => {
      const txHash = '0x306f4888f7096396a645113718224d0a9cb9edc43667adebcb9c0dd61a22e25' // contract has l1_handler deposit
      const blockNumber = 24117

      const tx = await api.getTransaction(txHash) as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      expect(organizedFunction).deep.eq(JSON.parse('{"name":"deposit","inputs":[{"name":"from_address","type":"felt","value":"0x15b01475bb3070912216dc393c3a782cc90fa1f7"},{"name":"user","type":"felt","value":"0x24dfa478d3c04b909ea7ae4144b0b05201ba7fbbd92ebbd7e246d2ee5de2dc1"},{"name":"amountLow","type":"felt","value":"0x2386f26fc10000"},{"name":"amountHigh","type":"felt","value":"0x0"}]}'))
    })

    it('organizeFunction for proxy contract 0xba017ce59ea233531242639f411922dd4829847e149ca83ec01a12da5115fb with l1_handler', async () => {
      const txHash = '0x3eff7cc499dd1d5506e1320b8a6e92c4e5b7c43c3b0c5d940bf50a3c748852c' // contract has l1_handler claim_l2_object
      const blockNumber = 114875

      const tx = await api.getTransaction(txHash) as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      expect(organizedFunction).deep.eq(JSON.parse('{"name":"claim_l2_object","inputs":[{"name":"from_address","type":"felt","value":"0xba1b85d16e2dbe023e980c9e00b655e4e3ec81ab"},{"name":"owner_low","type":"felt","value":"0xcdabf17240e6749df4161705eeaa8d44"},{"name":"owner_high","type":"felt","value":"0x39cbc819908405bc3381a1bf6646b6a2"},{"name":"receive_address","type":"felt","value":"0xfc26f72ce430ecec0fd900040c139d47ab64dc130176fa8db6458ca269731"},{"name":"token_id_low","type":"felt","value":"0xb"},{"name":"token_id_high","type":"felt","value":"0x0"}]}'))
    })

    it('organizeFunction for proxy contract 0x73314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82 with l1_handler', async () => {
      const txHash = '0xbda33e18bc98d4c16bd6fe9d540a8f5f2de4a92d7a5cd7fb688d8866fc3572' // contract has l1_handler handle_deposit
      const blockNumber = 118315

      const tx = await api.getTransaction(txHash) as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedFunction = await transactionCallOrganizer.organizeFunction(tx, blockNumber)

      log(organizedFunction)

      expect(organizedFunction).deep.eq(JSON.parse('{"name":"handle_deposit","inputs":[{"name":"from_address","type":"felt","value":"0xc3511006c04ef1d78af4c8e0e74ec18a6e64ff9e"},{"name":"account","type":"felt","value":"0x68c9052b6dd007bcff5c3e7cbbc5c25a0faca3801ced065343f8a0fe69865c"},{"name":"amount_low","type":"felt","value":"0xde0b6b3a7640000"},{"name":"amount_high","type":"felt","value":"0x0"}]}'))
    })

    it('organizeEvent for proxy contract 0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a with implementation getter get_implementation pointing to class', async () => {
      const txHash = '0x1f8a262f2134e3295f9466ef64ee87e13d33edb06dfd00fc5f09810903e40bf' // contract has get_implementation pointing to class 0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 265557
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)

      const expected = JSON.parse('[{"name":"Approval","transmitter_contract":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","arguments":[{"name":"owner","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"spender","type":"felt","value":"0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","decimal":"2118057930243295689209699260109286459508439101415299206807991604654635117418"},{"name":"value","type":"Uint256","value":{"low":"0x355cf2870ec72580000","high":"0x0"},"decimal":"15750000000000000000000"}]},{"name":"Approval","transmitter_contract":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","arguments":[{"name":"owner","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"spender","type":"felt","value":"0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","decimal":"2118057930243295689209699260109286459508439101415299206807991604654635117418"},{"name":"value","type":"Uint256","value":{"low":"0x8bee7dea1d3e88","high":"0x0"},"decimal":"39387246328888968"}]},{"name":"Transfer","transmitter_contract":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","arguments":[{"name":"from_","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"to","type":"felt","value":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","decimal":"2770174426030749006759999589934377255706081509516375365733662619363094133061"},{"name":"value","type":"Uint256","value":{"low":"0x355cf2870ec72580000","high":"0x0"},"decimal":"15750000000000000000000"}]},{"name":"Transfer","transmitter_contract":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","arguments":[{"name":"from_","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"to","type":"felt","value":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","decimal":"2770174426030749006759999589934377255706081509516375365733662619363094133061"},{"name":"value","type":"Uint256","value":{"low":"0x8bee5bd7fa3e50","high":"0x0"},"decimal":"39387099995717200"}]},{"name":"Transfer","transmitter_contract":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"value","type":"Uint256","value":{"low":"0x145ef460201f3c820","high":"0x0"},"decimal":"23486067556197058592"}]},{"name":"AddLiquidity","transmitter_contract":"0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","arguments":[{"name":"owner","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"pool_address","type":"felt","value":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","decimal":"2770174426030749006759999589934377255706081509516375365733662619363094133061"},{"name":"token_0_address","type":"felt","value":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","decimal":"3247388024922748134843608892309699741875987881237106590599513207337606053879"},{"name":"token_1_address","type":"felt","value":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","decimal":"2087021424722619777119509474943472645767659996348769578120564519014510906823"},{"name":"amount_token_0","type":"Uint256","value":{"low":"0x355cf2870ec72580000","high":"0x0"},"decimal":"15750000000000000000000"},{"name":"amount_token_1","type":"Uint256","value":{"low":"0x8bee5bd7fa3e50","high":"0x0"},"decimal":"39387099995717200"},{"name":"liquidity_minted","type":"Uint256","value":{"low":"0x145ef460201f3c820","high":"0x0"},"decimal":"23486067556197058592"}]},{"name":"transaction_executed","transmitter_contract":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","arguments":[{"name":"hash","type":"felt","value":"0x1f8a262f2134e3295f9466ef64ee87e13d33edb06dfd00fc5f09810903e40bf","decimal":"891611671124775543344245311923224556486753581431869584132843997696962216127"},{"name":"response_len","type":"felt","value":"0x4","decimal":"4"},{"name":"response","type":"felt*","value":["0x1","0x1","0x145ef460201f3c820","0x0"]}]}]')

      expect(organizedEvents).deep.eq(expected)
    })

    it('organizeEvent for proxy contract 0x4081227b89f2e6f0169743b85b8f1aa82cfd793098661f5488d3bc03f190cc with implementation getter get_implementation pointing to class', async () => {
      const txHash = '0x5ac107530d24c6b3eddf0b8fb45e6bcfb878d6cfb0b348ae107ec6d09fb8a76' // contract has get_implementation pointing to class 0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 266852
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)

      const expected = JSON.parse('[{"name":"Transfer","transmitter_contract":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0x4081227b89f2e6f0169743b85b8f1aa82cfd793098661f5488d3bc03f190cc","decimal":"113969467072899997891504880677377730218157754189864734507838478711289647308"},{"name":"value","type":"Uint256","value":{"low":"0x3635c9adc5dea00000","high":"0x0"},"decimal":"1000000000000000000000"}]},{"name":"transaction_executed","transmitter_contract":"0x4081227b89f2e6f0169743b85b8f1aa82cfd793098661f5488d3bc03f190cc","arguments":[{"name":"hash","type":"felt","value":"0x5ac107530d24c6b3eddf0b8fb45e6bcfb878d6cfb0b348ae107ec6d09fb8a76","decimal":"2565575525455024542033253787770849681072120494113709945677741160102729845366"},{"name":"response_len","type":"felt","value":"0x1","decimal":"1"},{"name":"response","type":"felt*","value":["0x1"]}]}]')

      expect(organizedEvents).deep.eq(expected)
    })

    it('organizeEvent for proxy contract with implementation getter get_implementation pointing to class', async () => {
      const txHash = '0x1a101bce444b2422ad759fa4b0a6dafa03b4802f715aa8f6ad50fca91b1cf12' // contract 0x7913dfa8aa911915292a30212fc79706dd799ec6485138d06653cad5cb6a199 has get_implementation pointing to class 0x673e3747b6f9cc2daf2c1f4766bd2ff809d7b6b2f09ac15ecaf33004716f188, also verifies proxy 0x7fa3f31baeba9ba94778e40c716486280023e89ae296b88d699337da08c682d
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 266469
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)

      const expected = JSON.parse('[{"name":"TransferSingle","transmitter_contract":"0x7fa3f31baeba9ba94778e40c716486280023e89ae296b88d699337da08c682d","arguments":[{"name":"operator","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"_from","type":"felt","value":"0x5542f2b906e81a3ee9b7986a6a7cc58253328d6a926f9bda15f37a5b3672ff6","decimal":"2410304952924151769151633262091298603580784286847185611698529435999405551606"},{"name":"to","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"token_id","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"},{"name":"amount","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"}]},{"name":"Approval","transmitter_contract":"0x7fa3f31baeba9ba94778e40c716486280023e89ae296b88d699337da08c682d","arguments":[{"name":"owner","type":"felt","value":"0x5542f2b906e81a3ee9b7986a6a7cc58253328d6a926f9bda15f37a5b3672ff6","decimal":"2410304952924151769151633262091298603580784286847185611698529435999405551606"},{"name":"operator","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"token_id","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"},{"name":"amount","type":"Uint256","value":{"low":"0x7","high":"0x0"},"decimal":"7"}]},{"name":"TransferSingle","transmitter_contract":"0x7fa3f31baeba9ba94778e40c716486280023e89ae296b88d699337da08c682d","arguments":[{"name":"operator","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"_from","type":"felt","value":"0x5542f2b906e81a3ee9b7986a6a7cc58253328d6a926f9bda15f37a5b3672ff6","decimal":"2410304952924151769151633262091298603580784286847185611698529435999405551606"},{"name":"to","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"token_id","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"},{"name":"amount","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"}]},{"name":"Approval","transmitter_contract":"0x7fa3f31baeba9ba94778e40c716486280023e89ae296b88d699337da08c682d","arguments":[{"name":"owner","type":"felt","value":"0x5542f2b906e81a3ee9b7986a6a7cc58253328d6a926f9bda15f37a5b3672ff6","decimal":"2410304952924151769151633262091298603580784286847185611698529435999405551606"},{"name":"operator","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"token_id","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"},{"name":"amount","type":"Uint256","value":{"low":"0x6","high":"0x0"},"decimal":"6"}]},{"name":"TransactionExecuted","transmitter_contract":"0x7913dfa8aa911915292a30212fc79706dd799ec6485138d06653cad5cb6a199","arguments":[{"name":"hash","type":"felt","value":"0x1a101bce444b2422ad759fa4b0a6dafa03b4802f715aa8f6ad50fca91b1cf12","decimal":"736787220268369008536859172545801172845107788918727836262593978700238278418"},{"name":"response_len","type":"felt","value":"0x0","decimal":"0"},{"name":"response","type":"felt*","value":[]}]}]')

      expect(organizedEvents).deep.eq(expected)
    })

    it('organizeEvent for proxy contract with implementation getter get_implementation_class_hash pointing to class', async () => {
      const txHash = '0x71d87e5baa99f107e64140f72adca7bd6a05ffe85a4dfb4f59607068a10ac3e' // contract 0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29 has get_implementation_class_hash
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 265758
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)

      const expected = JSON.parse('[{"name":"Approval","transmitter_contract":"0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","arguments":[{"name":"owner","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"spender","type":"felt","value":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","decimal":"167784838450865847503587744484005962903041100779825136612396881209391205417"},{"name":"value","type":"Uint256","value":{"low":"0x2b5e3af16b1880000","high":"0x0"},"decimal":"50000000000000000000"}]},{"name":"Approval","transmitter_contract":"0x38bd0f8aff67ade736159d373cf3399d15529445b147b6b3348cc96cdf66ad8","arguments":[{"name":"owner","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"spender","type":"felt","value":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","decimal":"167784838450865847503587744484005962903041100779825136612396881209391205417"},{"name":"value","type":"Uint256","value":{"low":"0x429d069189e0000","high":"0x0"},"decimal":"300000000000000000"}]},{"name":"Transfer","transmitter_contract":"0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","arguments":[{"name":"from_","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"to","type":"felt","value":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","decimal":"167784838450865847503587744484005962903041100779825136612396881209391205417"},{"name":"value","type":"Uint256","value":{"low":"0x2b5e3af16b1880000","high":"0x0"},"decimal":"50000000000000000000"}]},{"name":"Transfer","transmitter_contract":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"value","type":"Uint256","value":{"low":"0x10cab223a7534e594","high":"0x0"},"decimal":"19359605057652057492"}]},{"name":"Deposit","transmitter_contract":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","arguments":[{"name":"caller","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"owner","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"assets","type":"Uint256","value":{"low":"0x2b5e3af16b1880000","high":"0x0"},"decimal":"50000000000000000000"},{"name":"shares","type":"Uint256","value":{"low":"0x10cab223a7534e594","high":"0x0"},"decimal":"19359605057652057492"}]},{"name":"Transfer","transmitter_contract":"0x38bd0f8aff67ade736159d373cf3399d15529445b147b6b3348cc96cdf66ad8","arguments":[{"name":"from_","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"to","type":"felt","value":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","decimal":"167784838450865847503587744484005962903041100779825136612396881209391205417"},{"name":"value","type":"Uint256","value":{"low":"0x429d069189e0000","high":"0x0"},"decimal":"300000000000000000"}]},{"name":"Transfer","transmitter_contract":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"value","type":"Uint256","value":{"low":"0x53752392e00e9ff7","high":"0x0"},"decimal":"6013751991154417655"}]},{"name":"DepositLP","transmitter_contract":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","arguments":[{"name":"depositor","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"receiver","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"lp_address","type":"felt","value":"0x38bd0f8aff67ade736159d373cf3399d15529445b147b6b3348cc96cdf66ad8","decimal":"1603972555591947492618369193498893498972798051787935521071549101975155403480"},{"name":"assets","type":"Uint256","value":{"low":"0x429d069189e0000","high":"0x0"},"decimal":"300000000000000000"},{"name":"shares","type":"Uint256","value":{"low":"0x53752392e00e9ff7","high":"0x0"},"decimal":"6013751991154417655"}]},{"name":"transaction_executed","transmitter_contract":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","arguments":[{"name":"hash","type":"felt","value":"0x71d87e5baa99f107e64140f72adca7bd6a05ffe85a4dfb4f59607068a10ac3e","decimal":"3218366434203905792359220659356872987341107432731500380813860581646032481342"},{"name":"response_len","type":"felt","value":"0x6","decimal":"6"},{"name":"response","type":"felt*","value":["0x1","0x1","0x10cab223a7534e594","0x0","0x53752392e00e9ff7","0x0"]}]}]')

      expect(organizedEvents).deep.eq(expected)
    })

    it('organizeEvent for proxy contract with multiple implementation getters', async () => {
      const txHash = '0x49cd342354635103227e8670e0d9d69c009db7139ff2a9f25d2c74d8639c13c' // contract 0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7 has two view functions implementation and implementation_time
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 265759
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!, blockNumber)

      log(organizedEvents)

      const expected = JSON.parse('[{"name":"Transfer","transmitter_contract":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","arguments":[{"name":"from_","type":"felt","value":"0x17239d35be9e3a622b01677fff06c05ea7d926b94f864e59188d1a7eca00b1f","decimal":"654132511738151032954843069284474140642287037091913264878622131301367417631"},{"name":"to","type":"felt","value":"0x4c7c0eab342c19e75daf6b7a8897b70ec90e6c39fed7dbc5365dc2ec8208475","decimal":"2162185423028430104159228975646631393832432984405071529018013686322576786549"},{"name":"value","type":"Uint256","value":{"low":"0x71afd498d0000","high":"0x0"},"decimal":"2000000000000000"}]}]')

      expect(organizedEvents).deep.eq(expected)
    })

    it('organizeEvent for proxy contract', async () => {
      const txHash = '0x61fb0f3732a9af7c37351238482e2f51e027955a7797c1202995efb9e49b620'
      const receipt = await api.getTransactionReceipt(txHash)
      const blockNumber = 206784
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseApi)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt!.events!!, blockNumber)

      log(organizedEvents)

      const expected = JSON.parse('[{"name":"log_add_reserves","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"benefactor","type":"felt","value":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","decimal":"1429254172741197180224990385428922029712785460863743153995072894992221718817"},{"name":"add_amount","type":"Uint256","value":{"low":"0x0","high":"0x0"},"decimal":"0"},{"name":"new_total_reserves","type":"Uint256","value":{"low":"0x0","high":"0x0"},"decimal":"0"}]},{"name":"log_accrue_interest","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"cash_prior","type":"Uint256","value":{"low":"0x1d9b02b09","high":"0x0"},"decimal":"7947168521"},{"name":"interest_accumulated","type":"Uint256","value":{"low":"0x9","high":"0x0"},"decimal":"9"},{"name":"borrow_index","type":"Uint256","value":{"low":"0xde57af71d601602","high":"0x0"},"decimal":"1001341693928150530"},{"name":"total_borrows","type":"Uint256","value":{"low":"0x39426e4","high":"0x0"},"decimal":"60040932"}]},{"name":"Transfer","transmitter_contract":"0x3815b591e7992981b640061e2bee59452477a06464b35585e8b3554e86e4b5","arguments":[{"name":"_from","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","decimal":"2015239384418070662545996670620251513189602993640407890987611048935996103896"},{"name":"to","type":"felt","value":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","decimal":"1429254172741197180224990385428922029712785460863743153995072894992221718817"},{"name":"value","type":"Uint256","value":{"low":"0x4e0ee90","high":"0x0"},"decimal":"81850000"}]},{"name":"Transfer","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","decimal":"2015239384418070662545996670620251513189602993640407890987611048935996103896"},{"name":"value","type":"Uint256","value":{"low":"0xddcca6c4d0005f6a88","high":"0x0"},"decimal":"4091477130717320669832"}]},{"name":"log_mint","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"minter","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","decimal":"2015239384418070662545996670620251513189602993640407890987611048935996103896"},{"name":"mint_underlying_amount","type":"Uint256","value":{"low":"0x4e0ee90","high":"0x0"},"decimal":"81850000"},{"name":"mint_xtoken_amount","type":"Uint256","value":{"low":"0xddcca6c4d0005f6a88","high":"0x0"},"decimal":"4091477130717320669832"}]},{"name":"log_transfer","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"sender","type":"felt","value":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","decimal":"1429254172741197180224990385428922029712785460863743153995072894992221718817"},{"name":"receiver","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","decimal":"2015239384418070662545996670620251513189602993640407890987611048935996103896"},{"name":"amount","type":"Uint256","value":{"low":"0xddcca6c4d0005f6a88","high":"0x0"},"decimal":"4091477130717320669832"}]},{"name":"transaction_executed","transmitter_contract":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","arguments":[{"name":"hash","type":"felt","value":"0x61fb0f3732a9af7c37351238482e2f51e027955a7797c1202995efb9e49b620","decimal":"2769870621260243864720410720304924170034965633501098901776659096523367888416"},{"name":"response_len","type":"felt","value":"0x2","decimal":"2"},{"name":"response","type":"felt*","value":["0x4e0ee90","0x0"]}]}]')

      expect(organizedEvents).deep.eq(expected)

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

    it( 'organizeBlock problem blocks', async function () {
      const blocks = [13207/*502052/*12799/*436538/*386599/*386798/*269354/*322717, 269717, 269354, 269147, 269130, 268515, 268486, 268464, 68385, 268374, 254923, 235506, 231612, 231579, 167434, 183423, 190290, 161308, 164233, 62135, 111570, 38172, 36568, 27592, 17281, 71368, 71405, 200501, 1564, 1064, 86*/]

      const blockOrganizer = new BlockOrganizer(databaseApi)

      for(let i=0; i < blocks.length; i++) {
        const blockNumber = blocks[i]
        console.info(`organizing block ${blockNumber}`)

        const block = await databaseApi.getBlock(blockNumber)
        log(block)

        const organizedBlock = await blockOrganizer.organizeBlock(block!)
        log(organizedBlock)

        console.info(`done with block ${blockNumber}`)
      }
    })

    it('gets abi for contract and check memory cache', async() => {
      const mc = MemoryCache.getInstance()

      const contractAddress = '0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a'
      const abiBare = await databaseApi.getAbi(contractAddress, false)
      log(abiBare)

      const abiFromCache = await mc.get(contractAddress)
      log(abiFromCache)

      expect(abiBare).deep.eq(abiFromCache)
    })

  })

  describe('Api', async function() {

    const pathfinderApi = new PathfinderApi(pathfinderUrl)
    const feederApi = new FeederApi(network)
    const abiApi = new AbiApi()

    it('getBlock', async () => {
      const blockNumber = 254149

      const rp = await pathfinderApi.getBlock(blockNumber)
      log(rp)

      const expected = JSON.parse('{"status":"ACCEPTED_ON_L1","block_hash":"0x46fdb0a95fe3dd2b2fe42c203695a9453569d8780511e8b1b544831db5c4496","parent_hash":"0x744036377b66123f853c9a3cd3c693d56126e3c8f210c40996d1f4e4d32d2b0","block_number":254149,"new_root":"0x7a56b214a99e997900dc0fe1ca700446ec809605764697b0ccb642afad628c9","timestamp":1656430440,"sequencer_address":"0x46a89ae102987331d369645031b49c27738ed096f2789c24449966da4c6de6b","transactions":[{"type":"INVOKE","transaction_hash":"0x751d50ff915d7419bd28097f5f892edb61f8724020f2422e72746f243227fa9","max_fee":"0x902b612b957d","version":"0x0","signature":["0x17bff4a9959cac0a0dad00e5508085e554640bcdab30843f76ce712abf7ad2f","0x5ba00c40eec2710cdd7d4e0d9fa05172b186d84ba35167d0486d2ae3763a124"],"nonce":"0x0","contract_address":"0x41c75f125b94bc059ac563fd1fc9b642add134d357b9fed08efe44cb824cc3e","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x7d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7","0x3d8547b6c68e077c7862ac85905d9d1e46fd3388884bac5bcdec44b78d48459","0x3","0x3","0x6","0x7d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7","0x5af3107a4000","0x0","0x61016b41f3fab213de87c2531838f968f5e1595c6e12a02b306d739ed17b9f","0x5af3107a4000","0x0","0x7"]},{"type":"DEPLOY","transaction_hash":"0x746f43fa43b430314e90a2b378e2972f9be0184ba50c2b061e31524039e05d8","version":"0x0","contract_address":"0x5efada0f60a9439f8ea670c6bc941128e18288e8c046a5e475b6af2178566ed","contract_address_salt":"0x31c936833644f08f37caeabade98d1b2cf30b3dda8a36f205891d8f45f35d3b","class_hash":"0x4e733f6eb56ba1032e102312b52aaf7680f2a9f539970cd2791a57a0ad3f4c7","constructor_calldata":["0x63873932a873858aedacaa2f8bc36c05b766ec130017a41db62a3d265f3e689","0x7d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7"]},{"type":"DEPLOY","transaction_hash":"0x5be5cecf77a9b955cb3dd5be8938442a373d44e64e532b1ac72cee4a03623f0","version":"0x0","contract_address":"0x578cc14efae749e4dde162f3165687b30ec2197d10e3357de85cce75f447aab","contract_address_salt":"0x3b9e85e64131b6dcd6cb535bfdd2acc183bb06c7ac5e1729929ac74e8a6cc02","class_hash":"0x4e733f6eb56ba1032e102312b52aaf7680f2a9f539970cd2791a57a0ad3f4c7","constructor_calldata":["0x63873932a873858aedacaa2f8bc36c05b766ec130017a41db62a3d265f3e689","0x7d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7"]},{"type":"INVOKE","transaction_hash":"0x64d2e3972e6e0c8873e3087334a1dd2779089a5dcc577edb7bc9a90137fd558","max_fee":"0x0","version":"0x0","signature":[],"nonce":"0x0","contract_address":"0x73314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82","entry_point_selector":"0x2d757788a8d8d6f21d1cd40bce38a8222d70654214e96ff95d8086e684fbee5","calldata":["0xc3511006c04ef1d78af4c8e0e74ec18a6e64ff9e","0x71beb5d0a515e4ffc79d89c5875ca91d1b460423e76f005deb30cb6a5bae074","0x2386f26fc10000","0x0"]},{"type":"INVOKE","transaction_hash":"0x37f9eb704974d8d9d7ab155c7113c6050c3b187cfc2e6c02229ab214dfba723","max_fee":"0x0","version":"0x0","signature":[],"nonce":"0x0","contract_address":"0x73314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82","entry_point_selector":"0x2d757788a8d8d6f21d1cd40bce38a8222d70654214e96ff95d8086e684fbee5","calldata":["0xc3511006c04ef1d78af4c8e0e74ec18a6e64ff9e","0x1a17aa31e7af77aacd0aba8bdd9fe13af4ff0f693257d5433a89866e03887a6","0xaa87bee538000","0x0"]},{"type":"INVOKE","transaction_hash":"0x18241261b1a0993b5f96a1c9816de2c3ef47c8b21e67b8866414e38f7015d75","max_fee":"0x11e2a40d20d1","version":"0x0","signature":["0x5df6db48277ef175c1b9668466876d4ecbb0ae247956f5772108eb808df51aa","0x465e8892f95649814712276a494569b4cfef0450ecb8df0e3190ae362035c56"],"nonce":"0x0","contract_address":"0x25ac1ac309d53620133212ae909452a8248da3e5b7fece42c93836e455e530c","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e","0x0","0x3","0x3","0x4df9404286220c2b84476e25e5708415781769df64f11818695313844922220","0xb1a2bc2ec50000","0x0","0xb"]},{"type":"INVOKE","transaction_hash":"0x26189395cb68f48248e9efee65681a502dc24d888700b47c3786f29a7fe5658","max_fee":"0x482352d011ee","version":"0x0","signature":["0x4767262ae6469a6bbf3cf322b9fd436eae1022e619ce9b6bc801a858644918e","0x10e3330ea785aaaf7e72336d6b1a51b7ffb3bfa6c97ab54ae4b3dd5f951445d"],"nonce":"0x0","contract_address":"0x36d67686dd277ea1327b5795569a321f997011bd3ede7bc65458cd5139d632f","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x4bc8ac16658025bff4a3bd0760e84fcf075417a4c55c6fae716efdd8f1ed26c","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0x3276861cf5e05d6daf8f352cabb47df623eb10c383ab742fcc7abea94d5c5cc","0x3","0x9","0xc","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0xad78ebc5ac6200000","0x0","0xad78ebc5ac6200000","0x0","0xe094c7","0x0","0x2","0x4bc8ac16658025bff4a3bd0760e84fcf075417a4c55c6fae716efdd8f1ed26c","0x5f405f9650c7ef663c87352d280f8d359ad07d200c0e5450cb9d222092dc756","0x36d67686dd277ea1327b5795569a321f997011bd3ede7bc65458cd5139d632f","0x62bb2a31","0x11"]},{"type":"INVOKE","transaction_hash":"0x14e45a17c3c2733614b0aa20070753d163e47e89858de17e55c361542c09aae","max_fee":"0xcfb134c0e58","version":"0x0","signature":["0x43e334b96b9df5b61b60426d438e0f249312a93c5d7d65530fdd7b9aacd13e5","0x528c4784fdb642641b8510a900a415f55817ec9b8d99bb66c1bfd2133f8d1b3"],"nonce":"0x0","contract_address":"0x46358f112ba5d68f2fbbc95b533b044afd88e2ebcf374fea2ed72a888509510","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x1519c5764d311328928a4c2ca8458bb09a4aa234094113b5d68df76aeed6260","0x2f0b3c5710379609eb5495f1ecd348cb28167711b73609fe565a72734550354","0x0","0x3","0x3","0x46358f112ba5d68f2fbbc95b533b044afd88e2ebcf374fea2ed72a888509510","0x15af1d78b58c40000","0x0","0x2"]},{"type":"DEPLOY","transaction_hash":"0x124388adb8ba04c056b468313474ad15cf51403f0d661cbf8b419657bd6d91c","version":"0x0","contract_address":"0x3d2ca25e54320cb4d39bdb1796a82c27359f61e28b306d04f8248a48a54041f","contract_address_salt":"0x557540e183f69c1be0b0a63780e8d75e2b73411b6a35ea962928461d687278d","class_hash":"0x71c3c99f5cf76fc19945d4b8b7d34c7c5528f22730d56192b50c6bbfd338a64","constructor_calldata":["0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30"]},{"type":"INVOKE","transaction_hash":"0x4a951c8306296abf1bc819e04cc3c36ec8c7a9c540361631084fb59a7ed82a9","max_fee":"0x4a695e3ad8a2","version":"0x0","signature":["0x6ce70b0d1d54f083d92b67934fd333dd3edeb793b0922b157c48513674072f6","0x208ff60b19176278a8590f27e031a406a5f9f06deba05f7174c18fed307a60b"],"nonce":"0x0","contract_address":"0x64e75727671a44595fae016771cc5d33c03855a90b0c05e438699f4f2052f54","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x3","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x3","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x3f35dbce7a07ce455b128890d383c554afbc1b07cf7390a13e2d602a38c1a0a","0x6","0xa","0x10","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x5779480bcfaebfc","0x0","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x37ce5307507c51f2e","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0x5779480bcfaebfc","0x0","0x37ce5307507c51f2e","0x0","0x5239af3e4d7611c","0x0","0x347525163c4be69bc","0x0","0x16"]},{"type":"DEPLOY","transaction_hash":"0xa351ce36dde4b38a5111c16c19276c7e77e9bce03fa56554dce3996320968c","version":"0x0","contract_address":"0x1ecd88962392524ed64d18b824d3f6c253e4151896f3c5c6ddc416591300691","contract_address_salt":"0x27856b3d1dba3fc97c66eed05238d5a93db4bc138ec50ce47da776e1f840311","class_hash":"0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918","constructor_calldata":["0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328","0x79dc0da7c54b95f10aa182ad0a46400db63156920adb65eca2654c0945a463","0x2","0x27856b3d1dba3fc97c66eed05238d5a93db4bc138ec50ce47da776e1f840311","0x0"]},{"type":"INVOKE","transaction_hash":"0x42edb2b6341c7379e277bf9749da4d7bc32d9edf470ad25f1dd24c281a8f2ba","max_fee":"0x4a6bb9ba1618","version":"0x0","signature":["0x4b0b80736d58c45b35f36074e533246c4a1bdc704553cc5d607250602746458","0x3067a06ca20afefa96aa62e240e4aabc93f7e516c7796a37cc418c5443e172e"],"nonce":"0x0","contract_address":"0x54968abe6c665aa3f3704981079ba160b61eb86c50dc7bb76a4391d59d3648c","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x3","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x3","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x3f35dbce7a07ce455b128890d383c554afbc1b07cf7390a13e2d602a38c1a0a","0x6","0xa","0x10","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0xd8a4183f15778","0x0","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x8a3614c54d59d6c","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0xd8a4183f15778","0x0","0x8a3614c54d59d6c","0x0","0xcba47d310ee4c","0x0","0x81eb280124de818","0x0","0x30"]},{"type":"INVOKE","transaction_hash":"0x6fd3c87fad25bdd6dce226efc1bfc29d2adf5a3666e4939fd924d78a51e97a5","max_fee":"0x16f35fa6db18","version":"0x0","signature":["0x6df471c0632e45162bbb7f1eba72e0b7bfdacbabe6df8d742e6c93927c54bd7","0xc9bb1fd14d0f95fbc9c7a5d5d01ce90c4492757fd2393ffe0c0218a74c5855"],"nonce":"0x0","contract_address":"0x7afccccd171b5d67d5f0b350bbd6c0d2db313f2b56753b2c2f5a6158ef6066a","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x2810b322f1709382244cebec85e47098d2b913e910ae5d3650aaa46ba6526fe","0x6c65cd1e600b109afe7ed83702496be6e61fcf4eea5d745582be849bee092b","0x0","0x0","0x0","0x1"]},{"type":"DEPLOY","transaction_hash":"0x6fe39a2f1bb28ba6c66553285a169bbeef8c54e3d945679f2dc4b62ca024f25","version":"0x0","contract_address":"0x76d107652a97ac106116498a0e1883600edb71236f15cfacbced574bbdb4dbc","contract_address_salt":"0x7ce38d77afd75061ca376e639970e6261d7d05f50dd99e2a2512fc265c6cfe","class_hash":"0x4e733f6eb56ba1032e102312b52aaf7680f2a9f539970cd2791a57a0ad3f4c7","constructor_calldata":["0x63873932a873858aedacaa2f8bc36c05b766ec130017a41db62a3d265f3e689","0x7d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7"]},{"type":"INVOKE","transaction_hash":"0x7e76d2c9d53f90868d123f07da9bc93f9d5797c8002e6e0de799880c62e63ee","max_fee":"0x514da7688601","version":"0x0","signature":["0x402197455b30f45325fe53ed7f5f31ccf1f4416949bbdfb3d3647fe21bb55de","0x3987043d23287cdac5424dd6321b757a65310db93070a764ecb237085a84970"],"nonce":"0x0","contract_address":"0xebc55f1efc42e5c26c34ec2670322605c8b297f41f5c04545f5730976f19e6","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x73314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82","0xe48e45e0642d5f170bb832c637926f4c85b77d555848b693304600c4275f26","0x0","0x3","0x3","0x4a3e85c3287a9b34d5c680f2522f5df592695b70","0x429d069189e0000","0x0","0x0"]},{"type":"INVOKE","transaction_hash":"0x3413c91bfaeba77e5e121c62ae2b9f745b8fc196b5815649ff7d169d7ce53b0","max_fee":"0x0","version":"0x0","signature":[],"nonce":"0x0","contract_address":"0x73314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82","entry_point_selector":"0x2d757788a8d8d6f21d1cd40bce38a8222d70654214e96ff95d8086e684fbee5","calldata":["0xc3511006c04ef1d78af4c8e0e74ec18a6e64ff9e","0x2527a526fb51ee4175106065f5df77279bb86130d950b89fe55203e37f7f8dc","0x11c37937e08000","0x0"]},{"type":"DEPLOY","transaction_hash":"0x1fe8b705ed562089fbad19af1716b62e7d0b9579e41b854082956f088416fd1","version":"0x0","contract_address":"0x4114fc9c3ac47ba392f4985b487d45d106b5b7a5b40d7414403b9bc8f2c12f0","contract_address_salt":"0x2ad057466737fa38d456c815f8fb69305a01a814cf02c5f04053ba6692e50fe","class_hash":"0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918","constructor_calldata":["0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328","0x79dc0da7c54b95f10aa182ad0a46400db63156920adb65eca2654c0945a463","0x2","0x2ad057466737fa38d456c815f8fb69305a01a814cf02c5f04053ba6692e50fe","0x0"]},{"type":"INVOKE","transaction_hash":"0x71eff38c38cc9d3ce2b63c16481a98ab6e0d58190877ddc48b4de072959cfaf","max_fee":"0x11cd5876204a","version":"0x0","signature":["0x65b5afe6b1f7e928270c7aee99a333ca025a42eab7ac1dd05d4be42f9fb017f","0x3eca80cbda3dbee547efaf95f699b82b76c100ba669041ffbeeffd2f78643a1"],"nonce":"0x0","contract_address":"0x50a3ccb37f3a6c3d430d30b1711ca8905a93cf96093d666c4be9669288a6cae","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","0x2d9216304c3e598694ca48b525083fb32dad6bde996f422f32a4e998ceecd3e","0x0","0x2","0x2","0x3635c9adc5dea00000","0x0","0x1"]},{"type":"DEPLOY","transaction_hash":"0xe0ca9d5059775b7b715fcd571464173d821cb7899bb3dc5e904b9bcbd6f216","version":"0x0","contract_address":"0x6208e7739cb679fb3443c433a28f52fa877c58c5921324246daed078a437c63","contract_address_salt":"0x3a267e2b66d92352d44cb2c0965024aa997508f3e7c77023d2f415678950795","class_hash":"0x4e733f6eb56ba1032e102312b52aaf7680f2a9f539970cd2791a57a0ad3f4c7","constructor_calldata":["0x63873932a873858aedacaa2f8bc36c05b766ec130017a41db62a3d265f3e689","0x7d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7"]},{"type":"INVOKE","transaction_hash":"0x17dc9bc02668b9125b775951efd6b43bd67df6c69b5b3572861bff602adb84a","max_fee":"0x5c295adff1f9","version":"0x0","signature":["0x17924bc60178309f5f98a4a93ac0b9c07148a5229e2e9c46a34bf3daf13c1ed","0xde5a37919bcda82057d12d7a5c9c00b6654a15d6b3f0475cdf52fa7e5c287c"],"nonce":"0x0","contract_address":"0x4ee5944f247e9b1bd3cd44e147f4510b754845d87092ba6a4c1ae40f28177ca","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x4b05cce270364e2e4bf65bde3e9429b50c97ea3443b133442f838045f41e733","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0x2e875d1c86df033547c5c7839d8b6e3641de29ee1f708bbce99743b34272ada","0x3","0xa","0xd","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0xf7e0a1a220e","0x0","0x4bc8ac16658025bff4a3bd0760e84fcf075417a4c55c6fae716efdd8f1ed26c","0x5f405f9650c7ef663c87352d280f8d359ad07d200c0e5450cb9d222092dc756","0xf7e0a1a220e","0x0","0x36790478100202720","0x0","0x471665","0x0","0x4ee5944f247e9b1bd3cd44e147f4510b754845d87092ba6a4c1ae40f28177ca","0x62bb2a31","0x28"]},{"type":"INVOKE","transaction_hash":"0x6126b02cc46feaedf5c4a843ceb4092c8932fcb7ea41de424d100a4a262ee43","max_fee":"0x3636ad407a79","version":"0x0","signature":["0x30664d7d63c8f10f9a8b346c96498e617b80ed6daad181668518c07049210a4","0x1788b13e3337f835794a85569cb3e0d0eae52758d4b8e9f565581c8a0fdab23"],"nonce":"0x0","contract_address":"0x51b3d1615e9fb8eb56c7dce2b26535b63dba3f83726f308541a850f67054618","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x1b1ae4d6e2ef500000","0x0","0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x1b1ae4d6e2ef500000","0x0","0x3326db019368c9","0x0","0x4"]},{"type":"INVOKE","transaction_hash":"0x4c9c954eba264eca36b432715023641d3ad9f9c29c986f87be119ee1a0bb39b","max_fee":"0x4256b47fb536","version":"0x0","signature":["0x11705bca6110088ffa1e851eefc2e83d141d3bd811d8b77c5b546e6447ee85f","0x62898978a3986e70693af4ade84219a8ab505096fc498383a3b00e05c993fd3"],"nonce":"0x0","contract_address":"0x7d96621f71cf7d784e71298ddf1dd81b59118e97530f2bebdffd581a2188266","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x7394cbe418daa16e42b87ba67372d4ab4a5df0b05c6e554d158458ce245bc10","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x71faa7d6c3ddb081395574c5a6904f4458ff648b66e2123b877555d9ae0260e","0x15543c3708653cda9d418b4ccd3be11368e40636c10c44b18cfe756b6d88b29","0x3","0x6","0x9","0x71faa7d6c3ddb081395574c5a6904f4458ff648b66e2123b877555d9ae0260e","0x152d02c7e14af6800000","0x0","0x3","0x7394cbe418daa16e42b87ba67372d4ab4a5df0b05c6e554d158458ce245bc10","0x152d02c7e14af6800000","0x0","0x60f3cd6a7","0x0","0x11"]},{"type":"INVOKE","transaction_hash":"0x1d9789630249714b0ae1d7d32a6b4e41a6ace30c49050f9b9980c2202bf4517","max_fee":"0x365164e2885d","version":"0x0","signature":["0x5cba62e80318ebd36eedb9e1dc6f014ea99a50e2db3089714cb89abe584a88f","0x43cf8ce180ee73d6a84a05da9a6eb17f47b1bde7e1d4c31ac0a4e1dd4c1f24d"],"nonce":"0x0","contract_address":"0x5ae58c7f0642d12282678ae679035b8d697dbcae1df0993796b287d732d15fe","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x925f339257924","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0x925f339257924","0x0","0x5784780c4f8eb5c","0x0","0x43"]},{"type":"INVOKE","transaction_hash":"0x66bf06ecd59111c79e2c9bbdb77b5d1df30d912941b041d29c2431179dd69b7","max_fee":"0x11e2a40d20d1","version":"0x0","signature":["0x30fcdb1d662d660f6c5830ec1c471b9c0dbd35233f3ab2b36ae2c671200f270","0xab2c2de576e340b2f3b7ee93e0bf37de3e5dfcd25caddf26c2fd11473d831d"],"nonce":"0x0","contract_address":"0x195703e4c1a328232431d2d14c2d190a1e309df308d920e2348532d1c6ee44","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e","0x0","0x3","0x3","0x22f2c531d37bfab821e2521f6b02ed412f1c7ca164d0766b27e1733a17daf3f","0x38d7ea4c68000","0x0","0x6"]},{"type":"INVOKE","transaction_hash":"0x7f67ffabf8b0eb6b4f1f811f2329a159905c9435ddfa00e4f545b31c6efe39c","max_fee":"0xd21344d8361","version":"0x0","signature":["0x6ef7b72627853550c91ed1caecd954b144a80d1b6a9df62930d8e0db10c6c25","0x76c07ec02b2af1f91e4fb9fc107f275db717f8ab79c5f6fc753429a379a6fc2"],"nonce":"0x0","contract_address":"0x74f615eb2688eab5a69eb2be69dbaf8e2ef5ce4f2d3ee9433995df95dfa2fa7","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x69202aeae73af1c685003f68de5edd3eafcc702e3b1125c5e24fe6b6ccbc0e6","0x2f0b3c5710379609eb5495f1ecd348cb28167711b73609fe565a72734550354","0x0","0x2","0x2","0x56bc75e2d63100000","0x0","0x5"]},{"type":"INVOKE","transaction_hash":"0x6014c098b81b5eb5902ba3fac7ae6742e65a128210706565c8ff824e1ffae18","max_fee":"0x42edc1e80bfa","version":"0x0","signature":["0x4cd90749846d8cc409724a242aa5d7e256ec04729a61357301f033787cfe66e","0xc65eb3e989e2b4318f167d2f7518c0db4683c9622930c2066d150d88dd4aaf"],"nonce":"0x0","contract_address":"0x315e364b162653e5c7b23efd34f8da27ba9c069b68e3042b7d76ce1df890313","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x13befe6eda920ce4af05a50a67bd808d67eee6ba47bb0892bef2d630eaf1bba","0x3451875d57805682e40d0ad8e604fc4cc5f949d14ca8228d4a2eaeee7f48688","0x0","0x21","0x21","0x8","0x6274632f757364","0x4623415dd66c1400000","0x62bb1d88","0x657175696c69627269756d2d667478","0x6574682f757364","0x40c267c2bce9a40000","0x62bb1d88","0x657175696c69627269756d2d667478","0x736f6c2f757364","0x20bebd2ba8aef4000","0x62bb1d88","0x657175696c69627269756d2d667478","0x617661782f757364","0x1141776582c024000","0x62bb1d88","0x657175696c69627269756d2d667478","0x646f67652f757364","0xf744d4cc5dfff8","0x62bb1d88","0x657175696c69627269756d2d667478","0x736869622f757364","0x9bd9dbedc00","0x62bb1d88","0x657175696c69627269756d2d667478","0x6274632f7573642d3230323230393330","0x46496b5444786800000","0x62bb1d88","0x657175696c69627269756d2d667478","0x6574682f7573642d3230323230393330","0x408ae4e7ee4c140000","0x62bb1d88","0x657175696c69627269756d2d667478","0x8475"]},{"type":"INVOKE","transaction_hash":"0x4e556c381d3e2aee46f12a8d391f5e975397fa227fa491d806b97a232111e47","max_fee":"0x1ed890987973","version":"0x0","signature":["0x1674b8dac27e3574fba03e40e03d3745392db786285ee2321236aaf63442e33","0x4de1336036519276859dcf921306aa57a6610f0dac765ddae5ccc6e07394adb"],"nonce":"0x0","contract_address":"0x4b059f482d48573936c87762fabc7fe957d8178583358925bf81a5956afd526","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x13c56add3ee9699228614221602165185b49f712cae90fc20c608d7ecc1521b","0x2f0b3c5710379609eb5495f1ecd348cb28167711b73609fe565a72734550354","0x0","0x2","0x69202aeae73af1c685003f68de5edd3eafcc702e3b1125c5e24fe6b6ccbc0e6","0x2f0b3c5710379609eb5495f1ecd348cb28167711b73609fe565a72734550354","0x2","0x2","0x4","0x56bc75e2d63100000","0x0","0x56bc75e2d63100000","0x0","0xe"]},{"type":"INVOKE","transaction_hash":"0x2a53a95006352aeacf1020a99dad2ef9042ecbc4d2ee244f7c53b9f516ab249","max_fee":"0x365179005fbe","version":"0x0","signature":["0x10113c593b50bbaacf5e909f607b8ec63aa6b7cd649724a7a232e274ee8c0a5","0x1567811304f44a904f36155a31e360a33dd66ceab59cb6a2f48de7343093939"],"nonce":"0x0","contract_address":"0xa9ccfd57cffd3c1956759ccb82df066ac3ae6871b3fdefdc83d6c79aa93e3e","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x38d7ea4c68000","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0x38d7ea4c68000","0x0","0x21fc85888260848","0x0","0x4"]},{"type":"INVOKE","transaction_hash":"0x40aeac77c4f9e25ea88e13809b11f5860a25ac73a0b9c3bf2088dc8b1456c1c","max_fee":"0x3508d983e816","version":"0x0","signature":["0x553bebab6497a81fe82e6bb3c181e6dd06226be8752f20b866a1aff2f5e7122","0x7efbadea5a127e9b5e024fea9625f33e952dbe8a0a084c2bb89f2ecf20ea3c5"],"nonce":"0x0","contract_address":"0x7be87a2bf3cbdbfe471fe3e61ebd61038ba24d511130ee38727d9d6775fbda1","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a","0x2f0b3c5710379609eb5495f1ecd348cb28167711b73609fe565a72734550354","0x0","0x5","0x5","0x7be87a2bf3cbdbfe471fe3e61ebd61038ba24d511130ee38727d9d6775fbda1","0x3","0x697066733a2f2f6261666b72656966666d70617962776d6e617576746d636b","0x336a66787964697778366479633533693633707a646b64323676736a697534","0x65716d71","0x7c"]},{"type":"INVOKE","transaction_hash":"0x31994df7f2c71cb05c0983971bf33f0dc3648a3f377e0c9e5922f1cb183ffcf","max_fee":"0x11e03b24a91a","version":"0x0","signature":["0xd5c91f47b9389c83c95ee348d58ec682e038be91c3035f588a6994b828b6b9","0x22f8532a1afad55ec9bbfed9ff2ac6ec2878505463ac367988a933f5a5c4a3f"],"nonce":"0x0","contract_address":"0xd7142df7535f50bcd1269281c9ff3e1e700fff6744af038135ddcfceafbca4","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e","0x0","0x3","0x3","0x3395a3b758241b83096541406cc457f3fb026877607d28dbc6e403cfb53917f","0x2ff62db077c000","0x0","0x29"]},{"type":"INVOKE","transaction_hash":"0x5ac9327d841d32d730ccbd5cecb2148457eccf4275a830b8c2f3cc5012c367e","max_fee":"0x3397a647d06d","version":"0x0","signature":["0x3c0ac752a3d75c395b3c99654b48bab0cbd7afa3eb18525adf597749f7372b","0x400ac7c37f625ba0ea01b3b6cb035dded8107b4796fd9bd420493a7869567fb"],"nonce":"0x0","contract_address":"0x315e364b162653e5c7b23efd34f8da27ba9c069b68e3042b7d76ce1df890313","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x13befe6eda920ce4af05a50a67bd808d67eee6ba47bb0892bef2d630eaf1bba","0x3451875d57805682e40d0ad8e604fc4cc5f949d14ca8228d4a2eaeee7f48688","0x0","0x19","0x19","0x6","0x6274632f757364","0x462f2360ad0d0400000","0x62bb1d8c","0x657175696c69627269756d2d636578","0x6574682f757364","0x40be850038b0880000","0x62bb1d8c","0x657175696c69627269756d2d636578","0x736f6c2f757364","0x2112f5e11ae3d8000","0x62bb1d8d","0x657175696c69627269756d2d636578","0x617661782f757364","0x120d0971646164000","0x62bb1d8d","0x657175696c69627269756d2d636578","0x646f67652f757364","0xf83a651274e000","0x62bb1d8d","0x657175696c69627269756d2d636578","0x736869622f757364","0x9c941fa5000","0x62bb1d8d","0x657175696c69627269756d2d636578","0x8476"]},{"type":"INVOKE","transaction_hash":"0x2f471c4e85d1ed2899ca4d5cdb3b5b6902af9ef7ec5e6d117d15a2a585641f9","max_fee":"0x2441a828aea2","version":"0x0","signature":["0x1fb24ab4b8d3d369cdc17040766e28debc3f84bb09b7b9b5f2390815fd1d78b","0x3467f47d748b04f8d235f4dd12a3322dc9bbdf892a36be2f8931edcdf5d3552"],"nonce":"0x0","contract_address":"0x315e364b162653e5c7b23efd34f8da27ba9c069b68e3042b7d76ce1df890313","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x13befe6eda920ce4af05a50a67bd808d67eee6ba47bb0892bef2d630eaf1bba","0x3451875d57805682e40d0ad8e604fc4cc5f949d14ca8228d4a2eaeee7f48688","0x0","0x11","0x11","0x4","0x6274632f757364","0x461bd0394dc34400000","0x62bb1d94","0x657175696c69627269756d2d6269747374616d70","0x6574682f757364","0x40b70689151dd00000","0x62bb1d95","0x657175696c69627269756d2d6269747374616d70","0x617661782f757364","0x11280ad33793a0000","0x62bb1d97","0x657175696c69627269756d2d6269747374616d70","0x736869622f757364","0x9f32ad05800","0x62bb1d97","0x657175696c69627269756d2d6269747374616d70","0x8477"]},{"type":"INVOKE","transaction_hash":"0x67aa6a4a001fd4c69e2d122c50fc6ed3362e8b2fb4ad7cc7563e083066deded","max_fee":"0x36515e2deb3b","version":"0x0","signature":["0x2306812b1107fab55116735cc00d124bb3af4ab80861e248ebfc925e1653db1","0x794fecba5d844612b4ede26a7b689f0d293e98050f3e5d9c0367839e9ca2076"],"nonce":"0x0","contract_address":"0x788ba6d94bcc41ba7b7cbf8e39b11ef9dc34868b698c0adb6459e39919ff8f2","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0xdc2379968a3800","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0xdc2379968a3800","0x0","0x839b9f89788ce9a0","0x0","0x0"]},{"type":"INVOKE","transaction_hash":"0x11fa5c3546de5e901a117d34bf7c2c538b17a2ea9d67c70050abb13cc90346b","max_fee":"0x36515e2deb3b","version":"0x0","signature":["0x6d5b501e57c30fdd15d286d9b286aaef3f710f061a8139ee386ded03d2f91ca","0x258cb02209c3db26067d61ac7de751fa8af81acfb848938598a80159c23fd38"],"nonce":"0x0","contract_address":"0x2ce4f74e72387245ac47b83e96fe3f2bba21e5781003149c99f2bbfe7bbf564","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0xc843c2f7aa9800","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0xc843c2f7aa9800","0x0","0x77ba3bb678093778","0x0","0x0"]},{"type":"INVOKE","transaction_hash":"0x560fe8fbf93221d6037f6a366513c139f4fff8cb9d8ebb934203d7aec488701","max_fee":"0x365179005fbe","version":"0x0","signature":["0x6014ffa55976c439bb805dbefb1346c7cea04e3720607e9c70df978474f2ab3","0x1daa544d6c9dda03790c857047261b345b79ed8783d64c18e746d533227ecb1"],"nonce":"0x0","contract_address":"0x1e5e449d49e5119bf7685d0d4f4f75267291cdc6939f8b65f640f4035773492","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0xaaf96eb9d0d000","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0xaaf96eb9d0d000","0x0","0x6637b4de16ae5a00","0x0","0x0"]},{"type":"INVOKE","transaction_hash":"0x1dd8d4d5459cf752e5179caf6b93bfc01d88fe1b6a76c87cd6aeb09cf0d302e","max_fee":"0x36515e2deb3b","version":"0x0","signature":["0x153205a2a658cd9ec7dbc4c086b5feb5d59ee4d046a44208b9b9d4f2c2532e3","0x2007edc38bc3b47af84f0bf2b90f3446b3717de3a60da6579dd2f6b55f78c12"],"nonce":"0x0","contract_address":"0x41f5c3896ad2902bea4e6d031227a2ad0fba3ad86245d8115b95e844e3f28f","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0xc4afe68260a7fb","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0xc4afe68260a7fb","0x0","0x7596bbf4b92551e0","0x0","0x0"]},{"type":"INVOKE","transaction_hash":"0x618340a1877ad61e4ad422aed8aec36f1f04b7350c42e501056fbd81ab169d8","max_fee":"0x36514a1013da","version":"0x0","signature":["0x3d4a2ff44a85420133d8ef89d84bf90f1d30b49e80a25939336b998b61dae49","0xec3bd88771c5b67aab739c6d349c357cf284bd5bed5fea9134fb7fc275c0e3"],"nonce":"0x0","contract_address":"0x2492355c051f50a204f19c9a8a3066c63ce78af595341cdae9205ead86e4bc","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0xa22556938c8000","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0xa22556938c8000","0x0","0x60f097c689d0bec8","0x0","0x0"]},{"type":"INVOKE","transaction_hash":"0x66adefe99643fd5cab47351e6e5c891e0f1a115c1bf4a9b32e637c441f9369e","max_fee":"0x36514a1013da","version":"0x0","signature":["0x7e2fb9714728a7ce17311b1c34b783a9e0b3cb70dbbc82f582a6e7874e7f6fa","0x7e3d500a2cb272d72d0c5fafe49262b5db44339dc75f8c6c55723076a4f2ed2"],"nonce":"0x0","contract_address":"0x35faaddc7e2be5f4f75f075920065df3c62c6d3af1e57564113a2e70500233d","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x115975e57867000","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0x115975e57867000","0x0","0xa5f396619260a440","0x0","0x0"]},{"type":"INVOKE","transaction_hash":"0x8384468edf44a002a41d18ccf477520789568355871c089b499cc042a1a445","max_fee":"0x365179005fbe","version":"0x0","signature":["0xa63a2cc1e2f005655d92f932324750a4d6410ba5fa860398d470214202c193","0x68645a29541604ae1dffa75bf7929bcf66db1ae863520ee5c6c46f5bb8cbc33"],"nonce":"0x0","contract_address":"0x75dcea457d8ad7924f4df8b7ccc39e346b2eca50cab7d5c37773a2c5cdcad08","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0xc777201297880a","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0xc777201297880a","0x0","0x773fe7055ca310d8","0x0","0x0"]},{"type":"INVOKE","transaction_hash":"0x849718217a1eac69848d15c4da68536ea0c62826d1a4269a0a6debd8907d3b","max_fee":"0x365179005fbe","version":"0x0","signature":["0x34b26d6b64ce77a31003484fe35c5c5acb8559d70d883eb2760f81c378ce3bc","0x317cbb7ffc71fdb636f509aa98421a5cfe12ff078c4424f0d9f5cc8704ca2c4"],"nonce":"0x0","contract_address":"0x217138cce2f3462465731627c962369d879e0a0922779ae71247f23fae2a04e","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0xc868989bc7a000","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0xc868989bc7a000","0x0","0x77d040b70f2c4c38","0x0","0x0"]},{"type":"INVOKE","transaction_hash":"0x759f84024b0fc25af43265ce727f61c7b9034c4608e848fa32c91c269ce197b","max_fee":"0x365179005fbe","version":"0x0","signature":["0x7b2342810b2652fb9b3e2998b6b285b7f919b69c54cc1844dea750b9e6334d1","0x71070b7b9b225fad99aea72d77faae48940469fac5d7a0742bf79eaba6591d2"],"nonce":"0x0","contract_address":"0x9df819708eb7234a263779617289b7d406a6fae49a3f4747790c5f96f48cd6","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0xd76d7c279157f6","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0xd76d7c279157f6","0x0","0x80cab298ec621f78","0x0","0x0"]},{"type":"DECLARE","transaction_hash":"0x626b93f71c364e49b579faaa25b023be16bd5fc5e7ad3bdfd899844095f546a","max_fee":"0x0","version":"0x0","signature":[],"nonce":"0x0","class_hash":"0x673e3747b6f9cc2daf2c1f4766bd2ff809d7b6b2f09ac15ecaf33004716f188","sender_address":"0x1"},{"type":"INVOKE","transaction_hash":"0x4cdd5f891ea107b05c3d36c49cb9afea474195736beaadc9fe18c99ad6461e6","max_fee":"0x51f8761ef969","version":"0x0","signature":["0x210bf2f6e97010a35308dffa8d3e8a777645fc173380c195867af965711e4f4","0x2abcaed0922201f8555b2d8ab1196dfb4f52718d48a8521117a89e82b22e00"],"nonce":"0x0","contract_address":"0x4ee5944f247e9b1bd3cd44e147f4510b754845d87092ba6a4c1ae40f28177ca","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x20d17664962dc4b49ab65b4b89555f383f040da5f62c18a0834acea246bc7b7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0x2e875d1c86df033547c5c7839d8b6e3641de29ee1f708bbce99743b34272ada","0x3","0xa","0xd","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0x70038f7a182","0x0","0x1ca5dedf1612b1ffb035e838ac09d70e500d22cf9cd0de4bebcef8553506fdb","0x5f405f9650c7ef663c87352d280f8d359ad07d200c0e5450cb9d222092dc756","0x70038f7a182","0x0","0x1072bbfbd92670a9","0x0","0x2f71fef","0x0","0x4ee5944f247e9b1bd3cd44e147f4510b754845d87092ba6a4c1ae40f28177ca","0x62bb2ad3","0x29"]},{"type":"INVOKE","transaction_hash":"0x29f52a09c6017eaecfbfe648865c24247d98f8cdb9aec8a829f6247e30a4e12","max_fee":"0x365179005fbe","version":"0x0","signature":["0x14cee26305617e2e434481c9675e671d9c7aec233f6331bb1703b4ba175b5cf","0x218bbdf625f997641f17096976e9b90c1dd6ca8a9ca52f85dce77d3c8c462db"],"nonce":"0x0","contract_address":"0x7942d63445468770f39c38e1e360e30152ef7c7a8b34724f3357d7bf034d1e1","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x3","0x6","0x9","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0xc86f6ad69d97fb","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0xc86f6ad69d97fb","0x0","0x77d4549ab48200d8","0x0","0x0"]},{"type":"DEPLOY","transaction_hash":"0x9219218d82dfa2f2249b846f4742c39fcbacb4e5d7a2ad04c2dca224891f11","version":"0x0","contract_address":"0x1101328b506cb1b4d42adaea479e3861224f2d18db14eac8944a475fa557936","contract_address_salt":"0x20e0125b7769ab1b5ad9d4caa291f737ce82f95617ef8e43d320002094130c3","class_hash":"0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918","constructor_calldata":["0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328","0x79dc0da7c54b95f10aa182ad0a46400db63156920adb65eca2654c0945a463","0x2","0x20e0125b7769ab1b5ad9d4caa291f737ce82f95617ef8e43d320002094130c3","0x0"]},{"type":"INVOKE","transaction_hash":"0x6931fb0b53b6b9c01d9e16b395e8afc9bfdd26657eecb688097bbb9c3fa460c","max_fee":"0x4a6d7aff35a1","version":"0x0","signature":["0x49103fe002c3c43558f7b3153272bc2562604a97f8bc874e30cdb85c0904ce7","0x7f0f7e9809f49ae10bbfa29aa7127adfeca0ca1f0127618139743aac7d4a759"],"nonce":"0x0","contract_address":"0x16caea2f86cfdc30ff7c77c5ed88c5ad9d978604cfb944f09008f9871446d6a","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x147fd8f7d12de6da66feedc6d64a11bd371e5471ee1018f11f9072ede67a0fa","0x3","0x8","0xb","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x917fc9dbad2904","0x0","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","0xcca1844bc84c","0x0","0x65baac4f7f489a90","0x0","0x917fc9dbad2904","0x0","0x3"]},{"type":"INVOKE","transaction_hash":"0x7d946d0fcb4b638c5a9cc34ca712222e910703b33c00f47b6620652b5e6d813","max_fee":"0x21a6bbdb5000","version":"0x0","signature":["0x72abc9c5549c4855c39c24b0b9e10214c01d1566caba406ec39f92b3f04a30a","0x15a13332f79ab6d06a474cdcdb2b1c4fb09d60080ca6a6e3b7041b3bc4ad334"],"nonce":"0x0","contract_address":"0x55ea24956b09e30df7c7e45be17e409ba6d5efe9c191221cfac38bdabc09926","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x266b1276d23ffb53d99da3f01be7e29fa024dd33cd7f7b1eb7a46c67891c9d0","0x1fdac690af4653a82a099740177724f266c024b5eb2af5ad5a85980b29c2fb1","0x0","0xb","0xb","0x55ea24956b09e30df7c7e45be17e409ba6d5efe9c191221cfac38bdabc09926","0x74930f52b9c44496996e8c25669a6e3a","0x1","0x1","0x3b","0x0","0x4","0x68747470733a2f2f6170692e627269712e636f6e737472756374696f6e2f73","0x746f72655f6765742f30783132313235373439653138303935356130663139","0x63613533393930326662663132303630383132643834353531376331303030","0x303030303030303030303030","0x3"]},{"type":"INVOKE","transaction_hash":"0x2da838ca12ff705c6e2495e2c9757640aeabdf5cef8db97eef39c1dbc8f05f6","max_fee":"0x11cd5876204a","version":"0x0","signature":["0x1649d4d39ef93785e032802273d398664e5d4ed019c9dc5701f2dc42cd00270","0x676f9265011d94f411bc5deab6da607f51fa11e105f9134742e8c9a9c9d46bc"],"nonce":"0x0","contract_address":"0x6763725b9a363d298671b7286216e681eb75d8d036f98abbd2184c80b122390","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","0x2d9216304c3e598694ca48b525083fb32dad6bde996f422f32a4e998ceecd3e","0x0","0x2","0x2","0x3635c9adc5dea00000","0x0","0xc"]},{"type":"INVOKE","transaction_hash":"0x692852a4895ad026b899bc07f3a2e1d42827a6895547683423b07b3d3bc674","max_fee":"0x42798ad80894","version":"0x0","signature":["0x341b751585b9fd8ef0594d52442bb5856b9fabae639e4a61bb2d082c69bc636","0x482de36d0b8408b58cceb7147b0d982e8379605c16eca44b70be54cb7301f18"],"nonce":"0x0","contract_address":"0x54968abe6c665aa3f3704981079ba160b61eb86c50dc7bb76a4391d59d3648c","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","0x275a04a881f3581bb37abd5d7c7d3718faaef2c32eaf7f90693c3a29cf473ee","0x3","0x4","0x7","0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","0x8ac7230489e80000","0x0","0x8ac7230489e80000","0x0","0x54968abe6c665aa3f3704981079ba160b61eb86c50dc7bb76a4391d59d3648c","0xb7","0x31"]},{"type":"INVOKE","transaction_hash":"0x61a93e08ce206e691e0c332844deb416920d0df23077e93a6b608af9d598ab9","max_fee":"0x5c290a689473","version":"0x0","signature":["0x575d0919a26cfb95e2b028498c9bdc7d742f09dc0bd021ec29c0b282d599e35","0x46601957517a66dad36f62b309332b36aaff905f0e88a32abb20d0b55598745"],"nonce":"0x0","contract_address":"0x4ee5944f247e9b1bd3cd44e147f4510b754845d87092ba6a4c1ae40f28177ca","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x682bde101e0fa17bb61d867a14db62ddd192d35cc4ad2109e91429e2e4fca17","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0x2e875d1c86df033547c5c7839d8b6e3641de29ee1f708bbce99743b34272ada","0x3","0xa","0xd","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0x66975deeba23a50de","0x0","0x24da028e8176afd3219fbeafb17c49624af9b86dcbe81007ae40d93f741617d","0x4bc8ac16658025bff4a3bd0760e84fcf075417a4c55c6fae716efdd8f1ed26c","0x66975deeba23a50de","0x0","0xe5488ddecc8dff89","0x0","0x2e3d1cbab0bbe460a0","0x0","0x4ee5944f247e9b1bd3cd44e147f4510b754845d87092ba6a4c1ae40f28177ca","0x62bb2ad3","0x2a"]},{"type":"INVOKE","transaction_hash":"0x3c64abbb29de5697d17306126dc65fa695cc475db2610914f09b6ac69c25750","max_fee":"0x902b5a78952a","version":"0x0","signature":["0x78fe3fd58166704f68d4c8b019c21297de004fdb02def55d76ba4e36a7858f8","0x4becbb79632c0a6b1e3aa60747c09559c15b2ff1657e63a078feb9fb272efd7"],"nonce":"0x0","contract_address":"0x2e2ff30a1686aaf973b2c1a1cb6b82149b8c70cfc3d32b90f1a619888075782","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x7d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7","0x3d8547b6c68e077c7862ac85905d9d1e46fd3388884bac5bcdec44b78d48459","0x3","0x3","0x6","0x7d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7","0x1c6bf52634000","0x0","0x504f0a55ecd74102da3c7deafb50f1829150c67060059fef5e5b53145b8ba5d","0x1c6bf52634000","0x0","0x4"]},{"type":"INVOKE","transaction_hash":"0x3d83dbd7c5416aa243a99dd982bba322b9cb3bc0ee8744d984ba87ef344404f","max_fee":"0xccfdd6b869a","version":"0x0","signature":["0x306d9562801ee52c9ff264fae239fd47d95dd5a1e5418423e96fe50a5b99958","0x733b47e8cec4427a285a257c1fa4bdaaa9082042c324a11c18443d02d24b19e"],"nonce":"0x0","contract_address":"0x22071bfa50854ee615d214d91ba6502a6dc13d0c6b686e17535b480d2c7c1fa","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x3","0x37c320cf53f24747cb6afd1c23d0bf9ca33dcf8840764df11f8f8c8c0cd685c","0xffffffffffffffffffffffffffffffff","0xffffffffffffffffffffffffffffffff","0x5"]},{"type":"DEPLOY","transaction_hash":"0x22c7dfd5a93e2aeec2efa910020ba1fa12b781f08533ede29b8a0dfafe62a61","version":"0x0","contract_address":"0x7cf357c84519241d8903a681fcacd82752a496b812b1cdc4c12c7a686023c31","contract_address_salt":"0x4287214dc91d309aed9fa22721272b63e8dc0d1dc7e06aaeeca58c28bdfd086","class_hash":"0x4e733f6eb56ba1032e102312b52aaf7680f2a9f539970cd2791a57a0ad3f4c7","constructor_calldata":["0x63873932a873858aedacaa2f8bc36c05b766ec130017a41db62a3d265f3e689","0x7d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7"]},{"type":"INVOKE","transaction_hash":"0x7d5316ada8cd96f0d33c890408b1e0bc18a7e07f949f03857929d1d270c74b5","max_fee":"0x5c4342a2f8eb","version":"0x0","signature":["0x10ca22eb0786594f4f5b1d21c35bb3d782569675f3b22aa2d8c79e322afa002","0x6279172a58a370ceb0088c26a33b44ecb93732538a6377ec953d67e90a95ad3"],"nonce":"0x0","contract_address":"0x639f7ad800fcbe2ad56e3b000f9a0581759cce989b3ee09477055c0816a12c7","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x3","0x4bc8ac16658025bff4a3bd0760e84fcf075417a4c55c6fae716efdd8f1ed26c","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x24da028e8176afd3219fbeafb17c49624af9b86dcbe81007ae40d93f741617d","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x3","0x3","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0x2cfb12ff9e08412ec5009c65ea06e727119ad948d25c8a8cc2c86fec4adee70","0x6","0xc","0x12","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0x18650127cc3dc80000","0x0","0x1ea2f12a70ad6a052f99a49dace349996a8e968a0d6d4e9ec34e0991e6d5e5e","0x78f70877d9c7a9e7","0x0","0x4bc8ac16658025bff4a3bd0760e84fcf075417a4c55c6fae716efdd8f1ed26c","0x24da028e8176afd3219fbeafb17c49624af9b86dcbe81007ae40d93f741617d","0x18650127cc3dc80000","0x0","0x78f70877d9c7a9e7","0x0","0x1845c78cb805270000","0x0","0x785c32aa73922f73","0x0","0x639f7ad800fcbe2ad56e3b000f9a0581759cce989b3ee09477055c0816a12c7","0x62bb2ad3","0x52"]},{"type":"INVOKE","transaction_hash":"0x2bac277c73bc461f8a17f08407beede5343c92a59193e399d75f188a3c190b5","max_fee":"0x7dded6b28fa0","version":"0x0","signature":["0x23b57787398fed5a65190e7df5843270244636c423dd02193a7811665c87fd1","0x6702177e920e8ab86e895ca5c81157a107a60baa2fc8191e9f90f2e5f38bb85"],"nonce":"0x0","contract_address":"0x7f687b2201d442da20ed442187627ee8f1d927a629c675e59b1eb75dd7e28dd","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x4","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x38bd0f8aff67ade736159d373cf3399d15529445b147b6b3348cc96cdf66ad8","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x3","0x3","0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","0x275a04a881f3581bb37abd5d7c7d3718faaef2c32eaf7f90693c3a29cf473ee","0x6","0x4","0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","0x3d8f0bbd457efc0692bc16527634bedff5271c235011444e305f9d0ac580b7a","0xa","0x5","0xf","0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","0x33590a6584f20000","0x0","0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","0x507dbd4531440000","0x0","0x33590a6584f20000","0x0","0x7f687b2201d442da20ed442187627ee8f1d927a629c675e59b1eb75dd7e28dd","0x2da","0x38bd0f8aff67ade736159d373cf3399d15529445b147b6b3348cc96cdf66ad8","0x507dbd4531440000","0x0","0x7f687b2201d442da20ed442187627ee8f1d927a629c675e59b1eb75dd7e28dd","0x2da","0xd"]},{"type":"INVOKE","transaction_hash":"0x96bca2a93a5988982585eccc8846848cb951c12df2e553e3fe05d475ac45c1","max_fee":"0x15dc0da2ac61f","version":"0x0","signature":["0xc8b0434cea3b0caa01f7d7a2f257b19bcc8ab4a067f947147ca79a32212d6a","0x3987c30080eb563850e738ce0a7a10fccdc63d509a29dba464deb8f0651ff31"],"nonce":"0x0","contract_address":"0x183daef6600eb82f8cc81866d8080c4ebab6c35dcf27cc8a5ea3ceb1ba9b131","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x2","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c","0x0","0x3","0x63873932a873858aedacaa2f8bc36c05b766ec130017a41db62a3d265f3e689","0x2a59b977c189479e8a62dbc48abe7fd3f85d4aa59c1e5c91a43b699fe973a8f","0x3","0x28","0x2b","0x63873932a873858aedacaa2f8bc36c05b766ec130017a41db62a3d265f3e689","0x38d7ea4c68000","0x0","0x7b61085d008c8419883b7c05f618efff203cd0259c3bdbe31e8474c71119126","0x416c6578","0x5a4b457468","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0xa","0x0","0x38d7ea4c68000","0x0","0x8ac7230489e80000","0x0","0x4","0x1","0x1","0x2","0x2","0x7","0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","0x6d0845eb49bcbef8c91f9717623b56331cc4205a5113bddef98ec40f050edc8","0x38bd0f8aff67ade736159d373cf3399d15529445b147b6b3348cc96cdf66ad8","0x7394cbe418daa16e42b87ba67372d4ab4a5df0b05c6e554d158458ce245bc10","0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","0x0","0x3","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x2c0f7bf2d6cf5304c29171bf493feb222fef84bdaf17805a6574b0c2e8bcc87","0x0","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x3f35dbce7a07ce455b128890d383c554afbc1b07cf7390a13e2d602a38c1a0a","0x0","0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","0x147fd8f7d12de6da66feedc6d64a11bd371e5471ee1018f11f9072ede67a0fa","0x0","0x5af3107a4000","0x0","0x1158e460913d00000","0x0","0x2a30","0x1","0x3"]},{"type":"INVOKE","transaction_hash":"0x3f55387ae64ffd57c36f2147b531bc6b1197bde1b58282d3ccb15c5af7c8af4","max_fee":"0x11cd5876204a","version":"0x0","signature":["0x25493003562b603e6e67ad5b06f1784081f0200c7f6cdc2aad0cc4e094bc98b","0x744caa46ac9b765fa1ca0a8bdf64cfe68e05fe08fea1283515ac961d43c15d3"],"nonce":"0x0","contract_address":"0x50a3ccb37f3a6c3d430d30b1711ca8905a93cf96093d666c4be9669288a6cae","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","0x2d9216304c3e598694ca48b525083fb32dad6bde996f422f32a4e998ceecd3e","0x0","0x2","0x2","0x3635c9adc5dea00000","0x0","0x2"]}]}')

      expect(rp).deep.eq(expected)

      const rf = await feederApi.getBlock(blockNumber)
      log(rf)
    })

    it('getContractAbi 0x6715e129c11f1c5ec5ea460115de61e7d21f9e6873cb27109bc0bb3339acf53', async () => {
      const contractAddress = '0x6715e129c11f1c5ec5ea460115de61e7d21f9e6873cb27109bc0bb3339acf53'

      expect(pathfinderApi.getContractAbi(contractAddress)).to.throw

      // // TODO the abi at the latest block is larger than expected in old tests; try calling with a block number 272955 where it was deployed https://goerli.voyager.online/contract/0x06715e129c11f1c5ec5ea460115de61e7d21f9e6873cb27109bc0bb3339acf53
      const expectedOld = JSON.parse('[{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"inputs":[{"name":"implementation_address","type":"felt"}],"name":"constructor","outputs":[],"type":"constructor"},{"inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"__default__","outputs":[{"name":"retdata_size","type":"felt"},{"name":"retdata","type":"felt*"}],"type":"function"},{"inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"__l1_default__","outputs":[],"type":"l1_handler"}]')

      const expected = JSON.parse('[{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"inputs":[{"name":"implementation_address","type":"felt"},{"name":"initializer_selector","type":"felt"},{"name":"calldata_len","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"constructor","outputs":[],"type":"constructor"},{"inputs":[],"name":"get_implementation","outputs":[{"name":"implementation","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"__default__","outputs":[{"name":"retdata_size","type":"felt"},{"name":"retdata","type":"felt*"}],"type":"function"},{"inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"__l1_default__","outputs":[],"type":"l1_handler"}]')

      const rf = await feederApi.getContractAbi(contractAddress)
      log(rf)

      expect(rf).deep.eq(expected)
    })

    it('getContractAbi', async () => {
      const contractAddress = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'

      expect(pathfinderApi.getContractAbi(contractAddress)).to.throw

      const expected = JSON.parse('[{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"inputs":[{"name":"implementation_address","type":"felt"}],"name":"constructor","outputs":[],"type":"constructor"},{"inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"__default__","outputs":[{"name":"retdata_size","type":"felt"},{"name":"retdata","type":"felt*"}],"type":"function"},{"inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"__l1_default__","outputs":[],"type":"l1_handler"}]')

      const rf = await feederApi.getContractAbi(contractAddress)
      log(rf)

      expect(rf).deep.eq(expected)

      const rc = await api.getContractAbi(contractAddress)

      expect(rf).deep.eq(rc)
    })


    it('AbiApi', async () => {
      let h = '0x01ecfc4bf6c3b5317a25fec2eb942db4f336077f7506acc3eb253889d73a45d4'

      const r0 = await abiApi.getClassAbi(h)
      log(r0)

      h = '0x1ecfc4bf6c3b5317a25fec2eb942db4f336077f7506acc3eb253889d73a45d4'

      const r1 = await abiApi.getClassAbi(h)
      log(r1)

      expect(r0).deep.eq(r1)

      //TODO chaiaspromised not working here
      // h = '0x1ecfc4bf6c3b5317a25fec2eb942db4f336077f7506acc3eb253889d73a45dX'
      //
      // expect(await abiApi.getClassAbi(h)).to.throw

      h = '010455c752b86932ce552f2b0fe81a880746649b9aee7e0d842bf3f52378f9f8'

      let r = await abiApi.getClassAbi(h)
      log(r)

      h = '00005345c2ff3cf38e5f2c24fa41279d13f754172f0674a2598eae39b094b5cb'

      r = await abiApi.getClassAbi(h)
      log(r)

      h = '0000008719984fd09d467c64014c83c0d9445c309b710ece2260c8f364cb31b3'

      r = await abiApi.getContractAbi(h)
      log(r)
    })

    it('getClassAbi', async () => {
      const classHash = '0x1ecfc4bf6c3b5317a25fec2eb942db4f336077f7506acc3eb253889d73a45d4'

      const rf = await feederApi.getClassAbi(classHash)
      log(rf)

      const expected = JSON.parse('[{"members":[{"name":"low","offset":0,"type":"felt"},{"name":"high","offset":1,"type":"felt"}],"name":"Uint256","size":2,"type":"struct"},{"members":[{"name":"amount","offset":0,"type":"Uint256"},{"name":"reward_debt","offset":2,"type":"Uint256"}],"name":"UserInfo","size":4,"type":"struct"},{"data":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"value","type":"Uint256"}],"keys":[],"name":"Transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"},{"name":"value","type":"Uint256"}],"keys":[],"name":"Approval","type":"event"},{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"data":[{"name":"caller","type":"felt"},{"name":"owner","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"shares","type":"Uint256"}],"keys":[],"name":"Deposit","type":"event"},{"data":[{"name":"caller","type":"felt"},{"name":"receiver","type":"felt"},{"name":"owner","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"shares","type":"Uint256"}],"keys":[],"name":"Withdraw","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"new_fee_percent","type":"felt"}],"keys":[],"name":"FeePercentUpdated","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"new_harvest_window","type":"felt"}],"keys":[],"name":"HarvestWindowUpdated","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"new_harvest_delay","type":"felt"}],"keys":[],"name":"HarvestDelayUpdated","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"new_harvest_delay","type":"felt"}],"keys":[],"name":"HarvestDelayUpdateScheduled","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"new_target_float_percent","type":"felt"}],"keys":[],"name":"TargetFloatPercentUpdated","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategies_len","type":"felt"},{"name":"strategies","type":"felt*"}],"keys":[],"name":"Harvest","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"},{"name":"underlying_amount","type":"Uint256"}],"keys":[],"name":"StrategyDeposit","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"},{"name":"underlying_amount","type":"Uint256"}],"keys":[],"name":"StrategyWithdrawal","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"}],"keys":[],"name":"StrategyTrusted","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"}],"keys":[],"name":"StrategyDistrusted","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"amount","type":"Uint256"}],"keys":[],"name":"FeesClaimed","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"}],"keys":[],"name":"WithdrawalStackPushed","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"}],"keys":[],"name":"WithdrawalStackPopped","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"stack_len","type":"felt"},{"name":"stack","type":"felt*"}],"keys":[],"name":"WithdrawalStackSet","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"index","type":"felt"},{"name":"old_strategy","type":"felt"},{"name":"new_strategy","type":"felt"}],"keys":[],"name":"WithdrawalStackIndexReplaced","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"index1","type":"felt"},{"name":"index2","type":"felt"},{"name":"new_strategy1","type":"felt"},{"name":"new_strategy2","type":"felt"}],"keys":[],"name":"WithdrawalStackIndexesSwapped","type":"event"},{"inputs":[],"name":"getWithdrawalStack","outputs":[{"name":"strategies_withdrawal_stack_len","type":"felt"},{"name":"strategies_withdrawal_stack","type":"felt*"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalFloat","outputs":[{"name":"float","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"lp_token","type":"felt"}],"name":"totalFloatLP","outputs":[{"name":"float","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalStrategyHoldings","outputs":[{"name":"holdings","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"feePercent","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"harvestDelay","outputs":[{"name":"delay","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"harvestWindow","outputs":[{"name":"window","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"targetFloatPercent","outputs":[{"name":"percent","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lockedProfit","outputs":[{"name":"res","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastHarvest","outputs":[{"name":"time","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastHarvestWindowStart","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nextHarvestDelay","outputs":[{"name":"delay","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"name":"name","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"name":"symbol","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"name":"totalSupply","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"name":"decimals","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"account","type":"felt"}],"name":"balanceOf","outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"}],"name":"allowance","outputs":[{"name":"remaining","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAssets","outputs":[{"name":"totalManagedAssets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"asset","outputs":[{"name":"assetTokenAddress","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"assets","type":"Uint256"}],"name":"convertToShares","outputs":[{"name":"shares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"shares","type":"Uint256"}],"name":"convertToAssets","outputs":[{"name":"assets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"receiver","type":"felt"}],"name":"maxDeposit","outputs":[{"name":"maxAssets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"receiver","type":"felt"}],"name":"maxMint","outputs":[{"name":"maxShares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"owner","type":"felt"}],"name":"maxWithdraw","outputs":[{"name":"maxAssets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"assets","type":"Uint256"}],"name":"previewWithdraw","outputs":[{"name":"shares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"owner","type":"felt"}],"name":"maxRedeem","outputs":[{"name":"maxShares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"shares","type":"Uint256"}],"name":"previewRedeem","outputs":[{"name":"assets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"data":[{"name":"depositor","type":"felt"},{"name":"receiver","type":"felt"},{"name":"lp_address","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"shares","type":"Uint256"}],"keys":[],"name":"DepositLP","type":"event"},{"data":[{"name":"caller","type":"felt"},{"name":"receiver","type":"felt"},{"name":"owner","type":"felt"},{"name":"lp_token","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"shares","type":"Uint256"}],"keys":[],"name":"WithdrawLP","type":"event"},{"data":[{"name":"newRewardPerBlock","type":"Uint256"},{"name":"newEndBlock","type":"felt"}],"keys":[],"name":"NewRewardPerBlockAndEndBlock","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"harvestAmount","type":"Uint256"}],"keys":[],"name":"HarvestRewards","type":"event"},{"inputs":[{"name":"user","type":"felt"},{"name":"token","type":"felt"}],"name":"getUserDeposit","outputs":[{"name":"amount","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"lp_token","type":"felt"}],"name":"isTokenWhitelisted","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"assets","type":"Uint256"}],"name":"previewDeposit","outputs":[{"name":"shares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"assets","type":"Uint256"},{"name":"lock_time","type":"felt"}],"name":"previewDepositForTime","outputs":[{"name":"shares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"lp_token","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"lock_time","type":"felt"}],"name":"previewDepositLP","outputs":[{"name":"shares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"shares","type":"Uint256"}],"name":"previewMint","outputs":[{"name":"assets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"shares","type":"Uint256"},{"name":"lock_time","type":"felt"}],"name":"previewMintForTime","outputs":[{"name":"assets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getCurrentBoostValue","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"user","type":"felt"}],"name":"getUserStakeInfo","outputs":[{"name":"unlock_time","type":"felt"},{"name":"tokens_len","type":"felt"},{"name":"tokens","type":"felt*"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTokensMask","outputs":[{"name":"tokens_mask","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getEmergencyBreaker","outputs":[{"name":"address","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getImplementation","outputs":[{"name":"address","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"lp_token","type":"felt"},{"name":"input","type":"Uint256"}],"name":"previewWithdrawLP","outputs":[{"name":"amount","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getDefaultLockTime","outputs":[{"name":"lock_time","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getHarvestTaskContract","outputs":[{"name":"address","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"canHarvest","outputs":[{"name":"yes_no","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"rewardPerBlock","outputs":[{"name":"reward","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"startBlock","outputs":[{"name":"block","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"endBlock","outputs":[{"name":"block","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastRewardBlock","outputs":[{"name":"block","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"accTokenPerShare","outputs":[{"name":"res","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"user","type":"felt"}],"name":"userInfo","outputs":[{"name":"info","type":"UserInfo"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"user","type":"felt"}],"name":"calculatePendingRewards","outputs":[{"name":"rewards","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"_from","type":"felt"},{"name":"_to","type":"felt"}],"name":"getMultiplier","outputs":[{"name":"multiplier","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"name","type":"felt"},{"name":"symbol","type":"felt"},{"name":"asset_addr","type":"felt"},{"name":"owner","type":"felt"},{"name":"_reward_per_block","type":"Uint256"},{"name":"start_reward_block","type":"felt"},{"name":"end_reward_block","type":"felt"}],"name":"initializer","outputs":[],"type":"function"},{"inputs":[{"name":"new_implementation","type":"felt"}],"name":"upgrade","outputs":[],"type":"function"},{"inputs":[{"name":"lp_token","type":"felt"},{"name":"mint_calculator_address","type":"felt"},{"name":"is_NFT","type":"felt"}],"name":"addWhitelistedToken","outputs":[{"name":"token_mask","type":"felt"}],"type":"function"},{"inputs":[{"name":"lp_token","type":"felt"}],"name":"removeWhitelistedToken","outputs":[],"type":"function"},{"inputs":[{"name":"address","type":"felt"}],"name":"setEmergencyBreaker","outputs":[],"type":"function"},{"inputs":[{"name":"assets","type":"Uint256"},{"name":"receiver","type":"felt"}],"name":"deposit","outputs":[{"name":"shares","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"assets","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"lock_time_days","type":"felt"}],"name":"depositForTime","outputs":[{"name":"shares","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"lp_token","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"lock_time_days","type":"felt"}],"name":"depositLP","outputs":[{"name":"shares","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"shares","type":"Uint256"},{"name":"receiver","type":"felt"}],"name":"mint","outputs":[{"name":"assets","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"shares","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"lock_time_days","type":"felt"}],"name":"mintForTime","outputs":[{"name":"assets","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"shares","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"owner","type":"felt"}],"name":"redeem","outputs":[{"name":"assets","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"assets","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"owner","type":"felt"}],"name":"withdraw","outputs":[{"name":"shares","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"lp_token","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"owner","type":"felt"}],"name":"withdrawLP","outputs":[{"name":"shares","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"recipient","type":"felt"},{"name":"amount","type":"Uint256"}],"name":"transfer","outputs":[{"name":"success","type":"felt"}],"type":"function"},{"inputs":[{"name":"sender","type":"felt"},{"name":"recipient","type":"felt"},{"name":"amount","type":"Uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"felt"}],"type":"function"},{"inputs":[{"name":"spender","type":"felt"},{"name":"amount","type":"Uint256"}],"name":"approve","outputs":[{"name":"success","type":"felt"}],"type":"function"},{"inputs":[{"name":"new_lock_time_days","type":"felt"}],"name":"setDefaultLockTime","outputs":[],"type":"function"},{"inputs":[{"name":"new_boost_value","type":"felt"}],"name":"setStakeBoost","outputs":[],"type":"function"},{"inputs":[{"name":"fee","type":"felt"}],"name":"setFeePercent","outputs":[],"type":"function"},{"inputs":[{"name":"window","type":"felt"}],"name":"setHarvestWindow","outputs":[],"type":"function"},{"inputs":[{"name":"new_delay","type":"felt"}],"name":"setHarvestDelay","outputs":[],"type":"function"},{"inputs":[{"name":"new_float","type":"felt"}],"name":"setTargetFloatPercent","outputs":[],"type":"function"},{"inputs":[{"name":"address","type":"felt"}],"name":"setHarvestTaskContract","outputs":[],"type":"function"},{"inputs":[{"name":"strategies_len","type":"felt"},{"name":"strategies","type":"felt*"}],"name":"harvest","outputs":[],"type":"function"},{"inputs":[{"name":"strategy_address","type":"felt"},{"name":"underlying_amount","type":"Uint256"}],"name":"depositIntoStrategy","outputs":[],"type":"function"},{"inputs":[{"name":"strategy_address","type":"felt"},{"name":"underlying_amount","type":"Uint256"}],"name":"withdrawFromStrategy","outputs":[],"type":"function"},{"inputs":[{"name":"strategy_address","type":"felt"}],"name":"trustStrategy","outputs":[],"type":"function"},{"inputs":[{"name":"strategy_address","type":"felt"}],"name":"distrustStrategy","outputs":[],"type":"function"},{"inputs":[{"name":"amount","type":"Uint256"}],"name":"claimFees","outputs":[],"type":"function"},{"inputs":[{"name":"strategy","type":"felt"}],"name":"pushToWithdrawalStack","outputs":[],"type":"function"},{"inputs":[],"name":"popFromWithdrawalStack","outputs":[],"type":"function"},{"inputs":[{"name":"stack_len","type":"felt"},{"name":"stack","type":"felt*"}],"name":"setWithdrawalStack","outputs":[],"type":"function"},{"inputs":[{"name":"index","type":"felt"},{"name":"address","type":"felt"}],"name":"replaceWithdrawalStackIndex","outputs":[],"type":"function"},{"inputs":[{"name":"index1","type":"felt"},{"name":"index2","type":"felt"}],"name":"swapWithdrawalStackIndexes","outputs":[],"type":"function"},{"inputs":[{"name":"_reward_per_block","type":"Uint256"},{"name":"new_end_block","type":"felt"}],"name":"updateRewardPerBlockAndEndBlock","outputs":[],"type":"function"},{"inputs":[],"name":"harvestRewards","outputs":[],"type":"function"},{"inputs":[{"name":"new_owner","type":"felt"}],"name":"transferOwnership","outputs":[],"type":"function"},{"inputs":[],"name":"pause","outputs":[],"type":"function"},{"inputs":[],"name":"unpause","outputs":[],"type":"function"}]')

      expect(rf).deep.eq(expected)

      expect(pathfinderApi.getClassAbi(classHash)).to.throw

      const rc = await api.getClassAbi(classHash)

      expect(rf).deep.eq(rc)
    })

    it('callView', async () => {
      let contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      let blockNumber = 200000

      let rp = await pathfinderApi.callView(contractAddressProxy, 'get_implementation', blockNumber)
      log(rp)
      expect(rp).deep.eq([
        "0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30"
      ])

      let rf = await feederApi.callView(contractAddressProxy, 'get_implementation', blockNumber)
      log(rf)
      expect(rp).deep.eq(rf)

      rp = await pathfinderApi.callView(contractAddressProxy, 'get_implementation') // latest
      log(rp)
      expect(rp).deep.eq([
        "0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30"
      ])

      blockNumber = 119485 // <-- deployed

      rp = await pathfinderApi.callView(contractAddressProxy, 'get_implementation', blockNumber)
      log(rp)
      expect(rp).deep.eq([
        "0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704"
      ])

      blockNumber = 100000

      expect(pathfinderApi.callView(contractAddressProxy, 'get_implementation', blockNumber)).to.throw
    })

    it('getTransactionReceipt', async () => {
      const txHash = '0x103cc13a763b9191165e469aa2a0fbd5b0e8a1ff05dad44f50c397bc56b70a8'

      const rc = await api.getTransactionReceipt(txHash)
      log(rc)

      const expected = JSON.parse('{"transaction_hash":"0x103cc13a763b9191165e469aa2a0fbd5b0e8a1ff05dad44f50c397bc56b70a8","actual_fee":"0x368544172a9","status":"ACCEPTED_ON_L1","block_hash":"0x9752eed7fc405277057f4c8f8d737ba648aab62ee65936abb62f4f2c2e6ed1","block_number":271814,"messages_sent":[],"events":[{"from_address":"0x11f2c3702aca0ad39fe241e7bacacaa1115d56a9e850121fe0a28f8ab5a8342","keys":["0x7a9935397cbf25184b5a87356dcda53bc831d0b0b3895065419c31979fda664","0x215acc73328a5fe5828dd00a8146e9248fed29db05a4590e0e1f06699e61792","0x2635234c5fddeb9545103c673c63639efea49d64807ab757ce5fbbba6c3fa2b","0x402e0ef3d894bfd178f341c715478c21459a7766bcaf480a8ed6e9cd2234b89","0x3f2f5be72df9e3c1d6d63602969d440573af2e966e5bbfbeb6b95ea32124090","0x7d98e48406a68376a116102085a068e4211f4a3d775b176e0e888a1aa20adae"],"data":["0x536cc0b5131ce9cf2e13b881a01b4986856fcfc8da5ef25a00ed3f21eb98c96","0x79ad9a6ef98ae7a28e6c5a78663693e1ca80c2cb83404101692aa693a5b330d","0x6a4698d741984859500dcbaa2ca64de79d659f2ec68fb8e6aa1309ec55fbe3c","0x6ebe0016f70d9678a49deaae4e769866ce63dc3bba50edf6d94543b44426e23"]}]}')

      expect(rc).deep.eq(expected)

      const rf = await feederApi.getTransactionReceipt(txHash)
      log(rf)

      // TODO sequencer api bug adds an extra event not related to the tx but the same for all txs
      expect(rf).not.deep.eq(rc)
    })

    it('getTransaction INVOKE', async () => {
      const txHash = '0x1de528f1fbb47901ed345d41fbaf97ac7d543d9233c9d85915f451800237681'

      const rc = await api.getTransaction(txHash)
      log(rc)

      const expected = JSON.parse('{"type":"INVOKE","transaction_hash":"0x1de528f1fbb47901ed345d41fbaf97ac7d543d9233c9d85915f451800237681","max_fee":"0x5bafa5e7c9b5","version":"0x0","signature":["0x6dd608db81a32bdaf75c8928877fedce8a875f2433234673435448364992d78","0x26e058e33374159ea2e2d898a5a53d476c5f45dba5356ab07dab83c084587e8"],"nonce":"0x0","contract_address":"0x4081227b89f2e6f0169743b85b8f1aa82cfd793098661f5488d3bc03f190cc","entry_point_selector":"0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad","calldata":["0x1","0x73314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82","0xe48e45e0642d5f170bb832c637926f4c85b77d555848b693304600c4275f26","0x0","0x3","0x3","0x15fd32c5df54c5394d892eb74e34bbbca3caa7ba","0x2c68af0bb140000","0x0","0x0"]}')

      expect(rc).deep.eq(expected)

      const rf = await feederApi.getTransaction(txHash)
      log(rf)

      // sequencer api returns undefined nonce and no type
      expect(rf).not.deep.eq(rc)
    })

    it('getTransaction DEPLOY', async () => {
      const txHash = '0x746f43fa43b430314e90a2b378e2972f9be0184ba50c2b061e31524039e05d8'

      const rc = await api.getTransaction(txHash)
      log(rc)

      const expected = JSON.parse('{"type":"DEPLOY","transaction_hash":"0x746f43fa43b430314e90a2b378e2972f9be0184ba50c2b061e31524039e05d8","version":"0x0","contract_address":"0x5efada0f60a9439f8ea670c6bc941128e18288e8c046a5e475b6af2178566ed","contract_address_salt":"0x31c936833644f08f37caeabade98d1b2cf30b3dda8a36f205891d8f45f35d3b","class_hash":"0x4e733f6eb56ba1032e102312b52aaf7680f2a9f539970cd2791a57a0ad3f4c7","constructor_calldata":["0x63873932a873858aedacaa2f8bc36c05b766ec130017a41db62a3d265f3e689","0x7d0d953b99e6bb1bbfc060ba48be327f26dba8d20a0618f909183508b6fa7b7"]}')

      expect(rc).deep.eq(expected)

      const rf = await feederApi.getTransaction(txHash)
      log(rf)

      // sequencer api does not return constructor_calldata
      expect(rf).not.deep.eq(rc)
    })

    it('getTransaction DECLARE', async () => {
      const txHash = '0x626b93f71c364e49b579faaa25b023be16bd5fc5e7ad3bdfd899844095f546a'

      const rc = await api.getTransaction(txHash)
      log(rc)

      const expected = JSON.parse('{"type":"DECLARE","transaction_hash":"0x626b93f71c364e49b579faaa25b023be16bd5fc5e7ad3bdfd899844095f546a","max_fee":"0x0","version":"0x0","signature":[],"nonce":"0x0","class_hash":"0x673e3747b6f9cc2daf2c1f4766bd2ff809d7b6b2f09ac15ecaf33004716f188","sender_address":"0x1"}')

      expect(rc).deep.eq(expected)

      const rf = await feederApi.getTransaction(txHash)
      log(rf)

      // sequencer api returns no type
      expect(rf).not.deep.eq(rc)
    })

  })

})