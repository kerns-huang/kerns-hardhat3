# 首次部署代理（等价于原 deploy_nft_auction）
npx hardhat ignition deploy ignition/modules/NfgAuctionModule.ts
# 指定网络
npx hardhat ignition deploy ignition/modules/NfgAuctionModule.ts --network sepolia
# 升级已有代理（等价于原 upgrade_nfg_auction，使用默认代理地址）
npx hardhat ignition deploy ignition/modules/NfgAuctionUpgradeModule.ts
# 升级指定代理地址：用参数文件
echo '{"NfgAuctionUpgradeModule":{"proxyAddress":"0x你的代理地址"}}' > params.json
npx hardhat ignition deploy ignition/modules/NfgAuctionUpgradeModule.ts --parameters params.json --network sepolia