import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("NfgAuction", function () {
  let auction: Awaited<ReturnType<typeof ethers.deployContract>>;
  let nft: Awaited<ReturnType<typeof ethers.deployContract>>;
  let priceFeed: Awaited<ReturnType<typeof ethers.deployContract>>;
  let admin: { address: string };
  let seller: { address: string };
  let bidder1: { address: string };
  let bidder2: { address: string };

  const TOKEN_ID = 1n;
  const STARTING_PRICE = ethers.parseEther("0.001");
  const DURATION = 86400; // 1 day
  const ETH_USD_PRICE = 2000e8; // $2000 per ETH, 8 decimals

  before(async function () {
    [admin, seller, bidder1, bidder2] = await ethers.getSigners();

    auction = await ethers.deployContract("NfgAuction");
    await auction.initialize();

    nft = await ethers.deployContract("MockNFT", ["Test NFT", "TNFT"]);
    await nft.mint(seller.address, TOKEN_ID);

    priceFeed = await ethers.deployContract("MockPriceFeed", [ETH_USD_PRICE]);
    await auction.setPriceFeed(ethers.ZeroAddress, await priceFeed.getAddress());
  });

  describe("initialize", function () {
    it("should run once and set admin", async function () {
      const auction2 = await ethers.deployContract("NfgAuction");
      await auction2.initialize();
      await expect(auction2.initialize()).to.be.reverted;
    });
  });

  describe("setPriceFeed", function () {
    it("should allow admin to set price feed", async function () {
      const feedAddr = await priceFeed.getAddress();
      await auction.setPriceFeed(ethers.ZeroAddress, feedAddr);
    });

    it("should revert when non-admin sets price feed", async function () {
      await expect(
        auction.connect(bidder1).setPriceFeed(ethers.ZeroAddress, await priceFeed.getAddress())
      ).to.be.revertedWith("Only admin");
    });
  });

  describe("getChainlinkTokenPrice", function () {
    it("should return price when feed is set", async function () {
      const price = await auction.getChainlinkTokenPrice(ethers.ZeroAddress);
      expect(price).to.equal(ETH_USD_PRICE);
    });

    it("should revert PriceFeedNotSet when feed not set", async function () {
      const unknownToken = "0x0000000000000000000000000000000000000001";
      await expect(auction.getChainlinkTokenPrice(unknownToken)).to.be.revertedWithCustomError(
        auction,
        "PriceFeedNotSet"
      );
    });
  });

  describe("createAuction", function () {
    it("should revert NotOwner when caller is not NFT owner", async function () {
      const nftAddr = await nft.getAddress();
      await expect(
        auction.connect(bidder1).createAuction(nftAddr, TOKEN_ID, STARTING_PRICE, DURATION)
      ).to.be.revertedWithCustomError(auction, "NotOwner");
    });

    it("should revert when startingPrice is 0", async function () {
      const nftAddr = await nft.getAddress();
      await expect(
        auction.connect(seller).createAuction(nftAddr, TOKEN_ID, 0n, DURATION)
      ).to.be.revertedWith("Starting price must be greater than 0");
    });

    it("should revert when duration is 0", async function () {
      const nftAddr = await nft.getAddress();
      await expect(
        auction.connect(seller).createAuction(nftAddr, TOKEN_ID, STARTING_PRICE, 0)
      ).to.be.revertedWith("Duration must be greater than 0");
    });

    it("should create auction and transfer NFT to contract", async function () {
      const nftAddr = await nft.getAddress();
      await nft.connect(seller).approve(await auction.getAddress(), TOKEN_ID);
      await auction.connect(seller).createAuction(nftAddr, TOKEN_ID, STARTING_PRICE, DURATION);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(await auction.getAddress());
    });
  });

  describe("bid", function () {
    it("should revert when bid amount below starting price", async function () {
      const lowBid = ethers.parseEther("0.0005");
      await expect(
        auction.connect(bidder2).bid(1n, lowBid, ethers.ZeroAddress, { value: lowBid })
      ).to.be.revertedWith("not enough bid amount");
    });

    it("should accept first ETH bid", async function () {
      const bidAmount = ethers.parseEther("0.01");
      await auction.connect(bidder1).bid(1n, bidAmount, ethers.ZeroAddress, { value: bidAmount });
    });

    it("should revert when second bid not higher than first in USD", async function () {
      const sameBid = ethers.parseEther("0.01");
      await expect(
        auction.connect(bidder2).bid(1n, sameBid, ethers.ZeroAddress, { value: sameBid })
      ).to.be.revertedWith("not enough bid amount");
    });

    it("should refund previous bidder and accept higher bid", async function () {
      const prevBalance = await ethers.provider.getBalance(bidder1.address);
      const bidAmount = ethers.parseEther("0.02");
      await auction.connect(bidder2).bid(1n, bidAmount, ethers.ZeroAddress, { value: bidAmount });
      const newBalance = await ethers.provider.getBalance(bidder1.address);
      expect(newBalance).to.be.gt(prevBalance);
    });
  });

  describe("endAuction", function () {
    it("should revert when no bidder", async function () {
      const nftAddr = await nft.getAddress();
      const token2 = 2n;
      await nft.mint(seller.address, token2);
      await nft.connect(seller).approve(await auction.getAddress(), token2);
      await auction.connect(seller).createAuction(nftAddr, token2, STARTING_PRICE, DURATION);
      await expect(auction.endAuction(2n)).to.be.revertedWith("no highest bidder");
    });

    it("should transfer NFT to winner and ETH to seller after end", async function () {
      const auctionId = 1n;
      const sellerBefore = await ethers.provider.getBalance(seller.address);
      const winnerBefore = await ethers.provider.getBalance(bidder2.address);
      await auction.endAuction(auctionId);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(bidder2.address);
      const sellerAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerAfter).to.be.gt(sellerBefore);
    });

    it("should revert when endAuction called twice", async function () {
      await expect(auction.endAuction(1n)).to.be.revertedWith("auction already ended");
    });
  });
});
