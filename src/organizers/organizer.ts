import {BigNumber} from "ethers"
import {ContractCallOrganizer} from "./contract-call";
import {FunctionInput, OrganizedFunction, StarknetArgument, FunctionAbi} from "../types/types";
import {AbiProvider} from "../interfaces";

export class Organizer {
  private cOrganizers: Map<string, ContractCallOrganizer>;

  constructor(protected readonly abiProvider: AbiProvider) {
    this.cOrganizers = new Map<string, ContractCallOrganizer>();
  }

  async getContractOrganizer(contractAddress: string, blockNumber: number, blockHash?: string) {
    const key = `${contractAddress}:${blockNumber}:${blockHash}`
    const o = this.cOrganizers.get(key)
    if (o) {
      return o
    }
    const contractCallOrganizer = new ContractCallOrganizer(contractAddress, blockNumber, this.abiProvider, blockHash)
    await contractCallOrganizer.initialize()

    this.cOrganizers.set(key, contractCallOrganizer)
    return contractCallOrganizer
  }

  parseFunction(contractOrganizer: ContractCallOrganizer, calldata?: string[], functionAbi?: FunctionAbi): OrganizedFunction {
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
        } catch(err) {
          console.warn(`cannot parse array length from ${arrayLengthDatum} for contract ${contractOrganizer.contractAddress} in block ${contractOrganizer.blockNumber}`)
        }

        functionInput.name = nextInputAbi.name
        functionInput.type = `${arrayType}[${arrayLength}]`

        if (arrayType == 'felt') {
          const feltArray: string[] = []

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

  parseStruct(calldata: string[], startIndex: number, structType: string, contractOrganizer: ContractCallOrganizer) {
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

  makeAnonymousFunction(calldata?: string[]) {
    let functionInputs: FunctionInput[] = []

    if(calldata) {
      functionInputs = calldata.map((o, i) => {
        return {name: `input_${i}`, value: o} as FunctionInput;
      })
    }
    return {name: 'anonymous', inputs: functionInputs} as OrganizedFunction;
  }

}