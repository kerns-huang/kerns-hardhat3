// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";

/// @notice 测试用 Chainlink 价格预言机，返回固定价格（8 位小数）
contract MockPriceFeed is AggregatorV3Interface {
    int256 private _answer;
    uint8 private _decimals = 8;

    constructor(int256 answer_) {
        _answer = answer_;
    }

    function setAnswer(int256 answer_) external {
        _answer = answer_;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external pure override returns (string memory) {
        return "Mock USD Price";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80)
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (1, _answer, block.timestamp, block.timestamp, 1);
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (1, _answer, block.timestamp, block.timestamp, 1);
    }
}
