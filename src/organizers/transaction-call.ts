import {BigNumber} from "ethers"
import {RawCalldata} from "starknet"
import {callArrayStructLength} from "../helpers/constants"
import {
  FunctionCall,
  CallArray,
  FunctionInput,
  OrganizedFunction,
  OrganizedEvent,
  StarknetStruct,
  StarknetArgument
} from "../types/organize-starknet"
import {ContractCallOrganizer} from "./contract-call"
import {AbiProvider} from '../providers/interfaces'
import {BigNumberish} from "starknet/utils/number"
import {InvokeFunctionTransaction, DeployTransaction, TransactionReceipt, FunctionAbi} from "../types/raw-starknet"
import * as console from '../helpers/console'
import JSON = require("json5")

export class TransactionCallOrganizer {

  constructor(private readonly abiProvider: AbiProvider) {
  }

  async organizeInvokeFunction(tx: InvokeFunctionTransaction, blockNumber: number, blockHash?: string) {
    const contractOrganizer = await this.getContractOrganizer(tx.contract_address, blockNumber, blockHash)

    const functionAbi = contractOrganizer.getFunctionAbiFromSelector(tx.entry_point_selector)
    console.debug(functionAbi)

    return this.parseFunction(contractOrganizer, tx.calldata, functionAbi)
  }

  async organizeConstructorFunction(tx: DeployTransaction, blockNumber: number, blockHash?: string) {
    const contractOrganizer = await this.getContractOrganizer(tx.contract_address, blockNumber, blockHash)

    const functionAbi = contractOrganizer.getConstructorFunctionAbi()
    console.debug(functionAbi)

    return this.parseFunction(contractOrganizer, tx.constructor_calldata, functionAbi)
  }

  parseFunction(contractOrganizer: ContractCallOrganizer, calldata?: RawCalldata, functionAbi?: FunctionAbi): OrganizedFunction {
    if (!functionAbi) {
      return this.makeAnonymousFunction(calldata)
    }

    let organizedFunction: OrganizedFunction = {name: functionAbi.name}

    if (!functionAbi.inputs || functionAbi.inputs.length == 0 || !calldata || calldata.length == 0) {
      return organizedFunction
    }

    let functionInputs: FunctionInput[] = []

    let calldataOffset = 0

    for (let abiIndex = 0; abiIndex < functionAbi.inputs.length; abiIndex++) {
      const inputAbi = functionAbi.inputs[abiIndex]
      const nextInputAbi = functionAbi.inputs[abiIndex + 1]

      const isArrayLength = nextInputAbi && nextInputAbi.type.includes('*')
      const isArray = inputAbi.type.includes('*')
      const isFelt = inputAbi.type == 'felt'
      const isTuple = inputAbi.type.startsWith('(') && inputAbi.type.endsWith(')')

      const calldataIndex = abiIndex + calldataOffset

      console.debug(`${abiIndex} ${calldataIndex} ${calldataOffset} ${JSON.stringify(inputAbi)} ${JSON.stringify(nextInputAbi)}`)

      const functionInput: FunctionInput = {} as FunctionInput

      if (isArrayLength) {
        abiIndex++
        const arrayStart = calldataIndex + 1
        const arrayType = nextInputAbi.type.split('*')[0]
        let arrayLength = 0
        const arrayLengthDatum = calldata[calldataIndex]
        try {
          arrayLength = BigNumber.from(arrayLengthDatum).toNumber()
        } catch (err) {
          console.warn(`cannot parse array length from ${arrayLengthDatum} for contract ${contractOrganizer.contractAddress} in block ${contractOrganizer.blockNumber}`)
        }

        functionInput.name = nextInputAbi.name
        functionInput.type = `${arrayType}[${arrayLength}]`

        if (arrayType == 'felt') {
          const feltArray: BigNumberish[] = []

          for (let arrayIndex = 0; arrayIndex < arrayLength; arrayIndex++) {
            const felt = calldata[arrayStart + arrayIndex]
            feltArray.push(felt)
          }// thru elements of array of felt

          functionInput.value = feltArray

          calldataOffset = calldataOffset + arrayLength - 1
        } else {
          const structArray = []
          let structSize = 0

          for (let arrayIndex = 0; arrayIndex < arrayLength; arrayIndex++) {
            const {struct, size} = this.parseStruct(calldata, arrayStart + arrayIndex * structSize, arrayType, contractOrganizer)
            structSize = size

            structArray.push(struct)
          }// thru elements of array of structs

          functionInput.value = structArray

          calldataOffset = calldataOffset + arrayLength * structSize - 1
        }
      } else if (isArray) {
        continue
      } else if (isFelt) {
        functionInput.name = inputAbi.name
        functionInput.type = inputAbi.type

        functionInput.value = calldata[calldataIndex]
      } else if (isTuple) {
        functionInput.name = inputAbi.name
        functionInput.type = inputAbi.type

        const propertyValue1 = calldata[calldataIndex]
        const propertyValue2 = calldata[calldataIndex + 1]
        functionInput.value = [propertyValue1, propertyValue2]

        //TODO handle tuples of size over 2
        calldataOffset = calldataOffset + 1
      } else {
        functionInput.name = inputAbi.name
        functionInput.type = inputAbi.type

        const {struct, size} = this.parseStruct(calldata, calldataIndex, inputAbi.type, contractOrganizer)

        functionInput.value = struct

        calldataOffset = calldataOffset + size - 1
      }

      functionInputs.push(functionInput)
    } // thru functionAbi input definitions

    organizedFunction.inputs = functionInputs

    return organizedFunction
  }

  parseStruct(calldata: RawCalldata, startIndex: number, structType: string, contractOrganizer: ContractCallOrganizer) {
    const structAbi = contractOrganizer.getStructAbiFromStructType(structType)
    console.debug(structAbi)

    const struct: StarknetArgument = {}

    if (!structAbi) {
      //TODO this is a precaution: haven't seen a missing struct abi yet. Assuming struct size is 1 which may be wrong and will affect fields further and is dangerous. Not throwing but ContractAnalyzer::getStructFromStructs will log a warning for now.
      struct['anonymous'] = calldata[startIndex]
      return {struct: struct, size: 1}
    }

    for (let propertyIndex = 0; propertyIndex < structAbi.properties.length; propertyIndex++) {
      const propertyAbi = structAbi.properties[propertyIndex]

      const propertyName = propertyAbi.name
      const propertyType = propertyAbi.type
      const propertyOffset = propertyAbi.offset

      const calldataIndex = startIndex + propertyOffset

      const isTuple = propertyType.startsWith('(') && propertyType.endsWith(')')

      let propertyValue

      if (propertyType == 'felt') {
        propertyValue = calldata[calldataIndex]
        struct[propertyName] = propertyValue
      } else if (propertyType == 'felt*') {
        //TODO handle felt* in struct
        throw new Error(`cannot handle ${propertyType} in struct`)
      } else if (isTuple) {
        const propertyValue1 = calldata[calldataIndex]
        const propertyValue2 = calldata[calldataIndex + 1]
        struct[propertyName] = [propertyValue1, propertyValue2]
      } else {
        const {struct: structPropertyValue, size: structPropertySize} = this.parseStruct(calldata, calldataIndex, propertyType, contractOrganizer)
        propertyValue = structPropertyValue
        struct[propertyName] = propertyValue
      }

    }

    return {struct: struct, size: structAbi.size}
  }

  makeAnonymousFunction(calldata?: RawCalldata) {
    let functionInputs: FunctionInput[] = []

    if (calldata) {
      functionInputs = calldata.map((o, i) => {
        return {name: `input_${i}`, value: o} as FunctionInput;
      })
    }
    return {name: 'anonymous', inputs: functionInputs} as OrganizedFunction;
  }

  async getContractOrganizer(contractAddress: string, blockNumber: number, blockHash?: string) {
    const contractCallOrganizer = new ContractCallOrganizer(contractAddress, blockNumber, this.abiProvider, blockHash)
    await contractCallOrganizer.initialize()

    return contractCallOrganizer
  }

  /**
   * @dev - Transactions have:
   * 1) An array of contracts to call
   * 2) The arguments of each contract call
   * @returns an organized object of a transaction calldata
   */
  static destructureFunctionCalldata(tx: InvokeFunctionTransaction) {
    if (!tx.calldata) {
      console.error("destructureFunctionCalldata - Calldata of tx is undefined, tx: ", tx);
      throw new Error(
        `destructureFunctionCalldata - Calldata of tx is undefined (calldata: ${tx.calldata})`
      );
    }
    ;

    const callArray = this.getCallArrayFromTx(tx);

    const offset = (callArray.length * callArrayStructLength) + 1;
    const rawFnCalldata = this.getRawFunctionCalldataFromTx(tx, offset);

    const nonce = tx.calldata[tx.calldata.length - 1];

    return {callArray, rawFnCalldata, nonce};
  }

  static getCallArrayFromTx(tx: InvokeFunctionTransaction) {
    let callArrayLength = BigNumber.from(tx.calldata![0]).toNumber();
    let callArray = [];
    // offset i by 1 so that is start at the `call_array` first value, and not at `call_array_len`
    // see the `__execute__` function's args at https://github.com/OpenZeppelin/cairo-contracts/blob/main/src/openzeppelin/account/Account.cairo
    for (let i = 1; i < callArrayLength * callArrayStructLength; i = i + callArrayStructLength) {
      callArray.push({
        to: BigNumber.from(tx.calldata![i]),
        selector: BigNumber.from(tx.calldata![i + 1]),
        dataOffset: BigNumber.from(tx.calldata![i + 2]),
        dataLen: BigNumber.from(tx.calldata![i + 3]),
      });
    }

    return callArray;
  }

  static getRawFunctionCalldataFromTx(tx: InvokeFunctionTransaction, offset: number) {
    const calldataLength = BigNumber.from(tx.calldata![offset]).toNumber();
    let fnCalldata = [];
    for (let j = offset + 1; j <= calldataLength + offset; j++) {
      fnCalldata.push(BigNumber.from(tx.calldata![j]));
    }

    return fnCalldata;
  }
}