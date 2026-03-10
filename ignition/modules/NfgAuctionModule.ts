import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * 部署 NFT 拍卖可升级代理（等价于原 deploy_nft_auction.js）
 * 部署 NfgAuction 实现合约 + ERC1967Proxy，并调用 initialize 初始化。
 * 若需把代理地址记录下来供后续升级使用，请运行脚本：scripts/deploy-nfg-auction-and-save.ts
 */
export default buildModule("NfgAuctionModule", (m) => {
  const nfgAuction = m.contract("NfgAuction");
  const initData = m.encodeFunctionCall(nfgAuction, "initialize", []);
  const proxy = m.contract("ERC1967Proxy", [nfgAuction, initData]);
  const nfgAuctionProxy = m.contractAt("NfgAuction", proxy, {
    id: "NfgAuctionAtProxy",
  });

  return { proxy, nfgAuction, nfgAuctionProxy };
});
