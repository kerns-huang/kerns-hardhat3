import hre from "hardhat";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import NfgAuctionModule from "../ignition/modules/NfgAuctionModule.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROXY_RECORD_PATH = join(__dirname, "..", "deployments", "nfg-auction-proxy.json");

async function main() {
  const connection = await hre.network.connect();
  const { proxy } = await connection.ignition.deploy(NfgAuctionModule);

  const proxyAddress =
    typeof proxy.getAddress === "function"
      ? await proxy.getAddress()
      : String((proxy as { address?: string }).address ?? proxy);
  let chainIdNumber = 0;
  const ethers = (connection as { ethers?: { provider?: { getNetwork: () => Promise<{ chainId?: bigint }> } } }).ethers;
  if (ethers?.provider) {
    const net = await ethers.provider.getNetwork();
    chainIdNumber = Number(net?.chainId ?? 0);
  }

  const record = {
    proxyAddress,
    chainId: chainIdNumber,
    updatedAt: new Date().toISOString(),
  };

  const dir = dirname(PROXY_RECORD_PATH);
  mkdirSync(dir, { recursive: true });
  writeFileSync(PROXY_RECORD_PATH, JSON.stringify(record, null, 2), "utf8");

  console.log("NfgAuction proxy deployed:", proxyAddress);
  console.log("Proxy address saved to:", PROXY_RECORD_PATH);
  console.log("Use this address for upgrade (e.g. --parameters with proxyAddress or run NfgAuctionUpgradeWithAddressModule).");
}

main().catch(console.error);
