"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const typeorm_1 = require("typeorm");
const starknet_1 = require("starknet");
const console = __importStar(require("./helpers/console"));
const helpers_1 = require("./helpers/helpers");
const processors_1 = require("./processors");
const pathfinder_1 = require("./providers/api/pathfinder");
const feeder_1 = require("./providers/api/feeder");
function main() {
    (async () => {
        const connectionOptions = await (0, typeorm_1.getConnectionOptions)();
        const ds = await (0, typeorm_1.createConnection)(connectionOptions);
        const optionsInfo = connectionOptions;
        delete optionsInfo.password;
        console.info(optionsInfo);
        await iterateBlocks(ds);
    })();
}
main();
async function iterateBlocks(ds) {
    const startBlock = Number.parseInt(process.env.STARKNET_ARCHIVE_START_BLOCK || '0');
    const finishBlock = Number.parseInt(process.env.STARKNET_ARCHIVE_FINISH_BLOCK || '0');
    const retryWait = Number.parseInt(process.env.STARKNET_ARCHIVE_RETRY_WAIT || '1000');
    const cmd = process.env.STARKNET_ARCHIVE_CMD || 'organize';
    const feederUrl = process.env.STARKNET_ARCHIVE_FEEDER_URL || 'https://alpha4.starknet.io';
    const pathfinderUrl = process.env.STARKNET_ARCHIVE_PATHFINDER_URL || 'https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a';
    const feederApiProvider = new feeder_1.FeederApiProvider(/*defaultProvider*/ new starknet_1.Provider({ baseUrl: feederUrl }));
    const pathfinderApiProvider = new pathfinder_1.PathfinderApiProvider(pathfinderUrl);
    const blockApiProvider = feederApiProvider; // TODO revisit this as pathfinder may start providing full blocks with calldata
    const contractApiProvider = pathfinderApiProvider;
    const classApiProvider = feederApiProvider; // TODO revisit this as pathfinder may start providing class abi like the feeder
    const viewApiProvider = pathfinderApiProvider;
    let p;
    if (cmd == 'organize')
        p = new processors_1.OrganizeBlockProcessor(blockApiProvider, contractApiProvider, classApiProvider, viewApiProvider, ds);
    else if (cmd == 'archive_block')
        p = new processors_1.ArchiveBlockProcessor(blockApiProvider, ds);
    else if (cmd == 'archive_abi')
        p = new processors_1.ArchiveAbiProcessor(contractApiProvider, ds);
    else {
        console.error(`unknown cmd ${cmd}`);
        return;
    }
    console.info(`processing blocks ${startBlock} to ${finishBlock} with ${cmd} from ${feederUrl} and ${pathfinderUrl}`);
    for (let blockNumber = startBlock; blockNumber <= finishBlock;) {
        console.info(`processing ${blockNumber}`);
        try {
            if (await p.process(blockNumber)) {
                blockNumber++;
            }
            else {
                await (0, helpers_1.sleep)(retryWait);
            }
        }
        catch (err) {
            console.error(`cannot process ${blockNumber}, exiting for ${err}`, err);
            return;
        }
    } // thru blockNumber range
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHlCQUFzQjtBQUN0QixxQ0FBMEU7QUFDMUUsdUNBQWtEO0FBQ2xELDJEQUE0QztBQUM1QywrQ0FBdUM7QUFDdkMsNkNBQWdIO0FBQ2hILDJEQUFtRTtBQUNuRSxtREFBMkQ7QUFFM0QsU0FBUyxJQUFJO0lBQ1gsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNWLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxJQUFBLDhCQUFvQixHQUFFLENBQUE7UUFDdEQsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFBLDBCQUFnQixFQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDcEQsTUFBTSxXQUFXLEdBQUcsaUJBQXdCLENBQUE7UUFDNUMsT0FBTyxXQUFXLENBQUMsUUFBUSxDQUFBO1FBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDekIsTUFBTSxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDekIsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtBQUNOLENBQUM7QUFFRCxJQUFJLEVBQUUsQ0FBQTtBQUVOLEtBQUssVUFBVSxhQUFhLENBQUMsRUFBYztJQUV6QyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLElBQUksR0FBRyxDQUFDLENBQUE7SUFDbkYsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixJQUFJLEdBQUcsQ0FBQyxDQUFBO0lBQ3JGLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsSUFBSSxNQUFNLENBQUMsQ0FBQTtJQUNwRixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixJQUFJLFVBQVUsQ0FBQTtJQUMxRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixJQUFJLDRCQUE0QixDQUFBO0lBQ3pGLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLElBQUksb0VBQW9FLENBQUE7SUFFekksTUFBTSxpQkFBaUIsR0FBRyxJQUFJLDBCQUFpQixDQUFDLG1CQUFtQixDQUFDLElBQUksbUJBQVEsQ0FBQyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUE7SUFDeEcsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGtDQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBRXRFLE1BQU0sZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUEsQ0FBQyxnRkFBZ0Y7SUFDM0gsTUFBTSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQTtJQUNqRCxNQUFNLGdCQUFnQixHQUFJLGlCQUFpQixDQUFBLENBQUMsZ0ZBQWdGO0lBQzVILE1BQU0sZUFBZSxHQUFJLHFCQUFxQixDQUFBO0lBRTlDLElBQUksQ0FBaUIsQ0FBQTtJQUVyQixJQUFHLEdBQUcsSUFBSSxVQUFVO1FBQ2xCLENBQUMsR0FBRyxJQUFJLG1DQUFzQixDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQTtTQUN6RyxJQUFHLEdBQUcsSUFBSSxlQUFlO1FBQzVCLENBQUMsR0FBRyxJQUFJLGtDQUFxQixDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1NBQ2hELElBQUcsR0FBRyxJQUFJLGFBQWE7UUFDMUIsQ0FBQyxHQUFHLElBQUksZ0NBQW1CLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLENBQUE7U0FDakQ7UUFDSCxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUNuQyxPQUFNO0tBQ1A7SUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLHFCQUFxQixVQUFVLE9BQU8sV0FBVyxTQUFTLEdBQUcsU0FBUyxTQUFTLFFBQVEsYUFBYSxFQUFFLENBQUMsQ0FBQTtJQUVwSCxLQUFLLElBQUksV0FBVyxHQUFHLFVBQVUsRUFBRSxXQUFXLElBQUksV0FBVyxHQUFJO1FBQy9ELE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBRXpDLElBQUk7WUFDRixJQUFJLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDaEMsV0FBVyxFQUFFLENBQUE7YUFDZDtpQkFBTTtnQkFDTCxNQUFNLElBQUEsZUFBSyxFQUFDLFNBQVMsQ0FBQyxDQUFBO2FBQ3ZCO1NBQ0Y7UUFBQyxPQUFNLEdBQUcsRUFBRTtZQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLFdBQVcsaUJBQWlCLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZFLE9BQU07U0FDUDtLQUNGLENBQUMseUJBQXlCO0FBRTdCLENBQUMifQ==