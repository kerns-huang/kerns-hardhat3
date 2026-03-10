import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PROXY_RECORD_PATH = join(process.cwd(), "deployments", "nfg-auction-proxy.json");

/** 从部署时保存的文件读取代理地址，方便升级时使用 */
function loadSavedProxyAddress(): string {
  try {
    if (!existsSync(PROXY_RECORD_PATH)) return "";
    const j = JSON.parse(readFileSync(PROXY_RECORD_PATH, "utf8"));
    return typeof j.proxyAddress === "string" ? j.proxyAddress : "";
  } catch {
    return "";
  }
}

const DEFAULT_PROXY_FROM_FILE = loadSavedProxyAddress();

/**
 * 使用已记录的代理地址进行升级（不依赖 useModule，适合「仅升级」场景）
 * 代理地址来源：1) --parameters 中的 proxyAddress；2) 未传则使用 deployments/nfg-auction-proxy.json 中记录
 * 部署时请先运行 scripts/deploy-nfg-auction-and-save.ts 以写入代理地址
 */
export default buildModule("NfgAuctionUpgradeWithAddressModule", (m) => {
  const proxyAddress = m.getParameter("proxyAddress", DEFAULT_PROXY_FROM_FILE);
  const proxyAsNfg = m.contractAt("NfgAuction", proxyAddress, { id: "NfgAuctionAtProxyForUpgrade" });

  const nftAuction2 = m.contract("NftAuction2");
  m.call(proxyAsNfg, "upgradeToAndCall", [nftAuction2, "0x"]);

  const nftAuction2Proxy = m.contractAt("NftAuction2", proxyAddress, { id: "NftAuction2AtProxy" });

  return { nftAuction2, nftAuction2Proxy };
});
