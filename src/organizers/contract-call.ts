import {BigNumber} from "ethers";
import {
  OrganizedEventAbi,
  OrganizedFunctionAbi,
  OrganizedStructAbi,
  StarknetArgument,
  OrganizedCalldata,
  OrganizedEvent,
  StarknetContractCode,
  EventArgument
} from "../types/organize-starknet";
import {Abi, Event,FunctionAbi} from "../types/raw-starknet";
import {getFullSelector} from "../helpers/helpers";
import * as console from '../helpers/console';
import {AbiProvider} from '../providers/interfaces';
import {bnToUint256, isUint256, Uint256, uint256ToBN} from "starknet/utils/uint256";
import {toBN, isHex, hexToDecimalString, BigNumberish} from "starknet/utils/number";

export class ContractCallOrganizer {

  constructor(readonly contractAddress: string, readonly blockNumber: number, private readonly abiProvider: AbiProvider, private readonly blockHash?: string, private structs?: OrganizedStructAbi, private functions?: OrganizedFunctionAbi, private events?: OrganizedEventAbi, private constructorFunction?: FunctionAbi) {}

  async initialize() {
    const abi = await this.abiProvider.get(this.contractAddress, this.blockNumber, this.blockHash)

    const {events, functions, structs, constructorFunction} = ContractCallOrganizer.organizeAbi(abi)
    this.structs = structs
    this.functions = functions
    this.events = events
    this.constructorFunction = constructorFunction
  }

  static organizeAbi(abi: Abi | undefined) {
    let functions: OrganizedFunctionAbi = {}
    let events: OrganizedEventAbi = {}
    let structs: OrganizedStructAbi = {}
    let constructorFunction

    if(abi && Array.isArray(abi)) {
      for (const item of abi) {
        if (item.type === "function" || item.type === "l1_handler") {
          const _name = getFullSelector(item.name)
          functions[_name] = item
        }
        if (item.type === "struct") {
          structs[item.name] = {
            size: item.size,
            properties: item.members || []
          }
        }
        if (item.type === "event") {
          const _name = getFullSelector(item.name)
          events[_name] = item
        }
        if (item.type === "constructor") {
          constructorFunction = item
        }
      }
    }

    return {functions, structs, events, constructorFunction} as StarknetContractCode
  }

  organizeFunctionInput(
    functionSelector: string,
    fullCalldataValues: BigNumberish[],
    startIndex?: number
  ) {

    const inputs = this.getFunctionAbiFromSelector(functionSelector).inputs;
    let calldataIndex = startIndex || 0;

    let calldata: OrganizedCalldata = [];
    for (const input of inputs) {
      const {argsValues, endIndex} = this.getArgumentsValuesFromCalldata(
        input.type,
        {fullCalldataValues: fullCalldataValues, startIndex: calldataIndex}
      );
      calldataIndex = endIndex;
      calldata.push({...input, value: argsValues});
    }

    return {subcalldata: calldata, endIndex: calldataIndex};
  }

  organizeFunctionOutput(
    functionSelector: string,
    fullCalldataValues: BigNumberish[],
    startIndex?: number
  ) {

    const outputs = this.getFunctionAbiFromSelector(functionSelector).outputs;
    let calldataIndex = startIndex || 0;

    let calldata: OrganizedCalldata = [];
    for (const output of outputs) {
      const {argsValues, endIndex} = this.getArgumentsValuesFromCalldata(
        output.type,
        {fullCalldataValues: fullCalldataValues, startIndex: calldataIndex},
      );
      calldataIndex = endIndex;
      calldata.push({...output, value: argsValues});
    }

    return {subcalldata: calldata, endIndex: calldataIndex};
  }

  organizeEvent(event: Event) {
    // TODO: make another for loop for each key? (in case many events are triggered) perhaps not stick keys and data into calldata? ex. https://starktx.info/testnet/0x5ac92ccfa0fc4d13806fe9234c53a0d2d7ad8aa8cd8a7901e6b2a9310610f99/
    if (event.keys.length > 1) {
      return this.makeAnonymousEvent(event)
    }

    // TODO: find out how come there's no abi yet can see the event in https://starktx.info/testnet/0x49652ed2ec3857cbc6e5dfd6b39ee6102c0f060f0fe96f55ee5f6d972fa5c09/
    const eventAbi = this.getEventAbiFromKey(event.keys[0])
    console.debug(eventAbi)

    if (!eventAbi) {
      return this.makeAnonymousEvent(event)
    }

    let dataIndex = 0
    let args: EventArgument[] = []
    if(eventAbi.data) {
      for (const arg of eventAbi.data) {
        const {argsValues, endIndex, decimal} = this.getArgumentsValuesFromCalldata(arg.type, {
          fullCalldataValues: event.data,
          startIndex: dataIndex
        })
        dataIndex = endIndex
        const argument = {...arg, value: argsValues, decimal: decimal} as EventArgument
        args.push(argument)
      }
    }

    return {name: eventAbi.name, transmitter_contract: event.from_address, arguments: args} as OrganizedEvent
  }

  getArgumentsValuesFromCalldata(
    type: string,
    calldata: { fullCalldataValues: BigNumberish[], startIndex: number },
  ) {
    const rawType = type.includes("*") ? type.slice(0, type.length - 1) : type;
    if (type === "felt") {
      const {felt, endIndex, decimal} = this.getFeltFromCalldata(calldata.fullCalldataValues, calldata.startIndex);
      return {argsValues: felt, endIndex, decimal: decimal};
    } else if (type === "felt*") {
      const size = this.getArraySizeFromCalldata(calldata);
      const {feltArray, endIndex} = this.getFeltArrayFromCalldata(calldata.fullCalldataValues, calldata.startIndex, size);
      return {argsValues: feltArray, endIndex};
    } else if (!type.includes("*") && type !== "felt") {
      const {structCalldata, endIndex, decimal} = this.getStructFromCalldata(rawType, calldata.fullCalldataValues, calldata.startIndex);
      return {argsValues: structCalldata, endIndex, decimal: decimal};
    } else {
      const size = this.getArraySizeFromCalldata(calldata);
      const {structArray, endIndex} = this.getStructArrayFromCalldata(
        rawType,
        calldata.fullCalldataValues,
        calldata.startIndex,
        size
      );
      return {argsValues: structArray, endIndex};
    }
  }

  makeAnonymousEvent(event: Event) {
    const argument = {
      name: 'anonymous', value: event
    } as EventArgument
    return {name: 'anonymous', transmitter_contract: event.from_address, arguments: [argument]} as OrganizedEvent;
  }

  getArraySizeFromCalldata(calldata: { fullCalldataValues: BigNumberish[], startIndex: number }) {
    try {
      const size = BigNumber.from(calldata.fullCalldataValues[calldata.startIndex - 1]).toNumber();
      return size;
    } catch (error) {
      console.error("ContractAnalyzer::getArraySizeFromCalldata - error", error);
      throw new Error(
        `ContractAnalyzer::getArraySizeFromCalldata - Error trying to get the previous calldata index and converting it into number (value: ${calldata.fullCalldataValues[calldata.startIndex - 1]})`
      );
    }
  }

  getFeltFromCalldata(
    calldata: BigNumberish[],
    startIndex: number
  ) {
    const felt = calldata[startIndex]

    let decimal = undefined
    if(felt !== undefined && felt !== null && isHex(felt as any)) {
      decimal = hexToDecimalString(felt as any)
    }

    return {felt, endIndex: startIndex + 1, decimal: decimal}
  }

  getFeltArrayFromCalldata(
    calldata: BigNumberish[],
    startIndex: number,
    sizeOfArray: number
  ) {
    let feltArray = [];
    let calldataIndex = startIndex;
    for (let j = startIndex; j < startIndex + sizeOfArray; j++) {
      feltArray.push(calldata[j]);
      calldataIndex++;
    }

    return {feltArray, endIndex: calldataIndex};
  }

  getStructFromCalldata(
    type: string,
    calldata: BigNumberish[],
    startIndex: number
  ) {
    const structAbi = this.getStructAbiFromStructType(type);
    let structCalldata: StarknetArgument = {};
    let calldataIndex = startIndex;
    for (const property of structAbi.properties) {
      const {argsValues, endIndex} = this.getArgumentsValuesFromCalldata(
        property.type,
        {fullCalldataValues: calldata, startIndex: calldataIndex},
      );
      structCalldata[property.name] = argsValues;
      calldataIndex = endIndex;
    }

    let decimal = undefined
    if(type === 'Uint256') {
      const b = uint256ToBN(structCalldata as Uint256)
      if(isUint256(b))
        decimal = b.toString()
    }

    return {structCalldata, endIndex: calldataIndex, decimal: decimal};
  }

  getStructArrayFromCalldata(
    type: string,
    calldata: BigNumberish[],
    startIndex: number,
    size: number
  ) {
    const structAbi = this.getStructAbiFromStructType(type);
    let structArray = [];
    let calldataIndex = startIndex;
    for (let j = 0; j < size; j++) {
      let singleStruct: StarknetArgument = {};

      for (const property of structAbi.properties!) {
        const {argsValues, endIndex} = this.getArgumentsValuesFromCalldata(
          property.type,
          {fullCalldataValues: calldata, startIndex: calldataIndex},
        );
        singleStruct[property.name] = argsValues;
        calldataIndex = endIndex;
      }
      structArray.push(singleStruct);
    }

    return {structArray, endIndex: calldataIndex};
  }

  getFunctionAbiFromSelector(functionSelector: string) {
    if (!this.functions) {
      console.warn(`ContractAnalyzer::getFunctionFromSelector - No functions declared for this ContractAnalyzer instance (functions: ${this.functions})`);
      this.functions = {};
    }

    const fn = this.functions![functionSelector];

    if (!fn) {
      console.warn(`ContractAnalyzer::getFunctionFromSelector - No functions matching this selector (selector: ${functionSelector})`);
    }

    return fn;
  }

  getStructAbiFromStructType(type: string) {
    if (!this.structs) {
      console.warn(`ContractAnalyzer::getStructFromStructs - No struct specified for this instance (structs: ${this.structs})`);
      this.structs = {};
    }

    const struct = this.structs![type];

    if (!struct) {
      console.warn(`ContractAnalyzer::getStructFromStructs - No struct specified for this type (structType: ${type})`);
    }

    return struct;
  }

  getEventAbiFromKey(key: string) {
    if (!this.events) {
      console.warn(`ContractAnalyzer::getEventFromKey - No events specified for this instance (events: ${this.events})`);
      this.events = {};
    }

    const event = this.events![key];

    if (!event) {
      console.warn(`ContractAnalyzer::getEventFromKey - No events specified for this key (key: ${key})`);
    }

    return event;
  }

  getConstructorFunctionAbi() {
    if (!this.constructorFunction) {
      console.warn(`ContractAnalyzer::getConstructorFunctionAbi - No constructorFunction declared)`);
    }

    return this.constructorFunction;
  }

}