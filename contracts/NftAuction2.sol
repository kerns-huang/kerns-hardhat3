// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./NfgAuction.sol";

/// NFT 拍卖合约 V2，继承自 NfgAuction
contract NftAuction2 is NfgAuction {
   function tt() public pure returns (string memory) {
     return "this is  nft auction v2";
   }
}
