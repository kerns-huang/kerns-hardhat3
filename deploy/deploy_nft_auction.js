const { deployments,upgrades,ethers } = require("hardhat");

const fs = require("fs");
const path = require("path");
const { isForInitializer } = require("typescript");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const NftAuction = await ethers.getContractFactory("NftAuction");
  // 部署代理合约
  const nftAuctionProxy = await upgrades.deployProxy(NftAuction, 
     [],
    {initializer: "initialize",}
  );
  // 等待代理合约部署完成
  await nftAuctionProxy.deployed();
  // 获取代理合约地址
  const proxyAddress = await nftAuctionProxy.getAddress();
  console.log("代理合约地址:", proxyAddress);
}