// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

//nft 拍卖合约
contract NfgAuction is Initializable, UUPSUpgradeable {
    error NotOwner();
    error PriceFeedNotSet();
    error InvalidPrice();

    // 下一场拍卖id
    uint256 private nextAuctionId;

    address private admin;

    // 代币 => Chainlink 价格预言机地址。address(0) 表示 ETH/USD
    mapping(address => address) private priceFeeds;

    // 所有的拍卖信息
    mapping(uint256 => Auction) private auctions;
    // 拍卖信息
    struct Auction {
        address nft; // nft 合约地址
        uint256 tokenId; // nft tokenId
        address payable seller;//卖家
        uint256 startingPrice; // 起拍价
        uint256 startTime; // 拍卖开始时间
        uint256 duration; // 持续时间
        bool ended; //是否结束
        address highestBidder; //最高出价者
        uint256 highestBidTokenCount;            //最高出价对应的token数据
        address highestBidToken;      // 最高出价者使用的token类型
        uint256 highestBidUsd; // 最高出价对应的美元金额
        
    }

    // 合约初始化
    function initialize() public initializer {
        nextAuctionId= 1;
        admin = msg.sender;
    }

    /// @notice 设置代币对应的 Chainlink 价格预言机。token 为 address(0) 表示 ETH/USD
    function setPriceFeed(address token, address feed) external {
        require(msg.sender == admin, "Only admin");
        priceFeeds[token] = feed;
    }

    /** 
    * @notice 创建拍卖
    * @param nft nft 合约地址
    * @param tokenId nft tokenId
    * @param startingPrice 起拍价
    * @param duration 持续时间
    */
    function createAuction(address nft, uint256 tokenId, uint256 startingPrice, uint256 duration) public {
      //判断nft是否拥有者
      if(IERC721(nft).ownerOf(tokenId) != msg.sender) {
        revert NotOwner();
      }
      require(startingPrice > 0, "Starting price must be greater than 0");
      require(duration > 0, "Duration must be greater than 0");
      //把nft转移到拍卖合约地址
      IERC721(nft).transferFrom(msg.sender, address(this), tokenId);
      //生成拍卖信息
      auctions[nextAuctionId] = Auction({
        nft: nft,
        tokenId: tokenId,
        seller: payable(msg.sender),//这个改成nfg拥有者地址
        startTime: block.timestamp,
        startingPrice: startingPrice,//售卖者开始的定价，单位是美元
        duration: duration,
        ended: false,
        highestBidder: address(0), //最高出价
        highestBidTokenCount: 0,  // 最高出价对应的token数据
        highestBidToken: address(0), //最高出价者使用的token类型
        highestBidUsd: 0  // 最高出价对应的美元金额
      });
      nextAuctionId++;
      // 返回当前拍卖的

    }
    /** 
    * @notice 出价
    * @param auctionId 拍卖id
    * @param amount 出价金额
    * @param token 出价者使用的token类型
    */
    function bid(uint256 auctionId, uint256 amount, address token) public payable {
        // 判断拍卖是否存在
        Auction storage auction = auctions[auctionId];
        require(!auction.ended && block.timestamp < auction.startTime + auction.duration, "auction already ended");
        require(amount > auction.startingPrice, "not enough bid amount");
        uint256 _amount = amount;
        if(token == address(0)){
            _amount = msg.value;
        }
        uint256 tokenPrice = getChainlinkTokenPrice(token);
        uint256 payUsd = _amount * tokenPrice;
        require(payUsd > auction.highestBidUsd, "not enough bid amount");
        if(auction.highestBidder != address(0)){
            //退回原先的价格给原先的出价者
            // TODO 是否需要收取一定量的手续费，不然合约在做亏本买卖。
            if (auction.highestBidToken == address(0)) {
                (bool ok,) = payable(auction.highestBidder).call{value: auction.highestBidTokenCount}("");
                require(ok, "ETH transfer failed");
            } else {
                IERC20(auction.highestBidToken).transferFrom(address(this), auction.highestBidder, auction.highestBidTokenCount);
            }
        }
        auction.highestBidder = msg.sender;
        auction.highestBidToken = token;
        auction.highestBidUsd = payUsd;
        auction.highestBidTokenCount = _amount;
    }
    /** 
    * @notice 结束拍卖
    */
    function endAuction(uint256 auctionId) public {
        Auction storage auction = auctions[auctionId];
        require(!auction.ended, "auction already ended");
        require(auction.highestBidder != address(0), "no highest bidder");
        require(auction.highestBidUsd > 0, "no highest bid usd");
        require(auction.highestBidTokenCount > 0, "no highest bid token count");
        auction.ended = true;
        (bool ok,) = payable(auction.seller).call{value: auction.highestBidTokenCount}("");
        require(ok, "ETH transfer failed");
        IERC721(auction.nft).transferFrom(address(this), auction.highestBidder, auction.tokenId);
    }

    // UUPS 升级授权（仅占位，可按需改为管理员校验等）
    function _authorizeUpgrade(address) internal view override {}

    /// @notice 通过 Chainlink 预言机获取 token 对 USD 的价格（通常为 8 位小数）
    function getChainlinkTokenPrice(address token) public view returns (uint256) {
        address feed = priceFeeds[token];
        if (feed == address(0)) revert PriceFeedNotSet();
        AggregatorV3Interface agg = AggregatorV3Interface(feed);
        (
            /* uint80 roundId */,
            int256 answer,
            /* uint256 startedAt */,
            /* uint256 updatedAt */,
            /* uint80 answeredInRound */
        ) = agg.latestRoundData();
        if (answer <= 0) revert InvalidPrice();
        return uint256(answer);
    }
}