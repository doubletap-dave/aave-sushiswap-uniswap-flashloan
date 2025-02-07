// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IPool.sol";

/**
 * @title FlashloanV3
 * @notice Implements flash loan functionality using Aave V3
 * @dev Enhanced version with V3 features, security improvements, and gas optimizations
 */
contract FlashloanV3 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    address private constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 private constant MAX_FLASH_LOAN_AMOUNT = 1_000_000_000e18; // 1 billion tokens
    uint16 private constant REFERRAL_CODE = 0;

    // State variables
    IPool public immutable POOL;
    bool public paused;
    
    // Flash loan state tracking
    struct FlashLoanState {
        uint128 lastAmount;
        uint64 timestamp;
        uint64 nonce;
    }
    FlashLoanState private state;

    // Events
    event FlashLoanExecuted(address indexed token, uint256 amount, uint256 fee);
    event EmergencyPaused(address indexed operator);
    event EmergencyUnpaused(address indexed operator);

    // Errors
    error InvalidToken();
    error InvalidAmount();
    error ContractPaused();
    error InsufficientBalance();
    error AmountTooLarge();
    error TransferFailed();

    // Modifiers
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    constructor(address _pool) Ownable(msg.sender) {
        if (_pool == address(0)) revert InvalidToken();
        POOL = IPool(_pool);
    }

    receive() external payable {}

    /**
     * @notice Execute a simple flash loan for a single asset
     * @param token The address of the token to flash loan
     * @param amount The amount to borrow
     */
    function flashloanSimple(
        address token,
        uint256 amount
    ) external onlyOwner whenNotPaused nonReentrant {
        if (token == address(0)) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();
        if (amount > MAX_FLASH_LOAN_AMOUNT) revert AmountTooLarge();

        // Update state
        state.lastAmount = uint128(amount);
        state.timestamp = uint64(block.timestamp);
        unchecked {
            state.nonce++;
        }

        // Execute flash loan
        POOL.flashLoanSimple(
            address(this),
            token,
            amount,
            "",
            REFERRAL_CODE
        );

        emit FlashLoanExecuted(token, amount, 0);
    }

    /**
     * @notice Execute a flash loan for multiple assets
     * @param tokens Array of token addresses
     * @param amounts Array of amounts to borrow
     */
    function flashloanMultiple(
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external onlyOwner whenNotPaused nonReentrant {
        if (tokens.length == 0 || tokens.length != amounts.length) revert InvalidAmount();

        uint256 length = tokens.length;
        for (uint256 i = 0; i < length;) {
            if (tokens[i] == address(0)) revert InvalidToken();
            if (amounts[i] == 0) revert InvalidAmount();
            if (amounts[i] > MAX_FLASH_LOAN_AMOUNT) revert AmountTooLarge();
            unchecked { ++i; }
        }

        // Prepare modes array (0 = no debt, 1 = stable, 2 = variable)
        uint256[] memory modes = new uint256[](tokens.length);

        // Execute flash loan
        POOL.flashLoan(
            address(this),
            tokens,
            amounts,
            modes,
            address(this),
            "",
            REFERRAL_CODE
        );

        emit FlashLoanExecuted(tokens[0], amounts[0], 0);
    }

    /**
     * @notice Callback function for flash loan execution
     * @dev Implements the logic to be executed after receiving the flash loan
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(POOL), "Callback only from POOL");
        require(initiator == address(this), "Callback only from this contract");

        // Implement your flash loan logic here
        // For example: arbitrage, liquidations, etc.

        // Approve repayment
        uint256 length = assets.length;
        for (uint256 i = 0; i < length;) {
            uint256 amountOwed = amounts[i] + premiums[i];
            IERC20(assets[i]).approve(address(POOL), amountOwed);
            unchecked { ++i; }
        }

        return true;
    }

    /**
     * @notice Withdraw tokens from the contract
     * @param token The token address to withdraw
     */
    function withdrawToken(address token) external onlyOwner nonReentrant {
        if (token == ETH_ADDRESS) {
            uint256 balance = address(this).balance;
            (bool success, ) = msg.sender.call{value: balance}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20 tokenContract = IERC20(token);
            uint256 balance = tokenContract.balanceOf(address(this));
            if (balance > 0) {
                tokenContract.safeTransfer(msg.sender, balance);
            }
        }
    }

    /**
     * @notice Emergency pause function
     */
    function pause() external onlyOwner {
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }
}