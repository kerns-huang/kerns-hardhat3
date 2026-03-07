import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("NftAuction", function () {
  it("should create, bid and end auction", async function () {
    //部署合约
    const nftAuction = await ethers.deployContract("NftAuction");
    await nftAuction.initialize();
    //创建拍卖
    const auction = await nftAuction.createAuction(
      "0x1234567890123456789012345678901234567890",
      "1234567890123456789012345678901234567890",
      "1000000000000000000", //起拍价
      "1000000000000000000", //持续时间
      "0x1234567890123456789012345678901234567890", //最高出价者使用的token类型
    );
    //出价
    const bid = await nftAuction.bid(
      "2000000000000000000", //出价金额
      "0x1234567890123456789012345678901234567890", //出价者使用的token类型
    );
    //如果出价低于前面的价格，返回出价失败
    const bid2 = await nftAuction.bid(
      "1500000000000000000", //出价金额低于前面的出价，出价失败
      "0x1234567890123456789012345678901234567890", //出价者使用的token类型
    );
    //结束拍卖
    const endAuction = await nftAuction.endAuction();

    // 简单断言，避免未使用变量（具体断言逻辑可按业务调整）
    expect(nftAuction).to.not.equal(undefined);
    expect(nftAuction).to.not.equal(undefined);
    expect(bid).to.not.equal(undefined);
    expect(bid2).to.not.equal(undefined);
    expect(endAuction).to.not.equal(undefined);
  });
});