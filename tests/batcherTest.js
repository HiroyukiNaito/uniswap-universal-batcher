const chai = require("chai");
const util = require("util");
const fs = require("fs");
const path = require("path");
const expect = chai.expect;
const {
  connectMongo,
  closeMongo,
  indexRange,
  daysToBlock,
  callBlockSeparation,
  daysToBlockRangeArray,
  getBlockHeaderList,
} = require("../batcher");

// Universal Router Contract Address
const l1Router = process.env.UNIVERSAL_ROUTER_ADDRESS;
const l2Router = process.env.L2_UNIVERSAL_ROUTER_ADDRESS;
// RPC Web Socket URL
const l1WssUrl = process.env.RPC_WEBSOCKET_URL;
const l2WssUrl = process.env.L2_RPC_WEBSOCKET_URL;

// Database Valuables
const db = process.env.MONGODB_DB;
const user = process.env.MONGODB_USER;
const pass = process.env.MONGODB_PASSWORD;
const mongodb_host = process.env.MONGODB_HOST;


describe("Connecting mongo DB", () => {
  it("should connect to Mongo DB", async () => {
    expect(await connectMongo('l1_transaction')).to.nested.include({'conn._hasOpened': true});
 });
  it("should close to Mongo DB", async () => {
     expect(await closeMongo()).to.deep.include({"_closeCalled": true});
  });
});

describe("Testing Batch component", () => {
    it("should have a range", () => {
      expect(indexRange(2,8)).to.eql([2,3,4,5,6,7,8]);
    });
    it("should return a past block number from designated day range", () => {
      expect(daysToBlock(17000, 2, "l1")).to.eql(5480);
      expect(daysToBlock(17000, 0.33, "l1")).to.eql(15100);
      expect(daysToBlock(17000, 0.277, "l1")).to.eql(15405);
      expect(daysToBlock(107000, 2, "l2")).to.eql(20600);
      expect(daysToBlock(107000, 0.33, "l2")).to.eql(92744);
    });
    it("shoud receive error about exceeding genesis block", () => {
      expect(() => daysToBlock(700, 2, "l1")).to.throw(Error, 'Exceeding genesis block number');
    });
    it("shoud receive a calling block range array", () => {
        expect(callBlockSeparation(15000, 20000, 1000)).to.eql([[15000,15999],[16000,16999],[17000,17999],[18000,18999],[19000,19999],[20000,20000]]);
        expect(callBlockSeparation(3333, 5000, 1000)).to.eql([[3333,4332],[4333,5000]]);
        expect(callBlockSeparation(3333, 4000, 1000)).to.eql([[3333,4000]]);
     });
    
     it("shoud receive pastBlockNumber is greater than currentBlockNumber error", () => {
        expect(() => callBlockSeparation(4000, 3000)).to.throw(Error, 'pastBlockNumber is greater than currentBlockNumber');
     });
     
     it("it should current block returns 58 ranges array", async () => {

        const args = {
            "receiptCollectionName": "l1_transaction",
            "blockRangeSize" : 100,
            "layer": "l1",
            "retrieveDays": 1,
            "router" : process.env.UNIVERSAL_ROUTER_ADDRESS,
            "wss":  process.env.RPC_WEBSOCKET_URL
         };
         const result = await daysToBlockRangeArray(args);
         expect(result.length).to.eql(58);
     }).timeout(10000);
     it("it should receive a block header list", async () => {
        const args = {
            "receiptCollectionName": "l1_transaction",
            "blockRangeSize" : 10,
            "layer": "l1",
            "retrieveDays": 1,
            "router" : process.env.UNIVERSAL_ROUTER_ADDRESS,
            "wss":  process.env.RPC_WEBSOCKET_URL
         };
         const result = await getBlockHeaderList(args, 18390166,18390170);
         // console.log(JSON.stringify(result[1], null, 4));
         expect(result.length).to.eql(5);
     }).timeout(10000);

});

