//升级代理合约地址
const { upgrades, ethers } = require("hardhat");

const fs = require("fs");
const path = require("path");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const NftAuction2 = await ethers.getContractFactory("NftAuction2");
  //为已经部署的代理合约升级实现合约，地址是部署时候的代理合约
  const nftAuction2Proxy =  await upgrades.upgradeProxy("0x5FbDB2315678afecb367f032d93F642f64180aa3", NftAuction2);
  await nftAuction2Proxy.waitForDeployment();
  const proxyAddress = await nftAuction2Proxy.getAddress();
  // 正常来说代理合约的地址和当前合约一致
  console.log("代理合约地址:", proxyAddress);
}