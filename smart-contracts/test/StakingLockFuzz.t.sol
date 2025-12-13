// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/staking.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 Token (Same as before)
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000000 * 10**18); // Large supply for fuzzing
    }
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function decimal() public pure returns (uint8) { return 6; } // Helper for tests
    function decimals() public pure override returns (uint8) { return 6; }
}

// Mock Router (Simplified for Fuzzing)
contract MockRouterFuzz {
    MockERC20 public usdt;
    MockERC20 public yourToken;

    constructor(address _usdt, address _yourToken) {
        usdt = MockERC20(_usdt);
        yourToken = MockERC20(_yourToken);
    }

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata,
        address to,
        uint
    ) external {
        usdt.transferFrom(msg.sender, address(this), amountIn);
        uint256 amountOut = amountIn * 10**12; 
        yourToken.transfer(to, amountOut);
    }
}

contract StakingLockFuzzTest is Test {
    StakingLock public staking;
    MockERC20 public usdt;
    MockERC20 public yourToken;
    MockRouterFuzz public router;

    address public owner = address(this);
    address public feeCollector = address(0x99);

    uint256 constant ONE_YEAR = 365 days;

    function setUp() public {
        usdt = new MockERC20("USDT", "USDT");
        yourToken = new MockERC20("YourToken", "YT");
        router = new MockRouterFuzz(address(usdt), address(yourToken));
        yourToken.transfer(address(router), 100000000 * 10**18);

        StakingLock.Tier memory starter = StakingLock.Tier({
            minUsd: 50 * 10**6, feeBps: 1000, minLock: uint32(ONE_YEAR), maxLock: uint32(ONE_YEAR * 5), referralReq: 10, active: true
        });
        StakingLock.Tier memory pro = StakingLock.Tier({
            minUsd: 100 * 10**6, feeBps: 1000, minLock: uint32(ONE_YEAR), maxLock: uint32(ONE_YEAR * 5), referralReq: 5, active: true
        });
        StakingLock.Tier memory elite = StakingLock.Tier({
            minUsd: 1000 * 10**6, feeBps: 1000, minLock: uint32(ONE_YEAR), maxLock: uint32(ONE_YEAR * 5), referralReq: 0, active: true
        });

        staking = new StakingLock(
            address(yourToken),
            address(usdt),
            address(router),
            feeCollector,
            starter,
            pro,
            elite
        );
    }

    // --- FUZZ TESTS ---

    // Fuzz test: Any amount >= $50 should successfully stake
    function testFuzz_StakeAnyValidAmount(uint256 amount) public {
        // Bound inputs to reasonable ranges that token contract can handle
        // Min: $50, Max: 100M tokens (to avoid supply issues in test env)
        amount = bound(amount, 50 * 10**6, 100_000_000 * 10**6);

        address user = address(0x100);
        // Mint tokens first to ensure sender has enough
        usdt.mint(user, amount); 

        vm.startPrank(user);
        usdt.approve(address(staking), amount);
        
        staking.buyAndLock(
            amount,
            0,
            ONE_YEAR, // Fixed duration for this test
            0,        // Starter package
            address(0),
            block.timestamp + 1000
        );
        vm.stopPrank();

        StakingLock.Lock[] memory locks = staking.getLocks(user);
        assertEq(locks.length, 1);
        // Verify fees (10%) - Replicate contract logic exactly to avoid rounding diffs
        // Contract: fee = (amount * 1000) / 10000 
        //           swap = amount - fee
        uint256 fee = (amount * 1000) / 10000;
        uint256 expectedSwap = amount - fee;
        uint256 expectedToken = expectedSwap * 10**12; 
        
        assertEq(locks[0].amountToken, expectedToken);
    }

    // Fuzz test: Any valid duration (1-5 years)
    function testFuzz_StakeAnyValidDuration(uint256 yearsCount) public {
        yearsCount = bound(yearsCount, 1, 5); // 1 to 5 years
        uint256 duration = yearsCount * ONE_YEAR;
        uint256 amount = 100 * 10**6;

        address user = address(0x200);
        usdt.transfer(user, amount);

        vm.startPrank(user);
        usdt.approve(address(staking), amount);
        
        staking.buyAndLock(
            amount,
            0,
            duration,
            0,
            address(0),
            block.timestamp + 1000
        );
        vm.stopPrank();

        StakingLock.Lock[] memory locks = staking.getLocks(user);
        assertEq(locks[0].end, block.timestamp + duration);
    }

    // Fuzz test: Invalid durations should revert
    function testFuzz_RevertInvalidDuration(uint256 duration) public {
        // Exclude valid durations (multiples of 365 days)
        // This is a bit tricky to bound perfectly, so we'll pick random numbers
        // and if it accidentally hits a valid one, we skip.
        duration = bound(duration, 1, 10 * ONE_YEAR);
        
        bool isValid = (duration >= ONE_YEAR && duration <= 5 * ONE_YEAR && duration % ONE_YEAR == 0);
        if (isValid) return; // Skip valid cases

        uint256 amount = 100 * 10**6;
        address user = address(0x300);
        usdt.transfer(user, amount);

        vm.startPrank(user);
        usdt.approve(address(staking), amount);
        
        vm.expectRevert("bad duration");
        staking.buyAndLock(
            amount,
            0,
            duration,
            0,
            address(0),
            block.timestamp + 1000
        );
        vm.stopPrank();
    }

    // Fuzz test: Withdrawal attempts at random times
    function testFuzz_WithdrawalTiming(uint256 timeIncrease) public {
        uint256 amount = 100 * 10**6;
        uint256 duration = ONE_YEAR;
        
        address user = address(0x400);
        usdt.transfer(user, amount);
        
        vm.startPrank(user);
        usdt.approve(address(staking), amount);
        staking.buyAndLock(amount, 0, duration, 0, address(0), block.timestamp + 1000);

        // Random warp
        timeIncrease = bound(timeIncrease, 0, 10 * ONE_YEAR);
        vm.warp(block.timestamp + timeIncrease);

        if (timeIncrease < duration) {
            vm.expectRevert("locked");
            staking.withdraw(0);
        } else {
            staking.withdraw(0);
            StakingLock.Lock[] memory locks = staking.getLocks(user);
            assertTrue(locks[0].withdrawn);
        }
        vm.stopPrank();
    }
}
