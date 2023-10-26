const {
    registerBulk
} = require("./batcher");
const pino = require('pino');
const logger = pino({});

// setting arguments
const args = {
    "receiptCollectionName": "l1_transactions",
    "layer": "l1",
    "blockRangeSize" : parseInt(process.env.BLOCK_RANGE_SIZE),
    "retrieveDays": parseFloat(process.env.RETRIEVE_DAYS),
    "waitTime" : parseInt(process.env.WAIT_TIME),
    "router" : process.env.UNIVERSAL_ROUTER_ADDRESS,
    "wss":  process.env.RPC_WEBSOCKET_URL
} 
const args2 = {
    "receiptCollectionName": "l2_transactions",
    "layer": "l2",
    "blockRangeSize" : parseInt(process.env.L2_BLOCK_RANGE_SIZE),
    "retrieveDays": parseFloat(process.env.L2_RETRIEVE_DAYS),
    "waitTime" : parseInt(process.env.L2_WAIT_TIME),
    "router" :  process.env.L2_UNIVERSAL_ROUTER_ADDRESS,
    "wss": process.env.L2_RPC_WEBSOCKET_URL
}

process.env.RPC_WEBSOCKET_URL ? registerBulk(args) : logger.info("No RPC settings! So, L1 Batch Skipping");
process.env.L2_RPC_WEBSOCKET_URL ? registerBulk(args2) : logger.info("No L2RPC settings! So, L2 Batch Skipping");
