"use strict";
// Importing modules
const ethers = require("ethers");
const mongoose = require("mongoose");
const pino = require('pino');
const logger = pino({
  level: process.env.PINO_LOG_LEVEL || 'info',
  formatters: {
    bindings: (bindings) => ({ pid: bindings.pid, host: bindings.hostname }),
    level: (label) => ({ level: label.toUpperCase()}),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});
const util = require("util");
const {
    hasUniswapCommands,
    uniswapFullDecodedInput,
} = require("../uniswap-universal-decoder/universalDecoder");

// MongoDB connection open logic 
const connectMongo = async (collectionName) => {
    // Database Valuabless
    const db = process.env.MONGODB_DB;
    const user = process.env.MONGODB_USER;
    const pass = process.env.MONGODB_PASSWORD;
    const mongodb_host = process.env.MONGODB_HOST;
    const database =`mongodb://${user}:${pass}@${mongodb_host}:27017/${db}`;
    await mongoose.connect(database)
    .then(() => 
        logger.info(`Connection to the MongoDB has successfully opened`)
    )
    .catch(err => 
        logger.error(err, `Connection to the MongoDB has error`)
    );
    return mongoose.connection.collection(collectionName)
}

// MongoDB connection close logic 
const closeMongo =  async () => {
    await mongoose.connection.close()
    .then(() => 
        logger.info(`Connection to the MongoDB has successfully closed`)
    )
    .catch(err => 
        logger.error(err, `Closing the Mongo DB connection has error`)
    );
    return mongoose.connection;
}

// Retriving Block Range Array 
const indexRange = (start, end) => 
     Array.from({ length: end - start + 1 }, (_, index) => start + index);

// Converting Day to block     
const daysToBlock = (currentBlock, daysAgo, l1Orl2) => {
    const blockFor1Day = (l1Orl2==="l1") ? 5760 : 43200;
    const pastBlockNumber = currentBlock - parseInt(blockFor1Day*daysAgo);
    return   (pastBlockNumber < 0) ? (() => {throw new Error('Exceeding genesis block number')})() : pastBlockNumber
}

// block call separation   
const callBlockSeparation = (pastBlockNumber, currentBlockNumber, rangeSize) => {
    const  createRangesArray = (start, end, rangeSize) => 
       (start > end) 
       ? [] 
       : [[start, Math.min(start + rangeSize - 1, end)], ...createRangesArray(Math.min(start + rangeSize - 1, end) + 1, end, rangeSize)];

    (pastBlockNumber > currentBlockNumber) 
       ? (() => {throw new Error('pastBlockNumber is greater than currentBlockNumber')})()
       : createRangesArray (pastBlockNumber, currentBlockNumber, rangeSize);
    return  (currentBlockNumber - pastBlockNumber < rangeSize ) ?  [[pastBlockNumber, currentBlockNumber]] : createRangesArray(pastBlockNumber, currentBlockNumber, rangeSize)
}
// Designated day to Block
const daysToBlockRangeArray = async (args) => {
    const wssUrl = args["wss"];
    const layer = args["layer"];
    const days = args["retrieveDays"]
    const rangeSize = args["blockRangeSize"]
    const provider = new ethers.WebSocketProvider(wssUrl);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = daysToBlock(currentBlock, days, layer);
    const blockRangeArray =  callBlockSeparation(startBlock, currentBlock, rangeSize);
    return blockRangeArray

}
// getBlockHeaderList
const getBlockHeaderList = async (args, startBlock, endBlock) => {
    const wssUrl = args["wss"];
    const provider = new ethers.WebSocketProvider(wssUrl);
    // Getting Block list
    const blockRange = indexRange(startBlock, endBlock);
    // getting range of block hash 
    const blockHeaderList = await Promise.all(blockRange.map(async (i) => {
           const blockHeader = await provider.getBlock(i);
           return blockHeader 
           }));
    return blockHeaderList
}

// Batch Registering Uniswap Universal Router data 
const batchRegister = async (args, blockHeaderList, collection) => {
    const router = args["router"];
    const wssUrl = args["wss"];
    const layer = args["layer"];
    const provider = new ethers.WebSocketProvider(wssUrl); 
    await Promise.all(blockHeaderList.map(async (i) => {
            const blockHeader = i;
            const blockHashList = blockHeader["transactions"];
            // Getting Transactions from Block
            await Promise.all(blockHashList.map(async (j) => { 
                  const txnData = await provider.getTransaction(j);
                  (txnData["to"] === router && hasUniswapCommands(txnData["data"])) 
                    ? (async () => {
                      const decodedData =  uniswapFullDecodedInput(txnData["data"]);
                      const fullData = Object.assign({}, txnData, {"decodedData": decodedData,"blockHeader": blockHeader, "createdAt": new Date()})
                      const jsonData = JSON.stringify(fullData, (_, v) => typeof v === 'bigint' ? v.toString() : v);
                      // Block Receipt Registering
                      const result = await collection.insertOne(JSON.parse(jsonData))
                          .then(result => logger.info({insertedId: result["insertedId"]},`Layer: ${layer}, Block: ${txnData["blockNumber"]}, Hush: ${j}, decoded data inserted`))
                          .catch(err => logger.error(err, `Layer: ${layer}, Block: ${txnData["blockNumber"]}, Hush: ${j}, decoded data insert error!`));
                          
                      })()
                    : null;                   
            }));
    }));
         
};
// Bulk registering logic
const registerBulk = async (args) => {
    const blockRangeArray = await daysToBlockRangeArray(args);
    const layer = args["layer"];
    logger.info({settings: args}, `${layer} Setting arguments`);
    // connecting MongoDb
    const collection = await connectMongo(args["receiptCollectionName"]);
    // Recursive calling with delay
    const sequenceCall =  async (index, fn, delay=args["waitTime"]) => {
        const startBlock =  blockRangeArray[index][0];
        const endBlock = blockRangeArray[index][1];
        fn(index);
        return index > 0 ? await new Promise(() => setTimeout(async ()=> {
            const blockHeaderList = await getBlockHeaderList(args, startBlock, endBlock);
            await batchRegister(args,blockHeaderList, collection);
            await sequenceCall(index -1, fn);
        }, delay)) : index;
    }
    return await sequenceCall((blockRangeArray.length -1) , (index)=> {
        logger.info(`${layer} Remaining Job : ${index}`);
         (index === 0) ? logger.info(`${layer} Batch job successfully ended`)  : null ;
    });
}

module.exports = {
    connectMongo,
    closeMongo,
    indexRange,
    daysToBlock,
    callBlockSeparation,
    daysToBlockRangeArray,
    getBlockHeaderList,
    registerBulk,
    logger
};


