import {expect} from 'chai'
import {defaultProvider} from "starknet"
import {createConnection, DataSource} from "typeorm"
import {DatabaseAbiProvider} from '../src/providers'
// import * as console from 'starknet-parser/lib/helpers/console'
import JSON = require("json5")

function log(o: any) {
  console.log(JSON.stringify(o, null, 2))
}
describe('providers', function() {
  this.timeout(6000000)

  describe('DatabaseAbiProvider', async() => {
    let ds:DataSource

    before(() => {
      return createConnection().then(o => {
        ds = o
        log(`connected to db`)
      })
    })

    it('finds implementation contract address for proxy contract with a getter view function', async() => {
      const p = new DatabaseAbiProvider(defaultProvider, ds)

      const blockNumber = 119485 // <-- WAS DEPLOYED IN THIS BLOCK https://goerli.voyager.online/tx/0x3d86f1b062475dc31f57ad8666ee78c332ed2588ad360f6316108702a066123
      const contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      const abiProxy = await p.get(contractAddressProxy, blockNumber)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await p.findImplementationContractAddress(contractAddressProxy, abiProxy, 200000)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30')

      implementationContractAddress = await p.findImplementationContractAddress(contractAddressProxy, abiProxy, blockNumber)
      log(implementationContractAddress)
      expect(implementationContractAddress).eq('0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704')

      implementationContractAddress = await p.findImplementationContractAddress(contractAddressProxy, abiProxy, blockNumber-1)
      log(implementationContractAddress)
      expect(implementationContractAddress).undefined
    })

    it('finds implementation contract address for proxy contract with a constructor and events', async() => {
      const p = new DatabaseAbiProvider(defaultProvider, ds)

      const blockNumber = 134018
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await p.get(contractAddressProxy, blockNumber)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await p.findImplementationContractAddress(contractAddressProxy, abiProxy, blockNumber)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      implementationContractAddress = await p.findImplementationContractAddress(contractAddressProxy, abiProxy, blockNumber-1)
      expect(implementationContractAddress).undefined
    })

    it('finds implementation contract address from proxy constructor', async() => {
      const p = new DatabaseAbiProvider(defaultProvider, ds)

      const blockNumber = 134018
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await p.get(contractAddressProxy, blockNumber)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      /*
      select b.block_number, t.transaction_hash, t.constructor_calldata from transaction as t, block as b where t.contract_address = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921' and t.type = 'DEPLOY' and t."blockBlockNumber" = b.block_number order by b.block_number desc;

      134018	0x2dd6e7e242921c61c8b3b8dc07cf88a8792562dc21b732550af4fbfb5aee217	["0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae"] <-- WAS DEPLOYED IN THIS BLOCK
       */

      let implementationContractAddress = await p.findImplementationContractAddressByConstructor(contractAddressProxy, abiProxy, blockNumber)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      implementationContractAddress = await p.findImplementationContractAddressByConstructor(contractAddressProxy, abiProxy, blockNumber-1)
      expect(implementationContractAddress).undefined
    })

    it('finds implementation contract address from upgrade event', async() => {
      const p = new DatabaseAbiProvider(defaultProvider, ds)

      const blockNumber = 164233
      const contractAddressProxy = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxy = await p.get(contractAddressProxy, blockNumber)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      /*
      select b.block_number, a.value, e.name, a.name from argument as a, event as e, transaction as t, block as b where e.transmitter_contract = '0x328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921' and a."eventId" = e.id and e.name ilike '%upgrade%' and e."transactionTransactionHash" = t.transaction_hash and t."blockBlockNumber" = b.block_number order by b.block_number desc;

      164233	"0x65c4fe3e8d1eaa783a62417271af5546d9164cc81d7780617b1295722bfd535"	Upgraded	implementation
      161300	"0x3a29ab9db30291ab762af40a510cb0fe61c4a4f1050142d1ea9d58754cbd641"	Upgraded	implementation
      146407	"0x1e7bad045fbf062272ba29f3d95d678868c3151399b25ba8bb1092077a85edd"	Upgraded	implementation
      134018	"0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae"	Upgraded	implementation <-- WAS DEPLOYED IN THIS BLOCK
       */

      let implementationContractAddress = await p.findImplementationContractAddressByEvent(contractAddressProxy, abiProxy, 164233)
      expect(implementationContractAddress).eq('0x65c4fe3e8d1eaa783a62417271af5546d9164cc81d7780617b1295722bfd535')

      implementationContractAddress = await p.findImplementationContractAddressByEvent(contractAddressProxy, abiProxy, 161300)
      expect(implementationContractAddress).eq('0x3a29ab9db30291ab762af40a510cb0fe61c4a4f1050142d1ea9d58754cbd641')

      implementationContractAddress = await p.findImplementationContractAddressByEvent(contractAddressProxy, abiProxy, 146407)
      expect(implementationContractAddress).eq('0x1e7bad045fbf062272ba29f3d95d678868c3151399b25ba8bb1092077a85edd')

      implementationContractAddress = await p.findImplementationContractAddressByEvent(contractAddressProxy, abiProxy, 134018)
      expect(implementationContractAddress).eq('0x3cbd5ea6dfab767246b10a6afaa5e6a7019492935b2364d836d7f02a07b58ae')

      implementationContractAddress = await p.findImplementationContractAddressByEvent(contractAddressProxy, abiProxy, 134017)
      expect(implementationContractAddress).undefined
    })

    it('finds implementation contract address from a getter view function', async() => {
      const p = new DatabaseAbiProvider(defaultProvider, ds)

      let blockNumber = 200000
      const contractAddressProxy = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      const abiProxy = await p.get(contractAddressProxy, blockNumber)
      log(abiProxy)
      const isProxy = DatabaseAbiProvider.isProxy(abiProxy)
      expect(isProxy).true

      let implementationContractAddress = await p.findImplementationContractAddressByGetter(contractAddressProxy, abiProxy, blockNumber)
      expect(implementationContractAddress).eq('0x70a61892f03b34f88894f0fb9bb4ae0c63a53f5042f79997862d1dffb8d6a30')

      /*
      was deployed in block 119485
      https://goerli.voyager.online/tx/0x3d86f1b062475dc31f57ad8666ee78c332ed2588ad360f6316108702a066123
       */
      blockNumber = 119485

      implementationContractAddress = await p.findImplementationContractAddressByGetter(contractAddressProxy, abiProxy, blockNumber)
      expect(implementationContractAddress).eq('0x90aa7a9203bff78bfb24f0753c180a33d4bad95b1f4f510b36b00993815704')

      implementationContractAddress = await p.findImplementationContractAddressByGetter(contractAddressProxy, abiProxy, blockNumber-1)
      expect(implementationContractAddress).undefined
    })

    it('detects proxy contract', async() => {
      const p = new DatabaseAbiProvider(defaultProvider, ds)

      const blockNumber = 200000

      const contractAddressProxyByConstructor = '0x0328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxyByConstructor = await p.get(contractAddressProxyByConstructor, blockNumber)
      log(abiProxyByConstructor)
      const isProxyByConstructorProxy = DatabaseAbiProvider.isProxy(abiProxyByConstructor)
      expect(isProxyByConstructorProxy).true

      const contractAddressProxyByEvent = '0x0328eddfaf2c85bd63f814c25b5b81fd21a5ca04993440b24c6b87b6fb93c921'
      const abiProxyByEvent = await p.get(contractAddressProxyByEvent, blockNumber)
      log(abiProxyByEvent)
      const isProxyByEventProxy = DatabaseAbiProvider.isProxy(abiProxyByEvent)
      expect(isProxyByEventProxy).true

      const contractAddressProxyByReadFunction = '0x47495c732aa419dfecb43a2a78b4df926fddb251c7de0e88eab90d8a0399cd8'
      const abiProxyByReadFunction = await p.get(contractAddressProxyByReadFunction, blockNumber)
      log(abiProxyByReadFunction)
      const isProxyByReadFunctionProxy = DatabaseAbiProvider.isProxy(abiProxyByReadFunction)
      expect(isProxyByReadFunctionProxy).true

      const contractAddressRegular = '0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a'
      const abiRegular = await p.get(contractAddressRegular, blockNumber)
      log(abiRegular)
      const isRegularProxy = DatabaseAbiProvider.isProxy(abiRegular)
      expect(isRegularProxy).false
    })

    it('gets abi', async() => {
      const p = new DatabaseAbiProvider(defaultProvider, ds)

      const blockNumber = 200000
      const contractAddress = '0x4e34321e0bce0e4ff8ff0bcb3a9a030d423bca29a9d99cbcdd60edb9a2bf03a'
      const abi = await p.get(contractAddress, blockNumber)
      log(abi)

      expect(abi).deep.eq(JSON.parse('[{"name":"Uint256","size":2,"type":"struct","members":[{"name":"low","type":"felt","offset":0},{"name":"high","type":"felt","offset":1}]},{"data":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"keys":[],"name":"Transfer","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"approved","type":"felt"},{"name":"tokenId","type":"Uint256"}],"keys":[],"name":"Approve","type":"event"},{"data":[{"name":"owner","type":"felt"},{"name":"operator","type":"felt"},{"name":"approved","type":"felt"}],"keys":[],"name":"ApprovalForAll","type":"event"},{"name":"constructor","type":"constructor","inputs":[{"name":"name","type":"felt"},{"name":"symbol","type":"felt"},{"name":"owner","type":"felt"}],"outputs":[]},{"name":"nextMintedTokenId","type":"function","inputs":[],"outputs":[{"name":"nextMintedTokenId","type":"Uint256"}],"stateMutability":"view"},{"name":"totalSupply","type":"function","inputs":[],"outputs":[{"name":"totalSupply","type":"Uint256"}],"stateMutability":"view"},{"name":"getOwner","type":"function","inputs":[],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"supportsInterface","type":"function","inputs":[{"name":"interfaceId","type":"felt"}],"outputs":[{"name":"success","type":"felt"}],"stateMutability":"view"},{"name":"name","type":"function","inputs":[],"outputs":[{"name":"name","type":"felt"}],"stateMutability":"view"},{"name":"symbol","type":"function","inputs":[],"outputs":[{"name":"symbol","type":"felt"}],"stateMutability":"view"},{"name":"balanceOf","type":"function","inputs":[{"name":"owner","type":"felt"}],"outputs":[{"name":"balance","type":"Uint256"}],"stateMutability":"view"},{"name":"ownerOf","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"owner","type":"felt"}],"stateMutability":"view"},{"name":"getApproved","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"approved","type":"felt"}],"stateMutability":"view"},{"name":"isApprovedForAll","type":"function","inputs":[{"name":"owner","type":"felt"},{"name":"operator","type":"felt"}],"outputs":[{"name":"isApproved","type":"felt"}],"stateMutability":"view"},{"name":"tokenURI","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"stateMutability":"view"},{"name":"approve","type":"function","inputs":[{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"setApprovalForAll","type":"function","inputs":[{"name":"operator","type":"felt"},{"name":"approved","type":"felt"}],"outputs":[]},{"name":"transferFrom","type":"function","inputs":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"safeTransferFrom","type":"function","inputs":[{"name":"from_","type":"felt"},{"name":"to","type":"felt"},{"name":"tokenId","type":"Uint256"},{"name":"data_len","type":"felt"},{"name":"data","type":"felt*"}],"outputs":[]},{"name":"mint","type":"function","inputs":[{"name":"to","type":"felt"},{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"outputs":[]},{"name":"burn","type":"function","inputs":[{"name":"tokenId","type":"Uint256"}],"outputs":[]},{"name":"transferOwnership","type":"function","inputs":[{"name":"new_owner","type":"felt"}],"outputs":[{"name":"new_owner","type":"felt"}]},{"name":"setTokenURI","type":"function","inputs":[{"name":"tokenId","type":"Uint256"},{"name":"tokenURI_len","type":"felt"},{"name":"tokenURI","type":"felt*"}],"outputs":[]}]'))
    })

  })
})