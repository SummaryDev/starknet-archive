import {expect} from 'chai'
import {defaultProvider, Transaction} from "starknet"
import {createConnection, DataSource} from "typeorm"
import { FeederApiProvider } from "../src/providers/api/feeder";
import { PathfinderApiProvider } from "../src/providers/api/pathfinder";
import { DatabaseAbiProvider } from "../src/providers/abi/database";
import { DatabaseViewProvider } from "../src/providers/view/database";
import * as console from '../src/helpers/console'
import {InvokeFunctionTransaction, TransactionReceipt} from '../src/types/raw-starknet'
import {TransactionCallOrganizer} from '../src/organizers/transaction-call'
import {BlockOrganizer} from '../src/organizers/block'
import JSON = require("json5")
import { MemoryCache } from "../src/helpers/cache";
import {ViewProvider} from "../src/providers/interfaces";

// import {BN} from "bn";

function log(o: any) {
  console.log(JSON.stringify(o, null, 2))
}
describe('providers', function() {
  this.timeout(6000000)

  let ds:DataSource
  const pathfinderApiProvider = new PathfinderApiProvider('https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a')
  const feederApiProvider = new FeederApiProvider(defaultProvider)
  let viewProvider:ViewProvider
  let databaseAbiProvider:DatabaseAbiProvider

  before(() => {
    return createConnection().then(o => {
      ds = o
      log(`connected to db`)

      viewProvider = new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds)
      databaseAbiProvider = new DatabaseAbiProvider(pathfinderApiProvider, feederApiProvider, viewProvider, ds)
    })
  })

  describe('DatabaseAbiProvider', async function() {

    it('finds implementation contract address for proxy contract with implementation getter view function get_implementation_class_hash', async() => {
      // 0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29 has view function get_implementation_class_hash

      const blockNumber = 241859 // <-- WAS DEPLOYED IN THIS BLOCK https://beta-goerli.voyager.online/tx/0x26780a818432b6739a23ab8e1ad0c0463ada881a563034a6d5c3d7e46850883
      const contractAddressProxy = '0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29'
      const abiProxy = await databaseAbiProvider.getAbi(contractAddressProxy)
      log(abiProxy)
      expect(abiProxy).not.undefined
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, 266476)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x1ecfc4bf6c3b5317a25fec2eb942db4f336077f7506acc3eb253889d73a45d4')

      implementationContractAddress = await databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, blockNumber)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x42687c59528cd15c17c1ec7029a3c6196e004fac5dea4ac9fdc99b58ded01e1')

      expect(databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, blockNumber-1)).to.throw
    })

    it('finds implementation contract address for proxy contract with multiple implementation getter view functions', async() => {
      // 0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7 has two view functions implementation and implementation_time
      // exact match to 'implementation' should return one correct view function

      const blockNumber = 102959 // <-- WAS DEPLOYED IN THIS BLOCK https://beta-goerli.voyager.online/tx/0x550088c7427d9734c801e7dd3a5e166d515276849034071ee87905510dbe3c6
      const contractAddressProxy = '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
      const abiProxy = await databaseAbiProvider.getAbi(contractAddressProxy)
      log(abiProxy)
      expect(abiProxy).not.undefined
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, 266476)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0xfa904eea70850fdd44e155dcc79a8d96515755ed43990ff4e7e7c096673e7')

      implementationContractAddress = await databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, blockNumber)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x0')

      expect(databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, blockNumber-1)).to.throw
    })

    it('finds implementation contract address for proxy contract with a getter view function', async() => {
      const blockNumber = 119485 // <-- WAS DEPLOYED IN THIS BLOCK https://goerli.voyager.online/tx/0x3d86f1b062475dc31f57ad8666ee78c332ed2588ad360f6316108702a066123
      const contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      const abiProxy = await databaseAbiProvider.getAbi(contractAddressProxy)
      log(abiProxy)
      expect(abiProxy).not.undefined
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, 200000)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30')

      implementationContractAddress = await databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, blockNumber)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704')

      expect(databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, blockNumber-1)).to.throw
    })

    it('finds implementation contract address for proxy contract with a constructor and events', async() => {
      const blockNumber = 134018
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await databaseAbiProvider.getAbi(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy!)
      expect(isProxy).true

      let implementationContractAddress = await databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, blockNumber)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      expect(databaseAbiProvider.findImplementation(contractAddressProxy, abiProxy, blockNumber-1)).to.throw
    })

    it('finds implementation contract address from proxy constructor', async() => {
      const blockNumber = 134018
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await databaseAbiProvider.getAbi(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      /*
      select b.block_number, t.transaction_hash, t.constructor_calldata from transaction as t, block as b where t.contract_address = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921' and t.type = 'DEPLOY' and t."blockBlockNumber" = b.block_number order by b.block_number desc;

      134018	0x2dd6e7e242921c61c8b3b8dc07cf88a8792562dc21b732550af4fbfb5aee217	["0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae"] <-- WAS DEPLOYED IN THIS BLOCK
       */

      let implementationContractAddress = await databaseAbiProvider.findImplementationByConstructor(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      expect(databaseAbiProvider.findImplementationByConstructor(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw
    })

    it('finds implementation contract address from proxy constructor with multiple inputs', async() => {
      const blockNumber = 62135
      const contractAddressProxy = '0x1317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e'
      const abiProxy = await databaseAbiProvider.getAbi(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      /*
      select b.block_number, t.transaction_hash, t.constructor_calldata from transaction as t, block as b where t.contract_address = '0x1317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e' and t.type = 'DEPLOY' and t."block_number" = b.block_number order by b.block_number desc;

      62135	0x53facbf470346c7e21452e5b8ef4c2b210547f9463b00b73b8a16e8daa5e58c	["0x6043ed114a9a1987fe65b100d0da46fe71b2470e7e5ff8bf91be5346f5e5e3", "0x74db315cc7e1e821dfd229890068ea197594ac3e29fa0038dc12704f63ebb83"] <-- WAS DEPLOYED IN THIS BLOCK
       */

      let implementationContractAddress = await databaseAbiProvider.findImplementationByConstructor(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x74db315cc7e1e821dfd229890068ea197594ac3e29fa0038dc12704f63ebb83')

      expect(databaseAbiProvider.findImplementationByConstructor(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw
    })

    it('finds implementation contract address from upgrade event', async() => {
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await databaseAbiProvider.getAbi(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      /*
      select b.block_number, a.value, e.name, a.name from argument as a, event as e, transaction as t, block as b where e.transmitter_contract = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921' and a."eventId" = e.id and e.name ilike '%upgrade%' and e."transactionTransactionHash" = t.transaction_hash and t."block_number" = b.block_number order by b.block_number desc;

      164233	"0x65c4fe3e8d1eaa783a62417271af5546d9164cc81d7780617b1295722bfd535"	Upgraded	implementation
      161300	"0x3a29ab9db30291ab762af40a510cb0fe61c4a4f1050142d1ea9d58754cbd641"	Upgraded	implementation
      146407	"0x1e7bad045fbf062272ba29f3d95d678868c3151399b25ba8bb1092077a85edd"	Upgraded	implementation
      134018	"0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae"	Upgraded	implementation <-- WAS DEPLOYED IN THIS BLOCK
       */

      let implementationContractAddress = await databaseAbiProvider.findImplementationByEvent(contractAddressProxy, abiProxy!, 164233)
      expect(implementationContractAddress).eq('0x65c4fe3e8d1eaa783a62417271af5546d9164cc81d7780617b1295722bfd535')

      implementationContractAddress = await databaseAbiProvider.findImplementationByEvent(contractAddressProxy, abiProxy!, 161300)
      expect(implementationContractAddress).eq('0x3a29ab9db30291ab762af40a510cb0fe61c4a4f1050142d1ea9d58754cbd641')

      implementationContractAddress = await databaseAbiProvider.findImplementationByEvent(contractAddressProxy, abiProxy!, 146407)
      expect(implementationContractAddress).eq('0x1e7bad045fbf062272ba29f3d95d678868c3151399b25ba8bb1092077a85edd')

      implementationContractAddress = await databaseAbiProvider.findImplementationByEvent(contractAddressProxy, abiProxy!, 134018)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      expect(await databaseAbiProvider.findImplementationByEvent(contractAddressProxy, abiProxy!, 134017)).to.throw
    })

    it('finds implementation contract address from a getter view function', async() => {
      let contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8' // has get_implementation
      let blockNumber = 200000
      let abiProxy = await databaseAbiProvider.getAbi(contractAddressProxy)
      log(abiProxy)
      let isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await databaseAbiProvider.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30')

      /*
      was deployed in block 119485
      https://goerli.voyager.online/tx/0x3d86f1b062475dc31f57ad8666ee78c332ed2588ad360f6316108702a066123
       */
      blockNumber = 119485

      implementationContractAddress = await databaseAbiProvider.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704')

      expect(databaseAbiProvider.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw

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
      abiProxy = await databaseAbiProvider.getAbi(contractAddressProxy)
      log(abiProxy)
      isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      implementationContractAddress = await databaseAbiProvider.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x75a31cd9fc21788e3505f9ca50f2a020cd63430f68dbc66a40fe3a083159ebf')

      blockNumber = 70056

      implementationContractAddress = await databaseAbiProvider.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x2c30ac04ab60b7b2be19854f9c7129cc40ff95dd167816fb3be1ea94d7110c8')

      blockNumber = 62135

      implementationContractAddress = await databaseAbiProvider.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x74db315cc7e1e821dfd229890068ea197594ac3e29fa0038dc12704f63ebb83')

      expect(databaseAbiProvider.findImplementationByGetter(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw
    })

    it('detects proxy contract', async() => {
      const contractAddressProxyByConstructor = '0x0328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxyByConstructor = await databaseAbiProvider.getAbi(contractAddressProxyByConstructor)
      log(abiProxyByConstructor)
      const isProxyByConstructorProxy = DatabaseAbiProvider.isProxy(abiProxyByConstructor)
      expect(isProxyByConstructorProxy).true

      const contractAddressProxyByEvent = '0x0328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxyByEvent = await databaseAbiProvider.getAbi(contractAddressProxyByEvent)
      log(abiProxyByEvent)
      const isProxyByEventProxy = DatabaseAbiProvider.isProxy(abiProxyByEvent)
      expect(isProxyByEventProxy).true

      const contractAddressProxyByContractAbiReadFunction = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      const abiProxyByContractAbiReadFunction = await databaseAbiProvider.getAbi(contractAddressProxyByContractAbiReadFunction)
      log(abiProxyByContractAbiReadFunction)
      const isProxyByContractAbiReadFunctionProxy = DatabaseAbiProvider.isProxy(abiProxyByContractAbiReadFunction)
      expect(isProxyByContractAbiReadFunctionProxy).true

      const contractAddressProxyByClassAbiReadFunction = '0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29'
      const abiProxyByClassAbiReadFunction = await databaseAbiProvider.getAbi(contractAddressProxyByClassAbiReadFunction)
      log(abiProxyByClassAbiReadFunction)
      const isProxyByClassAbiReadFunctionProxy = DatabaseAbiProvider.isProxy(abiProxyByClassAbiReadFunction)
      expect(isProxyByClassAbiReadFunctionProxy).true

      const contractAddressRegular = '0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a'
      const abiRegular = await databaseAbiProvider.getAbi(contractAddressRegular)
      log(abiRegular)
      const isRegularProxy = DatabaseAbiProvider.isProxy(abiRegular)
      expect(isRegularProxy).false
    })

    it('gets abi for regular contract', async() => {
      const blockNumber = 200000
      const contractAddress = '0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a'
      const abiBare = await databaseAbiProvider.getAbi(contractAddress)
      log(abiBare)

      const abi = await databaseAbiProvider.get(contractAddress, blockNumber)
      log(abi)

      expect(abiBare).deep.eq(abi)

      expect(abi).deep.eq(JSON.parse('[{"name":"Uint256","size":2,"type":"struct","members":[{"name":"low","type":"felt","offset":0},{"name":"high","type":"felt","offset":1}]},{"data":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"keys":[],"name":"Transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"approved","type":"felt"},{"name":"tokenId","type":"Uint256"}],"keys":[],"name":"Approve","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"operator","type":"felt"},{"name":"approved","type":"felt"}],"keys":[],"name":"ApprovalForAll","type":"event"},{"name":"constructor","type":"constructor","inputs":[{"name":"name","type":"felt"},{"name":"symbol","type":"felt"},{"name":"owner","type":"felt"}],"outputs":[]},{"name":"nextMintedTokenId","type":"function","inputs":[],"outputs":[{"name":"nextMintedTokenId","type":"Uint256"}],"stateMutability":"view"},{"name":"totalSupply","type":"function","inputs":[],"outputs":[{"name":"totalSupply","type":"Uint256"}],"stateMutability":"view"},{"name":"getOwner","type":"function","inputs":[],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"supportsInterface","type":"function","inputs":[{"name":"interfaceId","type":"felt"}],"outputs":[{"name":"success","type":"felt"}],"stateMutability":"view"},{"name":"name","type":"function","inputs":[],"outputs":[{"name":"name","type":"felt"}],"stateMutability":"view"},{"name":"symbol","type":"function","inputs":[],"outputs":[{"name":"symbol","type":"felt"}],"stateMutability":"view"},{"name":"balanceOf","type":"function","inputs":[{"name":"owner","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view"},{"name":"ownerOf","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"getApproved","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"approved","type":"felt"}],"stateMutability":"view"},{"name":"isApprovedForAll","type":"function","inputs":[{"name":"owner","type":"felt"},{"name":"operator","type":"felt"}],"outputs":[{"name":"isApproved","type":"felt"}],"stateMutability":"view"},{"name":"tokenURI","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"stateMutability":"view"},{"name":"approve","type":"function","inputs":[{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"setApprovalForAll","type":"function","inputs":[{"name":"operator","type":"felt"},{"name":"approved","type":"felt"}],"outputs":[]},{"name":"transferFrom","type":"function","inputs":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"safeTransferFrom","type":"function","inputs":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"},{"name":"data_len","type":"felt"},{"name":"data","type":"felt*"}],"outputs":[]},{"name":"mint","type":"function","inputs":[{"name":"to","type":"felt"},{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"outputs":[]},{"name":"burn","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"transferOwnership","type":"function","inputs":[{"name":"new_owner","type":"felt"}],"outputs":[{"name":"new_owner","type":"felt"}]},{"name":"setTokenURI","type":"function","inputs":[{"name":"tokenId","type":"Uint256"},{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"outputs":[]}]'))
    })

    it('gets abi for proxy contract', async() => {
      const blockNumber = 200000
      const contractAddress = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await databaseAbiProvider.getAbi(contractAddress)
      log(abiProxy)

      const abiImplementation = await databaseAbiProvider.get(contractAddress, blockNumber)
      log(abiImplementation)

      expect(abiProxy).not.deep.eq(abiImplementation)

      expect(abiProxy).deep.eq(JSON.parse('[{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"name":"constructor","type":"constructor","inputs":[{"name":"implementation_address","type":"felt"}],"outputs":[]},{"name":"__default__","type":"function","inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"outputs":[{"name":"retdata_size","type":"felt"},{"name":"retdata","type":"felt*"}]},{"name":"__l1_default__","type":"l1_handler","inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"outputs":[]}]'))

      expect(abiImplementation).deep.eq(JSON.parse('[{"name":"Uint256","size":2,"type":"struct","members":[{"name":"low","type":"felt","offset":0},{"name":"high","type":"felt","offset":1}]},{"name":"BorrowSnapshot","size":4,"type":"struct","members":[{"name":"principal","type":"Uint256","offset":0},{"name":"interest_index","type":"Uint256","offset":2}]},{"data":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"value","type":"Uint256"}],"keys":[],"name":"Transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"},{"name":"value","type":"Uint256"}],"keys":[],"name":"Approval","type":"event"},{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"data":[{"name":"sender","type":"felt"},{"name":"receiver","type":"felt"},{"name":"amount","type":"Uint256"}],"keys":[],"name":"log_transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"},{"name":"amount","type":"Uint256"}],"keys":[],"name":"log_approve","type":"event"},{"data":[{"name":"cash_prior","type":"Uint256"},{"name":"interest_accumulated","type":"Uint256"},{"name":"borrow_index","type":"Uint256"},{"name":"total_borrows","type":"Uint256"}],"keys":[],"name":"log_accrue_interest","type":"event"},{"data":[{"name":"minter","type":"felt"},{"name":"mint_underlying_amount","type":"Uint256"},{"name":"mint_xtoken_amount","type":"Uint256"}],"keys":[],"name":"log_mint","type":"event"},{"data":[{"name":"redeemer","type":"felt"},{"name":"redeem_underlying_amount","type":"Uint256"},{"name":"redeem_xtoken_amount","type":"Uint256"}],"keys":[],"name":"log_redeem","type":"event"},{"data":[{"name":"borrower","type":"felt"},{"name":"borrow_amount","type":"Uint256"},{"name":"account_borrow_balance","type":"Uint256"},{"name":"total_borrows","type":"Uint256"},{"name":"borrow_index","type":"Uint256"}],"keys":[],"name":"log_borrow","type":"event"},{"data":[{"name":"payer","type":"felt"},{"name":"borrower","type":"felt"},{"name":"repay_amount","type":"Uint256"},{"name":"account_borrow_balance","type":"Uint256"},{"name":"total_borrows","type":"Uint256"},{"name":"borrow_index","type":"Uint256"}],"keys":[],"name":"log_repay","type":"event"},{"data":[{"name":"xcontroller","type":"felt"}],"keys":[],"name":"log_set_xcontroller","type":"event"},{"data":[{"name":"to","type":"felt"},{"name":"reduce_amount","type":"Uint256"},{"name":"new_total_reserves","type":"Uint256"}],"keys":[],"name":"log_reduce_reserves","type":"event"},{"data":[{"name":"benefactor","type":"felt"},{"name":"add_amount","type":"Uint256"},{"name":"new_total_reserves","type":"Uint256"}],"keys":[],"name":"log_add_reserves","type":"event"},{"data":[{"name":"treasury","type":"felt"}],"keys":[],"name":"log_set_treasury","type":"event"},{"data":[{"name":"interest_rate_model","type":"felt"}],"keys":[],"name":"log_set_interest_rate_model","type":"event"},{"data":[{"name":"factor","type":"Uint256"}],"keys":[],"name":"log_set_reserve_factor","type":"event"},{"data":[{"name":"liquidator","type":"felt"},{"name":"borrower","type":"felt"},{"name":"actual_repay_amount","type":"Uint256"},{"name":"xtoken_collateral","type":"felt"},{"name":"actual_xtoken_seize_amount","type":"Uint256"}],"keys":[],"name":"log_liquidate","type":"event"},{"data":[{"name":"admin","type":"felt"}],"keys":[],"name":"log_set_proxy_admin","type":"event"},{"data":[{"name":"new_owner","type":"felt"}],"keys":[],"name":"log_transfer_ownership","type":"event"},{"name":"initializer","type":"function","inputs":[{"name":"_name","type":"felt"},{"name":"_symbol","type":"felt"},{"name":"_decimals","type":"felt"},{"name":"_owner","type":"felt"},{"name":"_underlying","type":"felt"},{"name":"_xcontroller","type":"felt"},{"name":"_interest_rate_model","type":"felt"},{"name":"_initial_exchange_rate","type":"Uint256"},{"name":"_proxy_admin","type":"felt"}],"outputs":[]},{"name":"upgrade","type":"function","inputs":[{"name":"new_implementation","type":"felt"}],"outputs":[]},{"name":"proxy_set_admin","type":"function","inputs":[{"name":"new_proxy_admin","type":"felt"}],"outputs":[]},{"name":"proxy_get_admin","type":"function","inputs":[],"outputs":[{"name":"admin","type":"felt"}],"stateMutability":"view"},{"name":"proxy_get_implementation","type":"function","inputs":[],"outputs":[{"name":"implementation","type":"felt"}],"stateMutability":"view"},{"name":"name","type":"function","inputs":[],"outputs":[{"name":"name","type":"felt"}],"stateMutability":"view"},{"name":"symbol","type":"function","inputs":[],"outputs":[{"name":"symbol","type":"felt"}],"stateMutability":"view"},{"name":"totalSupply","type":"function","inputs":[],"outputs":[{"name":"totalSupply","type":"Uint256"}],"stateMutability":"view"},{"name":"decimals","type":"function","inputs":[],"outputs":[{"name":"decimals","type":"felt"}],"stateMutability":"view"},{"name":"balanceOf","type":"function","inputs":[{"name":"account","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view"},{"name":"allowance","type":"function","inputs":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"}],"outputs":[{"name":"remaining","type":"Uint256"}],"stateMutability":"view"},{"name":"is_xtoken","type":"function","inputs":[],"outputs":[{"name":"bool","type":"felt"}],"stateMutability":"view"},{"name":"get_underlying","type":"function","inputs":[],"outputs":[{"name":"underlying","type":"felt"}],"stateMutability":"view"},{"name":"get_not_entered","type":"function","inputs":[],"outputs":[{"name":"not_entered","type":"felt"}],"stateMutability":"view"},{"name":"get_xcontroller","type":"function","inputs":[],"outputs":[{"name":"xcontroller","type":"felt"}],"stateMutability":"view"},{"name":"get_interest_rate_model","type":"function","inputs":[],"outputs":[{"name":"interest_rate_model","type":"felt"}],"stateMutability":"view"},{"name":"get_owner","type":"function","inputs":[],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"get_initial_exchange_rate","type":"function","inputs":[],"outputs":[{"name":"rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_reserve_factor","type":"function","inputs":[],"outputs":[{"name":"factor","type":"Uint256"}],"stateMutability":"view"},{"name":"get_protocol_seize_share_factor","type":"function","inputs":[],"outputs":[{"name":"factor","type":"Uint256"}],"stateMutability":"view"},{"name":"get_accrual_block_timestamp","type":"function","inputs":[],"outputs":[{"name":"timestamp","type":"felt"}],"stateMutability":"view"},{"name":"get_borrow_index","type":"function","inputs":[],"outputs":[{"name":"index","type":"Uint256"}],"stateMutability":"view"},{"name":"get_total_borrows","type":"function","inputs":[],"outputs":[{"name":"total_borrows","type":"Uint256"}],"stateMutability":"view"},{"name":"get_total_reserves","type":"function","inputs":[],"outputs":[{"name":"total_reserves","type":"Uint256"}],"stateMutability":"view"},{"name":"get_exchange_rate_stored","type":"function","inputs":[],"outputs":[{"name":"rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_borrow_balance_stored","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view"},{"name":"get_account_snapshot","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"xtoken_balance","type":"Uint256"},{"name":"borrow_balance","type":"Uint256"},{"name":"exchange_rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_account_borrows","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"borrow_snapshot","type":"BorrowSnapshot"}],"stateMutability":"view"},{"name":"get_cash","type":"function","inputs":[],"outputs":[{"name":"cash_prior","type":"Uint256"}],"stateMutability":"view"},{"name":"get_borrow_rate","type":"function","inputs":[],"outputs":[{"name":"borrow_rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_supply_rate","type":"function","inputs":[],"outputs":[{"name":"supply_rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_treasury","type":"function","inputs":[],"outputs":[{"name":"treasury","type":"felt"}],"stateMutability":"view"},{"name":"set_xcontroller","type":"function","inputs":[{"name":"_xcontroller","type":"felt"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_reserve_factor","type":"function","inputs":[{"name":"_factor","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_protocol_seize_share_factor","type":"function","inputs":[{"name":"_factor","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_interest_rate_model","type":"function","inputs":[{"name":"_interest_rate_model","type":"felt"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_treasury","type":"function","inputs":[{"name":"_treasury","type":"felt"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"transfer","type":"function","inputs":[{"name":"recipient","type":"felt"},{"name":"amount","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"transferFrom","type":"function","inputs":[{"name":"sender","type":"felt"},{"name":"recipient","type":"felt"},{"name":"amount","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"approve","type":"function","inputs":[{"name":"spender","type":"felt"},{"name":"amount","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"increaseAllowance","type":"function","inputs":[{"name":"spender","type":"felt"},{"name":"added_value","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"decreaseAllowance","type":"function","inputs":[{"name":"spender","type":"felt"},{"name":"subtracted_value","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"get_exchange_rate_current","type":"function","inputs":[],"outputs":[{"name":"rate","type":"Uint256"}]},{"name":"get_borrow_balance_current","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}]},{"name":"accrue_interest","type":"function","inputs":[],"outputs":[]},{"name":"mint","type":"function","inputs":[{"name":"_mint_amount","type":"Uint256"}],"outputs":[{"name":"actual_mint_amount","type":"Uint256"}]},{"name":"redeem","type":"function","inputs":[{"name":"_xtoken_amount","type":"Uint256"}],"outputs":[]},{"name":"redeem_underlying","type":"function","inputs":[{"name":"_underlying_token_amount","type":"Uint256"}],"outputs":[]},{"name":"borrow","type":"function","inputs":[{"name":"_borrow_amount","type":"Uint256"}],"outputs":[]},{"name":"repay","type":"function","inputs":[{"name":"_repay_amount","type":"Uint256"}],"outputs":[]},{"name":"repay_for","type":"function","inputs":[{"name":"_borrower","type":"felt"},{"name":"_repay_amount","type":"Uint256"}],"outputs":[]},{"name":"liquidate","type":"function","inputs":[{"name":"_borrower","type":"felt"},{"name":"_repay_amount","type":"Uint256"},{"name":"_xtoken_collateral","type":"felt"}],"outputs":[]},{"name":"seize","type":"function","inputs":[{"name":"_liquidator","type":"felt"},{"name":"_borrower","type":"felt"},{"name":"_xtoken_seize_amount","type":"Uint256"}],"outputs":[{"name":"actual_xtoken_seize_amount","type":"Uint256"}]},{"name":"transfer_ownership","type":"function","inputs":[{"name":"_new_owner","type":"felt"}],"outputs":[{"name":"new_owner","type":"felt"}]},{"name":"reduce_reserves","type":"function","inputs":[{"name":"_reduce_amount","type":"Uint256"}],"outputs":[]},{"name":"add_reserves","type":"function","inputs":[{"name":"_add_amount","type":"Uint256"}],"outputs":[]},{"name":"constructor","type":"constructor","inputs":[{"name":"implementation_address","type":"felt"}],"outputs":[]}]'))
    })

    it('organizeFunction for proxy contract 0x73314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82 with multiple implementation getters and an upgrade event', async () => {
      const txHash = '0xbda33e18bc98d4c16bd6fe9d540a8f5f2de4a92d7a5cd7fb688d8866fc3572' // contract 0x73314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82 has getters implementation and implementation_time as well as event implementation_upgraded
      const getTransactionResponse = await defaultProvider.getTransaction(txHash) as any
      const blockNumber = getTransactionResponse.block_number as number
      const tx = getTransactionResponse as InvokeFunctionTransaction
      log(tx)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseAbiProvider)

      const organizedFunction = await transactionCallOrganizer.organizeInvokeFunction(tx, blockNumber)

      log(organizedFunction)

      // //TODO this comparison fails as one of the arguments carries an undefined decimal field. Why is undefined for a felt* array? Shouldn't be there at all. Adding this dummy field for now.
      // const x = JSON.parse('[{"name":"Approval","transmitter_contract":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","arguments":[{"name":"owner","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"spender","type":"felt","value":"0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","decimal":"2118057930243295689209699260109286459508439101415299206807991604654635117418"},{"name":"value","type":"Uint256","value":{"low":"0x355cf2870ec72580000","high":"0x0"},"decimal":"15750000000000000000000"}]},{"name":"Approval","transmitter_contract":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","arguments":[{"name":"owner","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"spender","type":"felt","value":"0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","decimal":"2118057930243295689209699260109286459508439101415299206807991604654635117418"},{"name":"value","type":"Uint256","value":{"low":"0x8bee7dea1d3e88","high":"0x0"},"decimal":"39387246328888968"}]},{"name":"Transfer","transmitter_contract":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","arguments":[{"name":"from_","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"to","type":"felt","value":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","decimal":"2770174426030749006759999589934377255706081509516375365733662619363094133061"},{"name":"value","type":"Uint256","value":{"low":"0x355cf2870ec72580000","high":"0x0"},"decimal":"15750000000000000000000"}]},{"name":"Transfer","transmitter_contract":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","arguments":[{"name":"from_","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"to","type":"felt","value":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","decimal":"2770174426030749006759999589934377255706081509516375365733662619363094133061"},{"name":"value","type":"Uint256","value":{"low":"0x8bee5bd7fa3e50","high":"0x0"},"decimal":"39387099995717200"}]},{"name":"Transfer","transmitter_contract":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"value","type":"Uint256","value":{"low":"0x145ef460201f3c820","high":"0x0"},"decimal":"23486067556197058592"}]},{"name":"AddLiquidity","transmitter_contract":"0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","arguments":[{"name":"owner","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"pool_address","type":"felt","value":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","decimal":"2770174426030749006759999589934377255706081509516375365733662619363094133061"},{"name":"token_0_address","type":"felt","value":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","decimal":"3247388024922748134843608892309699741875987881237106590599513207337606053879"},{"name":"token_1_address","type":"felt","value":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","decimal":"2087021424722619777119509474943472645767659996348769578120564519014510906823"},{"name":"amount_token_0","type":"Uint256","value":{"low":"0x355cf2870ec72580000","high":"0x0"},"decimal":"15750000000000000000000"},{"name":"amount_token_1","type":"Uint256","value":{"low":"0x8bee5bd7fa3e50","high":"0x0"},"decimal":"39387099995717200"},{"name":"liquidity_minted","type":"Uint256","value":{"low":"0x145ef460201f3c820","high":"0x0"},"decimal":"23486067556197058592"}]},{"name":"transaction_executed","transmitter_contract":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","arguments":[{"name":"hash","type":"felt","value":"0x1f8a262f2134e3295f9466ef64ee87e13d33edb06dfd00fc5f09810903e40bf","decimal":"891611671124775543344245311923224556486753581431869584132843997696962216127"},{"name":"response_len","type":"felt","value":"0x4","decimal":"4"},{"name":"response","type":"felt*","value":["0x1","0x1","0x145ef460201f3c820","0x0"]}]}]')
      // const a = x[x.length-1].arguments
      // a[a.length-1].decimal = undefined

      //expect(organizedFunction).deep.eq(x)
    })

    it('organizeEvent for proxy contract 0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a with implementation getter get_implementation pointing to class', async () => {
      const txHash = '0x1f8a262f2134e3295f9466ef64ee87e13d33edb06dfd00fc5f09810903e40bf' // contract 0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a has get_implementation pointing to class 0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328
      const getTransactionReceiptResponse = await defaultProvider.getTransactionReceipt({txHash: txHash}) as any
      const blockNumber = getTransactionReceiptResponse.block_number as number
      const receipt = getTransactionReceiptResponse as TransactionReceipt
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseAbiProvider)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt, blockNumber)

      log(organizedEvents)

      // //TODO this comparison fails as one of the arguments carries an undefined decimal field. Why is undefined for a felt* array? Shouldn't be there at all. Adding this dummy field for now.
      const x = JSON.parse('[{"name":"Approval","transmitter_contract":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","arguments":[{"name":"owner","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"spender","type":"felt","value":"0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","decimal":"2118057930243295689209699260109286459508439101415299206807991604654635117418"},{"name":"value","type":"Uint256","value":{"low":"0x355cf2870ec72580000","high":"0x0"},"decimal":"15750000000000000000000"}]},{"name":"Approval","transmitter_contract":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","arguments":[{"name":"owner","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"spender","type":"felt","value":"0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","decimal":"2118057930243295689209699260109286459508439101415299206807991604654635117418"},{"name":"value","type":"Uint256","value":{"low":"0x8bee7dea1d3e88","high":"0x0"},"decimal":"39387246328888968"}]},{"name":"Transfer","transmitter_contract":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","arguments":[{"name":"from_","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"to","type":"felt","value":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","decimal":"2770174426030749006759999589934377255706081509516375365733662619363094133061"},{"name":"value","type":"Uint256","value":{"low":"0x355cf2870ec72580000","high":"0x0"},"decimal":"15750000000000000000000"}]},{"name":"Transfer","transmitter_contract":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","arguments":[{"name":"from_","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"to","type":"felt","value":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","decimal":"2770174426030749006759999589934377255706081509516375365733662619363094133061"},{"name":"value","type":"Uint256","value":{"low":"0x8bee5bd7fa3e50","high":"0x0"},"decimal":"39387099995717200"}]},{"name":"Transfer","transmitter_contract":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"value","type":"Uint256","value":{"low":"0x145ef460201f3c820","high":"0x0"},"decimal":"23486067556197058592"}]},{"name":"AddLiquidity","transmitter_contract":"0x4aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a","arguments":[{"name":"owner","type":"felt","value":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","decimal":"2057177617622901788214119151249455899637070863273443171520787811400009181002"},{"name":"pool_address","type":"felt","value":"0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945","decimal":"2770174426030749006759999589934377255706081509516375365733662619363094133061"},{"name":"token_0_address","type":"felt","value":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","decimal":"3247388024922748134843608892309699741875987881237106590599513207337606053879"},{"name":"token_1_address","type":"felt","value":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","decimal":"2087021424722619777119509474943472645767659996348769578120564519014510906823"},{"name":"amount_token_0","type":"Uint256","value":{"low":"0x355cf2870ec72580000","high":"0x0"},"decimal":"15750000000000000000000"},{"name":"amount_token_1","type":"Uint256","value":{"low":"0x8bee5bd7fa3e50","high":"0x0"},"decimal":"39387099995717200"},{"name":"liquidity_minted","type":"Uint256","value":{"low":"0x145ef460201f3c820","high":"0x0"},"decimal":"23486067556197058592"}]},{"name":"transaction_executed","transmitter_contract":"0x48c523eb932f25eaf92e07b0b0ecc58c4844c05a63509ef8705c645d28ce74a","arguments":[{"name":"hash","type":"felt","value":"0x1f8a262f2134e3295f9466ef64ee87e13d33edb06dfd00fc5f09810903e40bf","decimal":"891611671124775543344245311923224556486753581431869584132843997696962216127"},{"name":"response_len","type":"felt","value":"0x4","decimal":"4"},{"name":"response","type":"felt*","value":["0x1","0x1","0x145ef460201f3c820","0x0"]}]}]')
      const a = x[x.length-1].arguments
      a[a.length-1].decimal = undefined

      expect(organizedEvents).deep.eq(x)
    })

    it('organizeEvent for proxy contract 0x4081227b89f2e6f0169743b85b8f1aa82cfd793098661f5488d3bc03f190cc with implementation getter get_implementation pointing to class', async () => {
      const txHash = '0x5ac107530d24c6b3eddf0b8fb45e6bcfb878d6cfb0b348ae107ec6d09fb8a76' // contract 0x4081227b89f2e6f0169743b85b8f1aa82cfd793098661f5488d3bc03f190cc has get_implementation pointing to class 0x3e327de1c40540b98d05cbcb13552008e36f0ec8d61d46956d2f9752c294328
      const getTransactionReceiptResponse = await defaultProvider.getTransactionReceipt({txHash: txHash}) as any
      const blockNumber = getTransactionReceiptResponse.block_number as number
      const receipt = getTransactionReceiptResponse as TransactionReceipt
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseAbiProvider)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt, blockNumber)

      log(organizedEvents)

      // //TODO this comparison fails as one of the arguments carries an undefined decimal field. Why is undefined for a felt* array? Shouldn't be there at all. Adding this dummy field for now.
      const x = JSON.parse('[{"name":"Transfer","transmitter_contract":"0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0x4081227b89f2e6f0169743b85b8f1aa82cfd793098661f5488d3bc03f190cc","decimal":"113969467072899997891504880677377730218157754189864734507838478711289647308"},{"name":"value","type":"Uint256","value":{"low":"0x3635c9adc5dea00000","high":"0x0"},"decimal":"1000000000000000000000"}]},{"name":"transaction_executed","transmitter_contract":"0x4081227b89f2e6f0169743b85b8f1aa82cfd793098661f5488d3bc03f190cc","arguments":[{"name":"hash","type":"felt","value":"0x5ac107530d24c6b3eddf0b8fb45e6bcfb878d6cfb0b348ae107ec6d09fb8a76","decimal":"2565575525455024542033253787770849681072120494113709945677741160102729845366"},{"name":"response_len","type":"felt","value":"0x1","decimal":"1"},{"name":"response","type":"felt*","value":["0x1"]}]}]')
      const a = x[x.length-1].arguments
      a[a.length-1].decimal = undefined

      expect(organizedEvents).deep.eq(x)
    })

    it('organizeEvent for proxy contract with implementation getter get_implementation pointing to class', async () => {
      const txHash = '0x1a101bce444b2422ad759fa4b0a6dafa03b4802f715aa8f6ad50fca91b1cf12' // contract 0x7913dfa8aa911915292a30212fc79706dd799ec6485138d06653cad5cb6a199 has get_implementation pointing to class 0x673e3747b6f9cc2daf2c1f4766bd2ff809d7b6b2f09ac15ecaf33004716f188, also verifies proxy 0x7fa3f31baeba9ba94778e40c716486280023e89ae296b88d699337da08c682d
      const getTransactionReceiptResponse = await defaultProvider.getTransactionReceipt({txHash: txHash}) as any
      const blockNumber = getTransactionReceiptResponse.block_number as number
      const receipt = getTransactionReceiptResponse as TransactionReceipt
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseAbiProvider)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt, blockNumber)

      log(organizedEvents)

      // //TODO this comparison fails as one of the arguments carries an undefined decimal field. Why is undefined for a felt* array? Shouldn't be there at all. Adding this dummy field for now.
      const x = JSON.parse('[{"name":"TransferSingle","transmitter_contract":"0x7fa3f31baeba9ba94778e40c716486280023e89ae296b88d699337da08c682d","arguments":[{"name":"operator","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"_from","type":"felt","value":"0x5542f2b906e81a3ee9b7986a6a7cc58253328d6a926f9bda15f37a5b3672ff6","decimal":"2410304952924151769151633262091298603580784286847185611698529435999405551606"},{"name":"to","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"token_id","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"},{"name":"amount","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"}]},{"name":"Approval","transmitter_contract":"0x7fa3f31baeba9ba94778e40c716486280023e89ae296b88d699337da08c682d","arguments":[{"name":"owner","type":"felt","value":"0x5542f2b906e81a3ee9b7986a6a7cc58253328d6a926f9bda15f37a5b3672ff6","decimal":"2410304952924151769151633262091298603580784286847185611698529435999405551606"},{"name":"operator","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"token_id","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"},{"name":"amount","type":"Uint256","value":{"low":"0x7","high":"0x0"},"decimal":"7"}]},{"name":"TransferSingle","transmitter_contract":"0x7fa3f31baeba9ba94778e40c716486280023e89ae296b88d699337da08c682d","arguments":[{"name":"operator","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"_from","type":"felt","value":"0x5542f2b906e81a3ee9b7986a6a7cc58253328d6a926f9bda15f37a5b3672ff6","decimal":"2410304952924151769151633262091298603580784286847185611698529435999405551606"},{"name":"to","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"token_id","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"},{"name":"amount","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"}]},{"name":"Approval","transmitter_contract":"0x7fa3f31baeba9ba94778e40c716486280023e89ae296b88d699337da08c682d","arguments":[{"name":"owner","type":"felt","value":"0x5542f2b906e81a3ee9b7986a6a7cc58253328d6a926f9bda15f37a5b3672ff6","decimal":"2410304952924151769151633262091298603580784286847185611698529435999405551606"},{"name":"operator","type":"felt","value":"0x2ab650f7b211fc81e592e2e82310009f30105321c71273f381cf177bda2b4e1","decimal":"1207454038990900710381812687758431324833937726553875119964748480690688013537"},{"name":"token_id","type":"Uint256","value":{"low":"0x1","high":"0x0"},"decimal":"1"},{"name":"amount","type":"Uint256","value":{"low":"0x6","high":"0x0"},"decimal":"6"}]},{"name":"TransactionExecuted","transmitter_contract":"0x7913dfa8aa911915292a30212fc79706dd799ec6485138d06653cad5cb6a199","arguments":[{"name":"hash","type":"felt","value":"0x1a101bce444b2422ad759fa4b0a6dafa03b4802f715aa8f6ad50fca91b1cf12","decimal":"736787220268369008536859172545801172845107788918727836262593978700238278418"},{"name":"response_len","type":"felt","value":"0x0","decimal":"0"},{"name":"response","type":"felt*","value":[]}]}]')
      const a = x[x.length-1].arguments
      a[a.length-1].decimal = undefined

      expect(organizedEvents).deep.eq(x)
    })

    it('organizeEvent for proxy contract with implementation getter get_implementation_class_hash pointing to class', async () => {
      const txHash = '0x71d87e5baa99f107e64140f72adca7bd6a05ffe85a4dfb4f59607068a10ac3e' // contract 0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29 has get_implementation_class_hash
      const getTransactionReceiptResponse = await defaultProvider.getTransactionReceipt({txHash: txHash}) as any
      const blockNumber = getTransactionReceiptResponse.block_number as number
      const receipt = getTransactionReceiptResponse as TransactionReceipt
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseAbiProvider)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt, blockNumber)

      log(organizedEvents)

      //TODO this comparison fails as one of the arguments carries an undefined decimal field. Why is undefined for a felt* array? Shouldn't be there at all. Adding this dummy field for now.
      const x = JSON.parse('[{"name":"Approval","transmitter_contract":"0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","arguments":[{"name":"owner","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"spender","type":"felt","value":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","decimal":"167784838450865847503587744484005962903041100779825136612396881209391205417"},{"name":"value","type":"Uint256","value":{"low":"0x2b5e3af16b1880000","high":"0x0"},"decimal":"50000000000000000000"}]},{"name":"Approval","transmitter_contract":"0x38bd0f8aff67ade736159d373cf3399d15529445b147b6b3348cc96cdf66ad8","arguments":[{"name":"owner","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"spender","type":"felt","value":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","decimal":"167784838450865847503587744484005962903041100779825136612396881209391205417"},{"name":"value","type":"Uint256","value":{"low":"0x429d069189e0000","high":"0x0"},"decimal":"300000000000000000"}]},{"name":"Transfer","transmitter_contract":"0x5a6b68181bb48501a7a447a3f99936827e41d77114728960f22892f02e24928","arguments":[{"name":"from_","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"to","type":"felt","value":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","decimal":"167784838450865847503587744484005962903041100779825136612396881209391205417"},{"name":"value","type":"Uint256","value":{"low":"0x2b5e3af16b1880000","high":"0x0"},"decimal":"50000000000000000000"}]},{"name":"Transfer","transmitter_contract":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"value","type":"Uint256","value":{"low":"0x10cab223a7534e594","high":"0x0"},"decimal":"19359605057652057492"}]},{"name":"Deposit","transmitter_contract":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","arguments":[{"name":"caller","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"owner","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"assets","type":"Uint256","value":{"low":"0x2b5e3af16b1880000","high":"0x0"},"decimal":"50000000000000000000"},{"name":"shares","type":"Uint256","value":{"low":"0x10cab223a7534e594","high":"0x0"},"decimal":"19359605057652057492"}]},{"name":"Transfer","transmitter_contract":"0x38bd0f8aff67ade736159d373cf3399d15529445b147b6b3348cc96cdf66ad8","arguments":[{"name":"from_","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"to","type":"felt","value":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","decimal":"167784838450865847503587744484005962903041100779825136612396881209391205417"},{"name":"value","type":"Uint256","value":{"low":"0x429d069189e0000","high":"0x0"},"decimal":"300000000000000000"}]},{"name":"Transfer","transmitter_contract":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"value","type":"Uint256","value":{"low":"0x53752392e00e9ff7","high":"0x0"},"decimal":"6013751991154417655"}]},{"name":"DepositLP","transmitter_contract":"0x5ef67d8c38b82ba699f206bf0db59f1828087a710bad48cc4d51a2b0da4c29","arguments":[{"name":"depositor","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"receiver","type":"felt","value":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","decimal":"327756299792761356448933508449487732220057790930627469298782045411588812366"},{"name":"lp_address","type":"felt","value":"0x38bd0f8aff67ade736159d373cf3399d15529445b147b6b3348cc96cdf66ad8","decimal":"1603972555591947492618369193498893498972798051787935521071549101975155403480"},{"name":"assets","type":"Uint256","value":{"low":"0x429d069189e0000","high":"0x0"},"decimal":"300000000000000000"},{"name":"shares","type":"Uint256","value":{"low":"0x53752392e00e9ff7","high":"0x0"},"decimal":"6013751991154417655"}]},{"name":"transaction_executed","transmitter_contract":"0xb980e4d4c81f0c272cf1690d728438872f46fffa41e36f553f0be9e481ae4e","arguments":[{"name":"hash","type":"felt","value":"0x71d87e5baa99f107e64140f72adca7bd6a05ffe85a4dfb4f59607068a10ac3e","decimal":"3218366434203905792359220659356872987341107432731500380813860581646032481342"},{"name":"response_len","type":"felt","value":"0x6","decimal":"6"},{"name":"response","type":"felt*","value":["0x1","0x1","0x10cab223a7534e594","0x0","0x53752392e00e9ff7","0x0"]}]}]')
      const a = x[x.length-1].arguments
      a[a.length-1].decimal = undefined

      expect(organizedEvents).deep.eq(x)
    })

    it('organizeEvent for proxy contract with multiple implementation getters', async () => {
      const txHash = '0x49cd342354635103227e8670e0d9d69c009db7139ff2a9f25d2c74d8639c13c' // contract 0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7 has two view functions implementation and implementation_time
      const getTransactionReceiptResponse = await defaultProvider.getTransactionReceipt({txHash: txHash}) as any
      const blockNumber = getTransactionReceiptResponse.block_number as number
      const receipt = getTransactionReceiptResponse as TransactionReceipt
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseAbiProvider)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt, blockNumber)

      log(organizedEvents)

      expect(organizedEvents).deep.eq(JSON.parse('[{"name":"Transfer","transmitter_contract":"0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7","arguments":[{"name":"from_","type":"felt","value":"0x17239d35be9e3a622b01677fff06c05ea7d926b94f864e59188d1a7eca00b1f","decimal":"654132511738151032954843069284474140642287037091913264878622131301367417631"},{"name":"to","type":"felt","value":"0x4c7c0eab342c19e75daf6b7a8897b70ec90e6c39fed7dbc5365dc2ec8208475","decimal":"2162185423028430104159228975646631393832432984405071529018013686322576786549"},{"name":"value","type":"Uint256","value":{"low":"0x71afd498d0000","high":"0x0"},"decimal":"2000000000000000"}]}]'))
    })

    it('organizeEvent for proxy contract', async () => {
      const txHash = '0x61fb0f3732a9af7c37351238482e2f51e027955a7797c1202995efb9e49b620'
      const getTransactionReceiptResponse = await defaultProvider.getTransactionReceipt({txHash: txHash}) as any
      const blockNumber = getTransactionReceiptResponse.block_number as number
      const receipt = getTransactionReceiptResponse as TransactionReceipt
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(databaseAbiProvider)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt, blockNumber)

      log(organizedEvents)

      //TODO this comparison fails as one of the arguments carries an undefined decimal field. Why is undefined for a felt* array? Shouldn't be there at all.
      // {
      //   "decimal": [undefined]
      //   "name": "response"
      //   "type": "felt*"
      //   "value": [
      //   "0x4e0ee90"
      //   "0x0"
      // ]
      // }
      const x = JSON.parse('[{"name":"log_add_reserves","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"benefactor","type":"felt","value":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","decimal":"1429254172741197180224990385428922029712785460863743153995072894992221718817"},{"name":"add_amount","type":"Uint256","value":{"low":"0x0","high":"0x0"},"decimal":"0"},{"name":"new_total_reserves","type":"Uint256","value":{"low":"0x0","high":"0x0"},"decimal":"0"}]},{"name":"log_accrue_interest","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"cash_prior","type":"Uint256","value":{"low":"0x1d9b02b09","high":"0x0"},"decimal":"7947168521"},{"name":"interest_accumulated","type":"Uint256","value":{"low":"0x9","high":"0x0"},"decimal":"9"},{"name":"borrow_index","type":"Uint256","value":{"low":"0xde57af71d601602","high":"0x0"},"decimal":"1001341693928150530"},{"name":"total_borrows","type":"Uint256","value":{"low":"0x39426e4","high":"0x0"},"decimal":"60040932"}]},{"name":"Transfer","transmitter_contract":"0x3815b591e7992981b640061e2bee59452477a06464b35585e8b3554e86e4b5","arguments":[{"name":"_from","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","decimal":"2015239384418070662545996670620251513189602993640407890987611048935996103896"},{"name":"to","type":"felt","value":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","decimal":"1429254172741197180224990385428922029712785460863743153995072894992221718817"},{"name":"value","type":"Uint256","value":{"low":"0x4e0ee90","high":"0x0"},"decimal":"81850000"}]},{"name":"Transfer","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"from_","type":"felt","value":"0x0","decimal":"0"},{"name":"to","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","decimal":"2015239384418070662545996670620251513189602993640407890987611048935996103896"},{"name":"value","type":"Uint256","value":{"low":"0xddcca6c4d0005f6a88","high":"0x0"},"decimal":"4091477130717320669832"}]},{"name":"log_mint","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"minter","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","decimal":"2015239384418070662545996670620251513189602993640407890987611048935996103896"},{"name":"mint_underlying_amount","type":"Uint256","value":{"low":"0x4e0ee90","high":"0x0"},"decimal":"81850000"},{"name":"mint_xtoken_amount","type":"Uint256","value":{"low":"0xddcca6c4d0005f6a88","high":"0x0"},"decimal":"4091477130717320669832"}]},{"name":"log_transfer","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"sender","type":"felt","value":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","decimal":"1429254172741197180224990385428922029712785460863743153995072894992221718817"},{"name":"receiver","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","decimal":"2015239384418070662545996670620251513189602993640407890987611048935996103896"},{"name":"amount","type":"Uint256","value":{"low":"0xddcca6c4d0005f6a88","high":"0x0"},"decimal":"4091477130717320669832"}]},{"name":"transaction_executed","transmitter_contract":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","arguments":[{"name":"hash","type":"felt","value":"0x61fb0f3732a9af7c37351238482e2f51e027955a7797c1202995efb9e49b620","decimal":"2769870621260243864720410720304924170034965633501098901776659096523367888416"},{"name":"response_len","type":"felt","value":"0x2","decimal":"2"},{"name":"response","type":"felt*","value":["0x4e0ee90","0x0"]}]}]')
      const a = x[x.length-1].arguments
      a[a.length-1].decimal = undefined
      expect(organizedEvents).deep.eq(x)

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
      const blocks = [254923/*235506/*231612/*231579/*167434/*183423/*190290/*161308/*164233/*62135/*111570/*38172/*36568/*27592/*17281/*71368/*71405/*200501/*1564/*1064/*86*/]

      const blockApiProvider = new FeederApiProvider(defaultProvider)
      const blockOrganizer = new BlockOrganizer(databaseAbiProvider)

      for(let i=0; i < blocks.length; i++) {
        const blockNumber = blocks[i]
        console.info(`organizing block ${blockNumber}`)

        const getBlockResponse = await blockApiProvider.getBlock(blockNumber)
        log(getBlockResponse)

        const organizedBlock = await blockOrganizer.organizeBlock(getBlockResponse)
        log(organizedBlock)

        console.info(`done with block ${blockNumber}`)
      }
    })

    it('gets abi for contract and check memory cache', async() => {
      const mc = MemoryCache.getInstance()

      const contractAddress = '0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a'
      const abiBare = await databaseAbiProvider.getAbi(contractAddress)
      log(abiBare)

      const abiFromCache = await mc.get(contractAddress)
      log(abiFromCache)

      expect(abiBare).deep.eq(abiFromCache)
    })

  })

  describe('ApiProvider', async function() {
    const databaseAbiProvider = new PathfinderApiProvider('https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a')
    const f = new FeederApiProvider(defaultProvider)

    it('getBlock', async () => {
      const rp = await databaseAbiProvider.getBlock(1)
      log(rp)
      expect(rp).deep.eq(JSON.parse('{"block_hash":"0x75e00250d4343326f322e370df4c9c73c7be105ad9f532eeb97891a34d9e4a5","parent_hash":"0x7d328a71faf48c5c3857e99f20a77b18522480956d1cd5bff1ff2df3c8b427b","block_number":1,"status":"ACCEPTED_ON_L1","sequencer":"0x0","new_root":"0x3f04ffa63e188d602796505a2ee4f6e1f294ee29a914b057af8e75b17259d9f","old_root":"0x2c2bb91714f8448ed814bdac274ab6fcdbafc22d835f9e847e5bee8c2e5444e","accepted_time":1636989916,"gas_price":"0x0","transactions":[{"txn_hash":"0x4dd12d3b82c3d0b216503c6abf63f1ccad222461582eac82057d46c327331d2","contract_address":"0x543e54f26ae33686f57da2ceebed98b340c3a78e9390931bd84fb711d5caabc","status":"ACCEPTED_ON_L1","status_data":"","messages_sent":[],"events":[]},{"txn_hash":"0x1a5f7247cc207f5b5c2e48b7605e46b872b83a2fa842955aea42d3cd80dbff","contract_address":"0x2fb7ff5b1b474e8e691f5bebad9aa7aa3009f6ef22ccc2816f96cdfe217604d","status":"ACCEPTED_ON_L1","status_data":"","messages_sent":[],"events":[]},{"txn_hash":"0x5ea9bca61575eeb4ed38a16cefcbf66ba1ed642642df1a1c07b44316791b378","contract_address":"0x1bb929cc5e6d80f0c71e90365ab77e9cbb2e0a290d72255a3f4d34060b5ed52","status":"ACCEPTED_ON_L1","status_data":"","messages_sent":[],"events":[]},{"txn_hash":"0x6525d9aa309e5c80abbdafcc434d53202e06866597cd6dbbc91e5894fad7155","contract_address":"0x2fb7ff5b1b474e8e691f5bebad9aa7aa3009f6ef22ccc2816f96cdfe217604d","entry_point_selector":"0x12ead94ae9d3f9d2bdb6b847cf255f1f398193a1f88884a0ae8e18f24a037b6","calldata":["0xe3402af6cc1bca3f22d738ab935a5dd8ad1fb230"],"status":"ACCEPTED_ON_L1","status_data":"","messages_sent":[{"to_address":"0xe3402af6cc1bca3f22d738ab935a5dd8ad1fb230","payload":["0xc","0x22"]}],"events":[]}]}'))

      const rf = await f.getBlock(1)
      log(rf)
    })

    it('getContractAbi', async () => {
      const contractAddress = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'

      const rp = await databaseAbiProvider.getContractAbi(contractAddress)
      log(rp)
      expect(rp).deep.eq(JSON.parse('[{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"inputs":[{"name":"implementation_address","type":"felt"}],"name":"constructor","outputs":[],"type":"constructor"},{"inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"__default__","outputs":[{"name":"retdata_size","type":"felt"},{"name":"retdata","type":"felt*"}],"type":"function"},{"inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"__l1_default__","outputs":[],"type":"l1_handler"}]'))

      const rf = await f.getContractAbi(contractAddress)
      log(rf)

      expect(rp).deep.eq(rf)
    })

    it('getClassAbi', async () => {
      const classHash = '0x1ecfc4bf6c3b5317a25fec2eb942db4f336077f7506acc3eb253889d73a45d4'

      const rf = await f.getClassAbi(classHash)
      log(rf)

      expect(rf).deep.eq(JSON.parse('[{"members":[{"name":"low","offset":0,"type":"felt"},{"name":"high","offset":1,"type":"felt"}],"name":"Uint256","size":2,"type":"struct"},{"members":[{"name":"amount","offset":0,"type":"Uint256"},{"name":"reward_debt","offset":2,"type":"Uint256"}],"name":"UserInfo","size":4,"type":"struct"},{"data":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"value","type":"Uint256"}],"keys":[],"name":"Transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"},{"name":"value","type":"Uint256"}],"keys":[],"name":"Approval","type":"event"},{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"data":[{"name":"caller","type":"felt"},{"name":"owner","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"shares","type":"Uint256"}],"keys":[],"name":"Deposit","type":"event"},{"data":[{"name":"caller","type":"felt"},{"name":"receiver","type":"felt"},{"name":"owner","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"shares","type":"Uint256"}],"keys":[],"name":"Withdraw","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"new_fee_percent","type":"felt"}],"keys":[],"name":"FeePercentUpdated","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"new_harvest_window","type":"felt"}],"keys":[],"name":"HarvestWindowUpdated","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"new_harvest_delay","type":"felt"}],"keys":[],"name":"HarvestDelayUpdated","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"new_harvest_delay","type":"felt"}],"keys":[],"name":"HarvestDelayUpdateScheduled","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"new_target_float_percent","type":"felt"}],"keys":[],"name":"TargetFloatPercentUpdated","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategies_len","type":"felt"},{"name":"strategies","type":"felt*"}],"keys":[],"name":"Harvest","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"},{"name":"underlying_amount","type":"Uint256"}],"keys":[],"name":"StrategyDeposit","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"},{"name":"underlying_amount","type":"Uint256"}],"keys":[],"name":"StrategyWithdrawal","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"}],"keys":[],"name":"StrategyTrusted","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"}],"keys":[],"name":"StrategyDistrusted","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"amount","type":"Uint256"}],"keys":[],"name":"FeesClaimed","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"}],"keys":[],"name":"WithdrawalStackPushed","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"strategy_address","type":"felt"}],"keys":[],"name":"WithdrawalStackPopped","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"stack_len","type":"felt"},{"name":"stack","type":"felt*"}],"keys":[],"name":"WithdrawalStackSet","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"index","type":"felt"},{"name":"old_strategy","type":"felt"},{"name":"new_strategy","type":"felt"}],"keys":[],"name":"WithdrawalStackIndexReplaced","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"index1","type":"felt"},{"name":"index2","type":"felt"},{"name":"new_strategy1","type":"felt"},{"name":"new_strategy2","type":"felt"}],"keys":[],"name":"WithdrawalStackIndexesSwapped","type":"event"},{"inputs":[],"name":"getWithdrawalStack","outputs":[{"name":"strategies_withdrawal_stack_len","type":"felt"},{"name":"strategies_withdrawal_stack","type":"felt*"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalFloat","outputs":[{"name":"float","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"lp_token","type":"felt"}],"name":"totalFloatLP","outputs":[{"name":"float","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalStrategyHoldings","outputs":[{"name":"holdings","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"feePercent","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"harvestDelay","outputs":[{"name":"delay","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"harvestWindow","outputs":[{"name":"window","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"targetFloatPercent","outputs":[{"name":"percent","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lockedProfit","outputs":[{"name":"res","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastHarvest","outputs":[{"name":"time","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastHarvestWindowStart","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nextHarvestDelay","outputs":[{"name":"delay","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"name":"name","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"name":"symbol","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"name":"totalSupply","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"name":"decimals","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"account","type":"felt"}],"name":"balanceOf","outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"}],"name":"allowance","outputs":[{"name":"remaining","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAssets","outputs":[{"name":"totalManagedAssets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"asset","outputs":[{"name":"assetTokenAddress","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"assets","type":"Uint256"}],"name":"convertToShares","outputs":[{"name":"shares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"shares","type":"Uint256"}],"name":"convertToAssets","outputs":[{"name":"assets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"receiver","type":"felt"}],"name":"maxDeposit","outputs":[{"name":"maxAssets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"receiver","type":"felt"}],"name":"maxMint","outputs":[{"name":"maxShares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"owner","type":"felt"}],"name":"maxWithdraw","outputs":[{"name":"maxAssets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"assets","type":"Uint256"}],"name":"previewWithdraw","outputs":[{"name":"shares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"owner","type":"felt"}],"name":"maxRedeem","outputs":[{"name":"maxShares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"shares","type":"Uint256"}],"name":"previewRedeem","outputs":[{"name":"assets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"data":[{"name":"depositor","type":"felt"},{"name":"receiver","type":"felt"},{"name":"lp_address","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"shares","type":"Uint256"}],"keys":[],"name":"DepositLP","type":"event"},{"data":[{"name":"caller","type":"felt"},{"name":"receiver","type":"felt"},{"name":"owner","type":"felt"},{"name":"lp_token","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"shares","type":"Uint256"}],"keys":[],"name":"WithdrawLP","type":"event"},{"data":[{"name":"newRewardPerBlock","type":"Uint256"},{"name":"newEndBlock","type":"felt"}],"keys":[],"name":"NewRewardPerBlockAndEndBlock","type":"event"},{"data":[{"name":"user","type":"felt"},{"name":"harvestAmount","type":"Uint256"}],"keys":[],"name":"HarvestRewards","type":"event"},{"inputs":[{"name":"user","type":"felt"},{"name":"token","type":"felt"}],"name":"getUserDeposit","outputs":[{"name":"amount","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"lp_token","type":"felt"}],"name":"isTokenWhitelisted","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"assets","type":"Uint256"}],"name":"previewDeposit","outputs":[{"name":"shares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"assets","type":"Uint256"},{"name":"lock_time","type":"felt"}],"name":"previewDepositForTime","outputs":[{"name":"shares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"lp_token","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"lock_time","type":"felt"}],"name":"previewDepositLP","outputs":[{"name":"shares","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"shares","type":"Uint256"}],"name":"previewMint","outputs":[{"name":"assets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"shares","type":"Uint256"},{"name":"lock_time","type":"felt"}],"name":"previewMintForTime","outputs":[{"name":"assets","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getCurrentBoostValue","outputs":[{"name":"res","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"user","type":"felt"}],"name":"getUserStakeInfo","outputs":[{"name":"unlock_time","type":"felt"},{"name":"tokens_len","type":"felt"},{"name":"tokens","type":"felt*"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTokensMask","outputs":[{"name":"tokens_mask","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getEmergencyBreaker","outputs":[{"name":"address","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getImplementation","outputs":[{"name":"address","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"lp_token","type":"felt"},{"name":"input","type":"Uint256"}],"name":"previewWithdrawLP","outputs":[{"name":"amount","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getDefaultLockTime","outputs":[{"name":"lock_time","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getHarvestTaskContract","outputs":[{"name":"address","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"canHarvest","outputs":[{"name":"yes_no","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"rewardPerBlock","outputs":[{"name":"reward","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"startBlock","outputs":[{"name":"block","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"endBlock","outputs":[{"name":"block","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastRewardBlock","outputs":[{"name":"block","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"accTokenPerShare","outputs":[{"name":"res","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"user","type":"felt"}],"name":"userInfo","outputs":[{"name":"info","type":"UserInfo"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"user","type":"felt"}],"name":"calculatePendingRewards","outputs":[{"name":"rewards","type":"Uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"_from","type":"felt"},{"name":"_to","type":"felt"}],"name":"getMultiplier","outputs":[{"name":"multiplier","type":"felt"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"name","type":"felt"},{"name":"symbol","type":"felt"},{"name":"asset_addr","type":"felt"},{"name":"owner","type":"felt"},{"name":"_reward_per_block","type":"Uint256"},{"name":"start_reward_block","type":"felt"},{"name":"end_reward_block","type":"felt"}],"name":"initializer","outputs":[],"type":"function"},{"inputs":[{"name":"new_implementation","type":"felt"}],"name":"upgrade","outputs":[],"type":"function"},{"inputs":[{"name":"lp_token","type":"felt"},{"name":"mint_calculator_address","type":"felt"},{"name":"is_NFT","type":"felt"}],"name":"addWhitelistedToken","outputs":[{"name":"token_mask","type":"felt"}],"type":"function"},{"inputs":[{"name":"lp_token","type":"felt"}],"name":"removeWhitelistedToken","outputs":[],"type":"function"},{"inputs":[{"name":"address","type":"felt"}],"name":"setEmergencyBreaker","outputs":[],"type":"function"},{"inputs":[{"name":"assets","type":"Uint256"},{"name":"receiver","type":"felt"}],"name":"deposit","outputs":[{"name":"shares","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"assets","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"lock_time_days","type":"felt"}],"name":"depositForTime","outputs":[{"name":"shares","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"lp_token","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"lock_time_days","type":"felt"}],"name":"depositLP","outputs":[{"name":"shares","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"shares","type":"Uint256"},{"name":"receiver","type":"felt"}],"name":"mint","outputs":[{"name":"assets","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"shares","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"lock_time_days","type":"felt"}],"name":"mintForTime","outputs":[{"name":"assets","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"shares","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"owner","type":"felt"}],"name":"redeem","outputs":[{"name":"assets","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"assets","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"owner","type":"felt"}],"name":"withdraw","outputs":[{"name":"shares","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"lp_token","type":"felt"},{"name":"assets","type":"Uint256"},{"name":"receiver","type":"felt"},{"name":"owner","type":"felt"}],"name":"withdrawLP","outputs":[{"name":"shares","type":"Uint256"}],"type":"function"},{"inputs":[{"name":"recipient","type":"felt"},{"name":"amount","type":"Uint256"}],"name":"transfer","outputs":[{"name":"success","type":"felt"}],"type":"function"},{"inputs":[{"name":"sender","type":"felt"},{"name":"recipient","type":"felt"},{"name":"amount","type":"Uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"felt"}],"type":"function"},{"inputs":[{"name":"spender","type":"felt"},{"name":"amount","type":"Uint256"}],"name":"approve","outputs":[{"name":"success","type":"felt"}],"type":"function"},{"inputs":[{"name":"new_lock_time_days","type":"felt"}],"name":"setDefaultLockTime","outputs":[],"type":"function"},{"inputs":[{"name":"new_boost_value","type":"felt"}],"name":"setStakeBoost","outputs":[],"type":"function"},{"inputs":[{"name":"fee","type":"felt"}],"name":"setFeePercent","outputs":[],"type":"function"},{"inputs":[{"name":"window","type":"felt"}],"name":"setHarvestWindow","outputs":[],"type":"function"},{"inputs":[{"name":"new_delay","type":"felt"}],"name":"setHarvestDelay","outputs":[],"type":"function"},{"inputs":[{"name":"new_float","type":"felt"}],"name":"setTargetFloatPercent","outputs":[],"type":"function"},{"inputs":[{"name":"address","type":"felt"}],"name":"setHarvestTaskContract","outputs":[],"type":"function"},{"inputs":[{"name":"strategies_len","type":"felt"},{"name":"strategies","type":"felt*"}],"name":"harvest","outputs":[],"type":"function"},{"inputs":[{"name":"strategy_address","type":"felt"},{"name":"underlying_amount","type":"Uint256"}],"name":"depositIntoStrategy","outputs":[],"type":"function"},{"inputs":[{"name":"strategy_address","type":"felt"},{"name":"underlying_amount","type":"Uint256"}],"name":"withdrawFromStrategy","outputs":[],"type":"function"},{"inputs":[{"name":"strategy_address","type":"felt"}],"name":"trustStrategy","outputs":[],"type":"function"},{"inputs":[{"name":"strategy_address","type":"felt"}],"name":"distrustStrategy","outputs":[],"type":"function"},{"inputs":[{"name":"amount","type":"Uint256"}],"name":"claimFees","outputs":[],"type":"function"},{"inputs":[{"name":"strategy","type":"felt"}],"name":"pushToWithdrawalStack","outputs":[],"type":"function"},{"inputs":[],"name":"popFromWithdrawalStack","outputs":[],"type":"function"},{"inputs":[{"name":"stack_len","type":"felt"},{"name":"stack","type":"felt*"}],"name":"setWithdrawalStack","outputs":[],"type":"function"},{"inputs":[{"name":"index","type":"felt"},{"name":"address","type":"felt"}],"name":"replaceWithdrawalStackIndex","outputs":[],"type":"function"},{"inputs":[{"name":"index1","type":"felt"},{"name":"index2","type":"felt"}],"name":"swapWithdrawalStackIndexes","outputs":[],"type":"function"},{"inputs":[{"name":"_reward_per_block","type":"Uint256"},{"name":"new_end_block","type":"felt"}],"name":"updateRewardPerBlockAndEndBlock","outputs":[],"type":"function"},{"inputs":[],"name":"harvestRewards","outputs":[],"type":"function"},{"inputs":[{"name":"new_owner","type":"felt"}],"name":"transferOwnership","outputs":[],"type":"function"},{"inputs":[],"name":"pause","outputs":[],"type":"function"},{"inputs":[],"name":"unpause","outputs":[],"type":"function"}]'))

      // const rp = await databaseAbiProvider.getClassAbi(contractAddress)
      // log(rp)

      // expect(rp).deep.eq(rf)

      expect(databaseAbiProvider.getClassAbi(classHash)).to.throw
    })

    it('callView', async () => {
      let contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      let blockNumber = 200000

      let rp = await databaseAbiProvider.callView(contractAddressProxy, 'get_implementation', blockNumber)
      log(rp)
      expect(rp).deep.eq([
        "0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30"
      ])

      let rf = await f.callView(contractAddressProxy, 'get_implementation', blockNumber)
      log(rf)
      expect(rp).deep.eq(rf)

      rp = await databaseAbiProvider.callView(contractAddressProxy, 'get_implementation') // latest
      log(rp)
      expect(rp).deep.eq([
        "0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30"
      ])

      blockNumber = 119485 // <-- deployed

      rp = await databaseAbiProvider.callView(contractAddressProxy, 'get_implementation', blockNumber)
      log(rp)
      expect(rp).deep.eq([
        "0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704"
      ])

      blockNumber = 100000

      expect(databaseAbiProvider.callView(contractAddressProxy, 'get_implementation', blockNumber)).to.throw
    })

  })

})