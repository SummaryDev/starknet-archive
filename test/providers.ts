import {expect} from 'chai'
import {defaultProvider} from "starknet"
import {createConnection, DataSource} from "typeorm"
import {
  FeederApiProvider,
  PathfinderApiProvider,
  DatabaseAbiProvider,
  DatabaseViewProvider,
  ApiProvider
} from '../src/providers'
import * as console from 'starknet-parser/lib/helpers/console'
import {Abi, GetBlockResponse, TransactionReceipt} from 'starknet-parser/src/types/rawStarknet'
import {TransactionCallOrganizer} from 'starknet-parser/lib/organizers/TransactionCallOrganizer'
import {BlockOrganizer} from 'starknet-parser/lib/organizers/BlockOrganizer'
import {OnlineAbiProvider} from 'starknet-parser/lib/organizers/AbiProvider'
// import JSON = require("json5")
import {EventArgument} from "starknet-parser/src/types/organizedStarknet";
import {ArgumentEntity} from "../src/entities";
import {BigNumberish} from "starknet/utils/number";
import {BigNumber} from "ethers";
// import {BN} from "bn";

function log(o: any) {
  console.log(JSON.stringify(o, null, 2))
}
describe('providers', function() {
  this.timeout(6000000)

  let ds:DataSource

  before(() => {
    return createConnection().then(o => {
      ds = o
      log(`connected to db`)
    })
  })

  describe('DatabaseAbiProvider', async() => {

    it('finds implementation contract address for proxy contract with a getter view function', async() => {
      const p = new DatabaseAbiProvider(new FeederApiProvider(defaultProvider), new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds), ds)

      const blockNumber = 119485 // <-- WAS DEPLOYED IN THIS BLOCK https://goerli.voyager.online/tx/0x3d86f1b062475dc31f57ad8666ee78c332ed2588ad360f6316108702a066123
      const contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      const abiProxy = await p.getBare(contractAddressProxy)
      log(abiProxy)
      expect(abiProxy).not.undefined
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await p.findImplementationContractAddress(contractAddressProxy, abiProxy, 200000)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30')

      implementationContractAddress = await p.findImplementationContractAddress(contractAddressProxy, abiProxy, blockNumber)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704')

      expect(p.findImplementationContractAddress(contractAddressProxy, abiProxy, blockNumber-1)).to.throw
    })

    it('finds implementation contract address for proxy contract with a constructor and events', async() => {
      const p = new DatabaseAbiProvider(new FeederApiProvider(defaultProvider), new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds), ds)

      const blockNumber = 134018
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await p.getBare(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy!)
      expect(isProxy).true

      let implementationContractAddress = await p.findImplementationContractAddress(contractAddressProxy, abiProxy, blockNumber)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      expect(p.findImplementationContractAddress(contractAddressProxy, abiProxy, blockNumber-1)).to.throw
    })

    it('finds implementation contract address from proxy constructor', async() => {
      const p = new DatabaseAbiProvider(new FeederApiProvider(defaultProvider), new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds), ds)

      const blockNumber = 134018
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await p.getBare(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      /*
      select b.block_number, t.transaction_hash, t.constructor_calldata from transaction as t, block as b where t.contract_address = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921' and t.type = 'DEPLOY' and t."blockBlockNumber" = b.block_number order by b.block_number desc;

      134018	0x2dd6e7e242921c61c8b3b8dc07cf88a8792562dc21b732550af4fbfb5aee217	["0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae"] <-- WAS DEPLOYED IN THIS BLOCK
       */

      let implementationContractAddress = await p.findImplementationContractAddressByConstructor(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      expect(p.findImplementationContractAddressByConstructor(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw
    })

    it('finds implementation contract address from proxy constructor with multiple inputs', async() => {
      const p = new DatabaseAbiProvider(new FeederApiProvider(defaultProvider), new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds), ds)

      const blockNumber = 62135
      const contractAddressProxy = '0x1317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e'
      const abiProxy = await p.getBare(contractAddressProxy)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      /*
      select b.block_number, t.transaction_hash, t.constructor_calldata from transaction as t, block as b where t.contract_address = '0x1317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e' and t.type = 'DEPLOY' and t."block_number" = b.block_number order by b.block_number desc;

      62135	0x53facbf470346c7e21452e5b8ef4c2b210547f9463b00b73b8a16e8daa5e58c	["0x6043ed114a9a1987fe65b100d0da46fe71b2470e7e5ff8bf91be5346f5e5e3", "0x74db315cc7e1e821dfd229890068ea197594ac3e29fa0038dc12704f63ebb83"] <-- WAS DEPLOYED IN THIS BLOCK
       */

      let implementationContractAddress = await p.findImplementationContractAddressByConstructor(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x74db315cc7e1e821dfd229890068ea197594ac3e29fa0038dc12704f63ebb83')

      expect(p.findImplementationContractAddressByConstructor(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw
    })

    it('finds implementation contract address from upgrade event', async() => {
      const p = new DatabaseAbiProvider(new FeederApiProvider(defaultProvider), new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds), ds)

      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await p.getBare(contractAddressProxy)
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

      let implementationContractAddress = await p.findImplementationContractAddressByEvent(contractAddressProxy, abiProxy!, 164233)
      expect(implementationContractAddress).eq('0x65c4fe3e8d1eaa783a62417271af5546d9164cc81d7780617b1295722bfd535')

      implementationContractAddress = await p.findImplementationContractAddressByEvent(contractAddressProxy, abiProxy!, 161300)
      expect(implementationContractAddress).eq('0x3a29ab9db30291ab762af40a510cb0fe61c4a4f1050142d1ea9d58754cbd641')

      implementationContractAddress = await p.findImplementationContractAddressByEvent(contractAddressProxy, abiProxy!, 146407)
      expect(implementationContractAddress).eq('0x1e7bad045fbf062272ba29f3d95d678868c3151399b25ba8bb1092077a85edd')

      implementationContractAddress = await p.findImplementationContractAddressByEvent(contractAddressProxy, abiProxy!, 134018)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      expect(await p.findImplementationContractAddressByEvent(contractAddressProxy, abiProxy!, 134017)).to.throw
    })

    it('finds implementation contract address from a getter view function', async() => {
      const p = new DatabaseAbiProvider(new FeederApiProvider(defaultProvider), new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds), ds)


      let contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      let blockNumber = 200000
      let abiProxy = await p.getBare(contractAddressProxy)
      log(abiProxy)
      let isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await p.findImplementationContractAddressByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30')

      /*
      was deployed in block 119485
      https://goerli.voyager.online/tx/0x3d86f1b062475dc31f57ad8666ee78c332ed2588ad360f6316108702a066123
       */
      blockNumber = 119485

      implementationContractAddress = await p.findImplementationContractAddressByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704')

      expect(p.findImplementationContractAddressByGetter(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw

      /*
      proxy
      https://goerli.voyager.online/contract/0x01317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e#writeContract

      impl
      https://goerli.voyager.online/contract/0x75a31cd9fc21788e3505f9ca50f2a020cd63430f68dbc66a40fe3a083159ebf

      proxy was deployed in block 62135
      https://goerli.voyager.online/tx/0x3d86f1b062475dc31f57ad8666ee78c332ed2588ad360f6316108702a066123
       */

      contractAddressProxy = '0x1317354276941f7f799574c73fd8fe53fa3f251084b4c04d88cf601b6bd915e'

      blockNumber = 200000
      abiProxy = await p.getBare(contractAddressProxy)
      log(abiProxy)
      isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      implementationContractAddress = await p.findImplementationContractAddressByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x75a31cd9fc21788e3505f9ca50f2a020cd63430f68dbc66a40fe3a083159ebf')

      blockNumber = 70056

      implementationContractAddress = await p.findImplementationContractAddressByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x2c30ac04ab60b7b2be19854f9c7129cc40ff95dd167816fb3be1ea94d7110c8')

      blockNumber = 62135

      implementationContractAddress = await p.findImplementationContractAddressByGetter(contractAddressProxy, abiProxy!, blockNumber)
      expect(implementationContractAddress).eq('0x74db315cc7e1e821dfd229890068ea197594ac3e29fa0038dc12704f63ebb83')

      expect(p.findImplementationContractAddressByGetter(contractAddressProxy, abiProxy!, blockNumber-1)).to.throw
    })

    it('detects proxy contract', async() => {
      const p = new DatabaseAbiProvider(new FeederApiProvider(defaultProvider), new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds), ds)

      const blockNumber = 200000

      const contractAddressProxyByConstructor = '0x0328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxyByConstructor = await p.getBare(contractAddressProxyByConstructor)
      log(abiProxyByConstructor)
      const isProxyByConstructorProxy = DatabaseAbiProvider.isProxy(abiProxyByConstructor)
      expect(isProxyByConstructorProxy).true

      const contractAddressProxyByEvent = '0x0328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxyByEvent = await p.getBare(contractAddressProxyByEvent)
      log(abiProxyByEvent)
      const isProxyByEventProxy = DatabaseAbiProvider.isProxy(abiProxyByEvent)
      expect(isProxyByEventProxy).true

      const contractAddressProxyByReadFunction = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      const abiProxyByReadFunction = await p.getBare(contractAddressProxyByReadFunction)
      log(abiProxyByReadFunction)
      const isProxyByReadFunctionProxy = DatabaseAbiProvider.isProxy(abiProxyByReadFunction)
      expect(isProxyByReadFunctionProxy).true

      const contractAddressRegular = '0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a'
      const abiRegular = await p.getBare(contractAddressRegular)
      log(abiRegular)
      const isRegularProxy = DatabaseAbiProvider.isProxy(abiRegular)
      expect(isRegularProxy).false
    })

    it('gets abi for regular contract', async() => {
      const p = new DatabaseAbiProvider(new FeederApiProvider(defaultProvider), new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds), ds)

      const blockNumber = 200000
      const contractAddress = '0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a'
      const abiBare = await p.getBare(contractAddress)
      log(abiBare)

      const abi = await p.get(contractAddress, blockNumber)
      log(abi)

      expect(abiBare).deep.eq(abi)

      expect(abi).deep.eq(JSON.parse('[{"name":"Uint256","size":2,"type":"struct","members":[{"name":"low","type":"felt","offset":0},{"name":"high","type":"felt","offset":1}]},{"data":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"keys":[],"name":"Transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"approved","type":"felt"},{"name":"tokenId","type":"Uint256"}],"keys":[],"name":"Approve","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"operator","type":"felt"},{"name":"approved","type":"felt"}],"keys":[],"name":"ApprovalForAll","type":"event"},{"name":"constructor","type":"constructor","inputs":[{"name":"name","type":"felt"},{"name":"symbol","type":"felt"},{"name":"owner","type":"felt"}],"outputs":[]},{"name":"nextMintedTokenId","type":"function","inputs":[],"outputs":[{"name":"nextMintedTokenId","type":"Uint256"}],"stateMutability":"view"},{"name":"totalSupply","type":"function","inputs":[],"outputs":[{"name":"totalSupply","type":"Uint256"}],"stateMutability":"view"},{"name":"getOwner","type":"function","inputs":[],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"supportsInterface","type":"function","inputs":[{"name":"interfaceId","type":"felt"}],"outputs":[{"name":"success","type":"felt"}],"stateMutability":"view"},{"name":"name","type":"function","inputs":[],"outputs":[{"name":"name","type":"felt"}],"stateMutability":"view"},{"name":"symbol","type":"function","inputs":[],"outputs":[{"name":"symbol","type":"felt"}],"stateMutability":"view"},{"name":"balanceOf","type":"function","inputs":[{"name":"owner","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view"},{"name":"ownerOf","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"getApproved","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"approved","type":"felt"}],"stateMutability":"view"},{"name":"isApprovedForAll","type":"function","inputs":[{"name":"owner","type":"felt"},{"name":"operator","type":"felt"}],"outputs":[{"name":"isApproved","type":"felt"}],"stateMutability":"view"},{"name":"tokenURI","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"stateMutability":"view"},{"name":"approve","type":"function","inputs":[{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"setApprovalForAll","type":"function","inputs":[{"name":"operator","type":"felt"},{"name":"approved","type":"felt"}],"outputs":[]},{"name":"transferFrom","type":"function","inputs":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"safeTransferFrom","type":"function","inputs":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"},{"name":"data_len","type":"felt"},{"name":"data","type":"felt*"}],"outputs":[]},{"name":"mint","type":"function","inputs":[{"name":"to","type":"felt"},{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"outputs":[]},{"name":"burn","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"transferOwnership","type":"function","inputs":[{"name":"new_owner","type":"felt"}],"outputs":[{"name":"new_owner","type":"felt"}]},{"name":"setTokenURI","type":"function","inputs":[{"name":"tokenId","type":"Uint256"},{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"outputs":[]}]'))
    })

    it('gets abi for proxy contract', async() => {
      const p = new DatabaseAbiProvider(new FeederApiProvider(defaultProvider), new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds), ds)

      const blockNumber = 200000
      const contractAddress = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await p.getBare(contractAddress)
      log(abiProxy)

      const abiImplementation = await p.get(contractAddress, blockNumber)
      log(abiImplementation)

      expect(abiProxy).not.deep.eq(abiImplementation)

      expect(abiProxy).deep.eq(JSON.parse('[{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"name":"constructor","type":"constructor","inputs":[{"name":"implementation_address","type":"felt"}],"outputs":[]},{"name":"__default__","type":"function","inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"outputs":[{"name":"retdata_size","type":"felt"},{"name":"retdata","type":"felt*"}]},{"name":"__l1_default__","type":"l1_handler","inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"outputs":[]}]'))

      expect(abiImplementation).deep.eq(JSON.parse('[{"name":"Uint256","size":2,"type":"struct","members":[{"name":"low","type":"felt","offset":0},{"name":"high","type":"felt","offset":1}]},{"name":"BorrowSnapshot","size":4,"type":"struct","members":[{"name":"principal","type":"Uint256","offset":0},{"name":"interest_index","type":"Uint256","offset":2}]},{"data":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"value","type":"Uint256"}],"keys":[],"name":"Transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"},{"name":"value","type":"Uint256"}],"keys":[],"name":"Approval","type":"event"},{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"data":[{"name":"sender","type":"felt"},{"name":"receiver","type":"felt"},{"name":"amount","type":"Uint256"}],"keys":[],"name":"log_transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"},{"name":"amount","type":"Uint256"}],"keys":[],"name":"log_approve","type":"event"},{"data":[{"name":"cash_prior","type":"Uint256"},{"name":"interest_accumulated","type":"Uint256"},{"name":"borrow_index","type":"Uint256"},{"name":"total_borrows","type":"Uint256"}],"keys":[],"name":"log_accrue_interest","type":"event"},{"data":[{"name":"minter","type":"felt"},{"name":"mint_underlying_amount","type":"Uint256"},{"name":"mint_xtoken_amount","type":"Uint256"}],"keys":[],"name":"log_mint","type":"event"},{"data":[{"name":"redeemer","type":"felt"},{"name":"redeem_underlying_amount","type":"Uint256"},{"name":"redeem_xtoken_amount","type":"Uint256"}],"keys":[],"name":"log_redeem","type":"event"},{"data":[{"name":"borrower","type":"felt"},{"name":"borrow_amount","type":"Uint256"},{"name":"account_borrow_balance","type":"Uint256"},{"name":"total_borrows","type":"Uint256"},{"name":"borrow_index","type":"Uint256"}],"keys":[],"name":"log_borrow","type":"event"},{"data":[{"name":"payer","type":"felt"},{"name":"borrower","type":"felt"},{"name":"repay_amount","type":"Uint256"},{"name":"account_borrow_balance","type":"Uint256"},{"name":"total_borrows","type":"Uint256"},{"name":"borrow_index","type":"Uint256"}],"keys":[],"name":"log_repay","type":"event"},{"data":[{"name":"xcontroller","type":"felt"}],"keys":[],"name":"log_set_xcontroller","type":"event"},{"data":[{"name":"to","type":"felt"},{"name":"reduce_amount","type":"Uint256"},{"name":"new_total_reserves","type":"Uint256"}],"keys":[],"name":"log_reduce_reserves","type":"event"},{"data":[{"name":"benefactor","type":"felt"},{"name":"add_amount","type":"Uint256"},{"name":"new_total_reserves","type":"Uint256"}],"keys":[],"name":"log_add_reserves","type":"event"},{"data":[{"name":"treasury","type":"felt"}],"keys":[],"name":"log_set_treasury","type":"event"},{"data":[{"name":"interest_rate_model","type":"felt"}],"keys":[],"name":"log_set_interest_rate_model","type":"event"},{"data":[{"name":"factor","type":"Uint256"}],"keys":[],"name":"log_set_reserve_factor","type":"event"},{"data":[{"name":"liquidator","type":"felt"},{"name":"borrower","type":"felt"},{"name":"actual_repay_amount","type":"Uint256"},{"name":"xtoken_collateral","type":"felt"},{"name":"actual_xtoken_seize_amount","type":"Uint256"}],"keys":[],"name":"log_liquidate","type":"event"},{"data":[{"name":"admin","type":"felt"}],"keys":[],"name":"log_set_proxy_admin","type":"event"},{"data":[{"name":"new_owner","type":"felt"}],"keys":[],"name":"log_transfer_ownership","type":"event"},{"name":"initializer","type":"function","inputs":[{"name":"_name","type":"felt"},{"name":"_symbol","type":"felt"},{"name":"_decimals","type":"felt"},{"name":"_owner","type":"felt"},{"name":"_underlying","type":"felt"},{"name":"_xcontroller","type":"felt"},{"name":"_interest_rate_model","type":"felt"},{"name":"_initial_exchange_rate","type":"Uint256"},{"name":"_proxy_admin","type":"felt"}],"outputs":[]},{"name":"upgrade","type":"function","inputs":[{"name":"new_implementation","type":"felt"}],"outputs":[]},{"name":"proxy_set_admin","type":"function","inputs":[{"name":"new_proxy_admin","type":"felt"}],"outputs":[]},{"name":"proxy_get_admin","type":"function","inputs":[],"outputs":[{"name":"admin","type":"felt"}],"stateMutability":"view"},{"name":"proxy_get_implementation","type":"function","inputs":[],"outputs":[{"name":"implementation","type":"felt"}],"stateMutability":"view"},{"name":"name","type":"function","inputs":[],"outputs":[{"name":"name","type":"felt"}],"stateMutability":"view"},{"name":"symbol","type":"function","inputs":[],"outputs":[{"name":"symbol","type":"felt"}],"stateMutability":"view"},{"name":"totalSupply","type":"function","inputs":[],"outputs":[{"name":"totalSupply","type":"Uint256"}],"stateMutability":"view"},{"name":"decimals","type":"function","inputs":[],"outputs":[{"name":"decimals","type":"felt"}],"stateMutability":"view"},{"name":"balanceOf","type":"function","inputs":[{"name":"account","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view"},{"name":"allowance","type":"function","inputs":[{"name":"owner","type":"felt"},{"name":"spender","type":"felt"}],"outputs":[{"name":"remaining","type":"Uint256"}],"stateMutability":"view"},{"name":"is_xtoken","type":"function","inputs":[],"outputs":[{"name":"bool","type":"felt"}],"stateMutability":"view"},{"name":"get_underlying","type":"function","inputs":[],"outputs":[{"name":"underlying","type":"felt"}],"stateMutability":"view"},{"name":"get_not_entered","type":"function","inputs":[],"outputs":[{"name":"not_entered","type":"felt"}],"stateMutability":"view"},{"name":"get_xcontroller","type":"function","inputs":[],"outputs":[{"name":"xcontroller","type":"felt"}],"stateMutability":"view"},{"name":"get_interest_rate_model","type":"function","inputs":[],"outputs":[{"name":"interest_rate_model","type":"felt"}],"stateMutability":"view"},{"name":"get_owner","type":"function","inputs":[],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"get_initial_exchange_rate","type":"function","inputs":[],"outputs":[{"name":"rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_reserve_factor","type":"function","inputs":[],"outputs":[{"name":"factor","type":"Uint256"}],"stateMutability":"view"},{"name":"get_protocol_seize_share_factor","type":"function","inputs":[],"outputs":[{"name":"factor","type":"Uint256"}],"stateMutability":"view"},{"name":"get_accrual_block_timestamp","type":"function","inputs":[],"outputs":[{"name":"timestamp","type":"felt"}],"stateMutability":"view"},{"name":"get_borrow_index","type":"function","inputs":[],"outputs":[{"name":"index","type":"Uint256"}],"stateMutability":"view"},{"name":"get_total_borrows","type":"function","inputs":[],"outputs":[{"name":"total_borrows","type":"Uint256"}],"stateMutability":"view"},{"name":"get_total_reserves","type":"function","inputs":[],"outputs":[{"name":"total_reserves","type":"Uint256"}],"stateMutability":"view"},{"name":"get_exchange_rate_stored","type":"function","inputs":[],"outputs":[{"name":"rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_borrow_balance_stored","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view"},{"name":"get_account_snapshot","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"xtoken_balance","type":"Uint256"},{"name":"borrow_balance","type":"Uint256"},{"name":"exchange_rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_account_borrows","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"borrow_snapshot","type":"BorrowSnapshot"}],"stateMutability":"view"},{"name":"get_cash","type":"function","inputs":[],"outputs":[{"name":"cash_prior","type":"Uint256"}],"stateMutability":"view"},{"name":"get_borrow_rate","type":"function","inputs":[],"outputs":[{"name":"borrow_rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_supply_rate","type":"function","inputs":[],"outputs":[{"name":"supply_rate","type":"Uint256"}],"stateMutability":"view"},{"name":"get_treasury","type":"function","inputs":[],"outputs":[{"name":"treasury","type":"felt"}],"stateMutability":"view"},{"name":"set_xcontroller","type":"function","inputs":[{"name":"_xcontroller","type":"felt"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_reserve_factor","type":"function","inputs":[{"name":"_factor","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_protocol_seize_share_factor","type":"function","inputs":[{"name":"_factor","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_interest_rate_model","type":"function","inputs":[{"name":"_interest_rate_model","type":"felt"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"set_treasury","type":"function","inputs":[{"name":"_treasury","type":"felt"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"transfer","type":"function","inputs":[{"name":"recipient","type":"felt"},{"name":"amount","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"transferFrom","type":"function","inputs":[{"name":"sender","type":"felt"},{"name":"recipient","type":"felt"},{"name":"amount","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"approve","type":"function","inputs":[{"name":"spender","type":"felt"},{"name":"amount","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"increaseAllowance","type":"function","inputs":[{"name":"spender","type":"felt"},{"name":"added_value","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"decreaseAllowance","type":"function","inputs":[{"name":"spender","type":"felt"},{"name":"subtracted_value","type":"Uint256"}],"outputs":[{"name":"success","type":"felt"}]},{"name":"get_exchange_rate_current","type":"function","inputs":[],"outputs":[{"name":"rate","type":"Uint256"}]},{"name":"get_borrow_balance_current","type":"function","inputs":[{"name":"_account","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}]},{"name":"accrue_interest","type":"function","inputs":[],"outputs":[]},{"name":"mint","type":"function","inputs":[{"name":"_mint_amount","type":"Uint256"}],"outputs":[{"name":"actual_mint_amount","type":"Uint256"}]},{"name":"redeem","type":"function","inputs":[{"name":"_xtoken_amount","type":"Uint256"}],"outputs":[]},{"name":"redeem_underlying","type":"function","inputs":[{"name":"_underlying_token_amount","type":"Uint256"}],"outputs":[]},{"name":"borrow","type":"function","inputs":[{"name":"_borrow_amount","type":"Uint256"}],"outputs":[]},{"name":"repay","type":"function","inputs":[{"name":"_repay_amount","type":"Uint256"}],"outputs":[]},{"name":"repay_for","type":"function","inputs":[{"name":"_borrower","type":"felt"},{"name":"_repay_amount","type":"Uint256"}],"outputs":[]},{"name":"liquidate","type":"function","inputs":[{"name":"_borrower","type":"felt"},{"name":"_repay_amount","type":"Uint256"},{"name":"_xtoken_collateral","type":"felt"}],"outputs":[]},{"name":"seize","type":"function","inputs":[{"name":"_liquidator","type":"felt"},{"name":"_borrower","type":"felt"},{"name":"_xtoken_seize_amount","type":"Uint256"}],"outputs":[{"name":"actual_xtoken_seize_amount","type":"Uint256"}]},{"name":"transfer_ownership","type":"function","inputs":[{"name":"_new_owner","type":"felt"}],"outputs":[{"name":"new_owner","type":"felt"}]},{"name":"reduce_reserves","type":"function","inputs":[{"name":"_reduce_amount","type":"Uint256"}],"outputs":[]},{"name":"add_reserves","type":"function","inputs":[{"name":"_add_amount","type":"Uint256"}],"outputs":[]},{"name":"constructor","type":"constructor","inputs":[{"name":"implementation_address","type":"felt"}],"outputs":[]}]'))
    })

    it('organizeEvent for proxy contract', async () => {
      const txHash = '0x61fb0f3732a9af7c37351238482e2f51e027955a7797c1202995efb9e49b620'
      const getTransactionReceiptResponse = await defaultProvider.getTransactionReceipt({txHash: txHash}) as any
      const blockNumber = getTransactionReceiptResponse.block_number as number
      const receipt = getTransactionReceiptResponse as TransactionReceipt
      log(receipt)

      const transactionCallOrganizer = new TransactionCallOrganizer(new DatabaseAbiProvider(new FeederApiProvider(defaultProvider), new DatabaseViewProvider(new FeederApiProvider(defaultProvider), ds), ds) /*new OnlineAbiProvider(defaultProvider)*/)

      const organizedEvents = await transactionCallOrganizer.organizeEvents(receipt, blockNumber)

      log(organizedEvents)

      expect(organizedEvents).deep.eq(JSON.parse('[{"name":"log_add_reserves","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"benefactor","type":"felt","value":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921"},{"name":"add_amount","type":"Uint256","value":{"low":"0x0","high":"0x0"}},{"name":"new_total_reserves","type":"Uint256","value":{"low":"0x0","high":"0x0"}}]},{"name":"log_accrue_interest","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"cash_prior","type":"Uint256","value":{"low":"0x1d9b02b09","high":"0x0"}},{"name":"interest_accumulated","type":"Uint256","value":{"low":"0x9","high":"0x0"}},{"name":"borrow_index","type":"Uint256","value":{"low":"0xde57af71d601602","high":"0x0"}},{"name":"total_borrows","type":"Uint256","value":{"low":"0x39426e4","high":"0x0"}}]},{"name":"Transfer","transmitter_contract":"0x3815b591e7992981b640061e2bee59452477a06464b35585e8b3554e86e4b5","arguments":[{"name":"_from","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8"},{"name":"to","type":"felt","value":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921"},{"name":"value","type":"Uint256","value":{"low":"0x4e0ee90","high":"0x0"}}]},{"name":"Transfer","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"from_","type":"felt","value":"0x0"},{"name":"to","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8"},{"name":"value","type":"Uint256","value":{"low":"0xddcca6c4d0005f6a88","high":"0x0"}}]},{"name":"log_mint","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"minter","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8"},{"name":"mint_underlying_amount","type":"Uint256","value":{"low":"0x4e0ee90","high":"0x0"}},{"name":"mint_xtoken_amount","type":"Uint256","value":{"low":"0xddcca6c4d0005f6a88","high":"0x0"}}]},{"name":"log_transfer","transmitter_contract":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921","arguments":[{"name":"sender","type":"felt","value":"0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921"},{"name":"receiver","type":"felt","value":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8"},{"name":"amount","type":"Uint256","value":{"low":"0xddcca6c4d0005f6a88","high":"0x0"}}]},{"name":"transaction_executed","transmitter_contract":"0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8","arguments":[{"name":"hash","type":"felt","value":"0x61fb0f3732a9af7c37351238482e2f51e027955a7797c1202995efb9e49b620"},{"name":"response_len","type":"felt","value":"0x2"},{"name":"response","type":"felt*","value":["0x4e0ee90","0x0"]}]}]'))

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

    it('organizeBlock problem blocks', async function () {
      const blocks = [167434/*183423/*190290/*161308/*164233/*62135/*111570/*38172/*36568/*27592/*17281/*71368/*71405/*200501/*1564/*1064/*86*/]

      const blockApiProvider = new FeederApiProvider(defaultProvider)
      const apiProvider =  new PathfinderApiProvider('https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a')

      const blockOrganizer = new BlockOrganizer(new DatabaseAbiProvider(apiProvider, new DatabaseViewProvider(apiProvider, ds), ds) /*new OnlineAbiProvider(defaultProvider)*/)

      for(let i=0; i < blocks.length; i++) {
        const blockNumber = blocks[i]
        console.info(`organizing block ${blockNumber}`)

        const getBlockResponse = await blockApiProvider.getBlock(blockNumber)
        // log(getBlockResponse)

        const organizedBlock = await blockOrganizer.organizeBlock(getBlockResponse)
        log(organizedBlock)

        console.info(`done with block ${blockNumber}`)
      }
    })

  })

  describe('ApiProvider', async function() {
    const p = new PathfinderApiProvider('https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a')
    const f = new FeederApiProvider(defaultProvider)

    it('getBlock', async () => {
      const rp = await p.getBlock(1)
      log(rp)
      expect(rp).deep.eq(JSON.parse('{"block_hash":"0x75e00250d4343326f322e370df4c9c73c7be105ad9f532eeb97891a34d9e4a5","parent_hash":"0x7d328a71faf48c5c3857e99f20a77b18522480956d1cd5bff1ff2df3c8b427b","block_number":1,"status":"ACCEPTED_ON_L1","sequencer":"0x0","new_root":"0x3f04ffa63e188d602796505a2ee4f6e1f294ee29a914b057af8e75b17259d9f","old_root":"0x2c2bb91714f8448ed814bdac274ab6fcdbafc22d835f9e847e5bee8c2e5444e","accepted_time":1636989916,"gas_price":"0x0","transactions":[{"txn_hash":"0x4dd12d3b82c3d0b216503c6abf63f1ccad222461582eac82057d46c327331d2","contract_address":"0x543e54f26ae33686f57da2ceebed98b340c3a78e9390931bd84fb711d5caabc","status":"ACCEPTED_ON_L1","status_data":"","messages_sent":[],"events":[]},{"txn_hash":"0x1a5f7247cc207f5b5c2e48b7605e46b872b83a2fa842955aea42d3cd80dbff","contract_address":"0x2fb7ff5b1b474e8e691f5bebad9aa7aa3009f6ef22ccc2816f96cdfe217604d","status":"ACCEPTED_ON_L1","status_data":"","messages_sent":[],"events":[]},{"txn_hash":"0x5ea9bca61575eeb4ed38a16cefcbf66ba1ed642642df1a1c07b44316791b378","contract_address":"0x1bb929cc5e6d80f0c71e90365ab77e9cbb2e0a290d72255a3f4d34060b5ed52","status":"ACCEPTED_ON_L1","status_data":"","messages_sent":[],"events":[]},{"txn_hash":"0x6525d9aa309e5c80abbdafcc434d53202e06866597cd6dbbc91e5894fad7155","contract_address":"0x2fb7ff5b1b474e8e691f5bebad9aa7aa3009f6ef22ccc2816f96cdfe217604d","entry_point_selector":"0x12ead94ae9d3f9d2bdb6b847cf255f1f398193a1f88884a0ae8e18f24a037b6","calldata":["0xe3402af6cc1bca3f22d738ab935a5dd8ad1fb230"],"status":"ACCEPTED_ON_L1","status_data":"","messages_sent":[{"to_address":"0xe3402af6cc1bca3f22d738ab935a5dd8ad1fb230","payload":["0xc","0x22"]}],"events":[]}]}'))

      const rf = await f.getBlock(1)
      log(rf)
    })

    it('getAbi', async () => {
      const rp = await p.getAbi('0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921')
      log(rp)
      expect(rp).deep.eq(JSON.parse('[{"data":[{"name":"implementation","type":"felt"}],"keys":[],"name":"Upgraded","type":"event"},{"inputs":[{"name":"implementation_address","type":"felt"}],"name":"constructor","outputs":[],"type":"constructor"},{"inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"__default__","outputs":[{"name":"retdata_size","type":"felt"},{"name":"retdata","type":"felt*"}],"type":"function"},{"inputs":[{"name":"selector","type":"felt"},{"name":"calldata_size","type":"felt"},{"name":"calldata","type":"felt*"}],"name":"__l1_default__","outputs":[],"type":"l1_handler"}]'))

      const rf = await f.getAbi('0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921')
      log(rf)

      expect(rp).deep.eq(rf)
    })

    it('callView', async () => {
      let contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      let blockNumber = 200000

      let rp = await p.callView(contractAddressProxy, 'get_implementation', blockNumber)
      log(rp)
      expect(rp).deep.eq([
        "0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30"
      ])

      let rf = await f.callView(contractAddressProxy, 'get_implementation', blockNumber)
      log(rf)
      expect(rp).deep.eq(rf)

      rp = await p.callView(contractAddressProxy, 'get_implementation') // latest
      log(rp)
      expect(rp).deep.eq([
        "0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30"
      ])

      blockNumber = 119485 // <-- deployed

      rp = await p.callView(contractAddressProxy, 'get_implementation', blockNumber)
      log(rp)
      expect(rp).deep.eq([
        "0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704"
      ])

      blockNumber = 100000

      expect(p.callView(contractAddressProxy, 'get_implementation', blockNumber)).to.throw
    })

    xit('mix api providers', async () => {
      const feederApiProvider = new FeederApiProvider(defaultProvider)
      const pathfinderApiProvider = new PathfinderApiProvider('https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a')

      const blockOrganizer = new BlockOrganizer(new DatabaseAbiProvider(pathfinderApiProvider, new DatabaseViewProvider(pathfinderApiProvider, ds), ds))

      for (let blockNumber = 200024; blockNumber <= 200100; blockNumber++) {
        console.info(`organizing block ${blockNumber}`)

        const getBlockResponse = await feederApiProvider.getBlock(blockNumber)
        console.info(`from feederApiProvider ${blockNumber}`)

        const organizedBlock = await blockOrganizer.organizeBlock(getBlockResponse)

        console.info(`done with block ${blockNumber}`)
      }

    })
  })

  describe('decimal', async () => {

    it('saves decimal', async () => {
      let n = 'test-2'
      let d: BigNumber = BigNumber.from('0xdc489ed04e2b3431b33f8f8201eb432c57ea0640dcbb876a611efa30ad6256')
      let a = {name: n, type:'test', value: 'test', decimal: d} as EventArgument
      let r = ds.getRepository<EventArgument>(ArgumentEntity)
      let saved = await r.save(a)
      console.info(saved)

      // a = {name: 'test', type:'test', value: 'test'} as EventArgumentData
      // r = ds.getRepository<EventArgument>(ArgumentEntity)
      // saved = await r.save(a)
      // console.info(saved)

      let found = await r.findBy({name: n})

      found.forEach(o => {
        console.info(`${o.decimal}`)
      })
    })
  })

})