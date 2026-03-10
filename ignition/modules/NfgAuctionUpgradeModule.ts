import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import NfgAuctionModule from "./NfgAuctionModule.js";

/**
 * 将代理升级为 NftAuction2 实现（等价于原 upgrade_nfg_auction.js）
 * 依赖 NfgAuctionModule：先部署代理再升级，保证在同一网络中调用通过代理执行，避免 UUPSUnauthorizedCallContext。
 * 部署到持久网络时先运行 NfgAuctionModule 得到代理地址，再本模块会复用该部署结果。
 */
export default buildModule("NfgAuctionUpgradeModule", (m) => {
  const { proxy } = m.useModule(NfgAuctionModule);
  const proxyAsNfg = m.contractAt("NfgAuction", proxy, { id: "NfgAuctionAtProxyForUpgrade" });

  const nftAuction2 = m.contract("NftAuction2");
  m.call(proxyAsNfg, "upgradeToAndCall", [nftAuction2, "0x"]);

  const nftAuction2Proxy = m.contractAt("NftAuction2", proxy, { id: "NftAuction2AtProxy" });

  return { proxy, nftAuction2, nftAuction2Proxy };
});
