// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/staking.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 Token
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6; // USDT has 6 decimals
    }
}

// Mock Uniswap Router
contract MockRouter {
    MockERC20 public usdt;
    MockERC20 public yourToken;

    constructor(address _usdt, address _yourToken) {
        usdt = MockERC20(_usdt);
        yourToken = MockERC20(_yourToken);
    }

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external {
        require(path.length == 2, "Invalid path");
        require(path[0] == address(usdt) && path[1] == address(yourToken), "Invalid tokens");
        
        // Simple 1:1 swap for testing (accounting for decimals)
        usdt.transferFrom(msg.sender, address(this), amountIn);
        uint256 amountOut = amountIn * 10**12; // USDT (6 decimals) to YourToken (18 decimals)
        yourToken.transfer(to, amountOut);
    }
}

contract StakingLockTest is Test {
    StakingLock public staking;
    MockERC20 public usdt;
    MockERC20 public yourToken;
    MockRouter public router;

    address public owner = address(this);
    address public feeCollector = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public user3 = address(0x4);
    address public referrer1 = address(0x5);

    uint256 constant ONE_YEAR = 365 days;
    
    // Tier configs
    StakingLock.Tier starter;
    StakingLock.Tier pro;
    StakingLock.Tier elite;

    function setUp() public {
        // Deploy tokens
        usdt = new MockERC20("USDT", "USDT");
        yourToken = new MockERC20("YourToken", "YT");
        
        // Deploy router
        router = new MockRouter(address(usdt), address(yourToken));
        
        // Fund router with tokens for swaps
        yourToken.mint(address(router), 1000000 * 10**18);

        // Setup tiers
        starter = StakingLock.Tier({
            minUsd: 50 * 10**6,      // $50 (6 decimals)
            feeBps: 1000,            // 10%
            minLock: uint32(ONE_YEAR),
            maxLock: uint32(ONE_YEAR * 5),
            referralReq: 10,
            active: true
        });

        pro = StakingLock.Tier({
            minUsd: 100 * 10**6,     // $100
            feeBps: 1000,
            minLock: uint32(ONE_YEAR),
            maxLock: uint32(ONE_YEAR * 5),
            referralReq: 5,
            active: true
        });

        elite = StakingLock.Tier({
            minUsd: 1000 * 10**6,    // $1000
            feeBps: 1000,
            minLock: uint32(ONE_YEAR),
            maxLock: uint32(ONE_YEAR * 5),
            referralReq: 0,
            active: true
        });

        // Deploy staking contract
        staking = new StakingLock(
            address(yourToken),
            address(usdt),
            address(router),
            feeCollector,
            starter,
            pro,
            elite
        );

        // Setup users with USDT
        usdt.transfer(user1, 10000 * 10**6);
        usdt.transfer(user2, 10000 * 10**6);
        usdt.transfer(user3, 10000 * 10**6);
        usdt.transfer(referrer1, 10000 * 10**6);
    }

    /* ============ DEPLOYMENT TESTS ============ */

    function test_Deployment() public {
        assertEq(address(staking.yourToken()), address(yourToken));
        assertEq(address(staking.usdt()), address(usdt));
        assertEq(address(staking.router()), address(router));
        assertEq(staking.feeCollector(), feeCollector);
        assertEq(staking.owner(), owner);
    }

    function test_TierConfiguration() public {
        (uint256 minUsd, uint16 feeBps, uint32 minLock, uint32 maxLock, uint8 referralReq, bool active) 
            = staking.tiers(0); // Starter
        
        assertEq(minUsd, 50 * 10**6);
        assertEq(feeBps, 1000);
        assertEq(minLock, uint32(ONE_YEAR));
        assertEq(maxLock, uint32(ONE_YEAR * 5));
        assertEq(referralReq, 10);
        assertTrue(active);
    }

    /* ============ STAKING TESTS ============ */

    function test_BuyAndLock_Starter() public {
        uint256 amount = 100 * 10**6; // $100
        uint256 duration = ONE_YEAR;
        
        vm.startPrank(user1);
        usdt.approve(address(staking), amount);
        
        staking.buyAndLock(
            amount,
            0, // minTokensOut
            duration,
            0, // Starter package
            address(0),
            block.timestamp + 1000
        );
        vm.stopPrank();

        // Check lock was created
        StakingLock.Lock[] memory locks = staking.getLocks(user1);
        assertEq(locks.length, 1);
        assertEq(locks[0].packageId, 0);
        assertFalse(locks[0].withdrawn);
    }

    function test_BuyAndLock_WithReferrer() public {
        uint256 amount = 100 * 10**6;
        
        vm.startPrank(user1);
        usdt.approve(address(staking), amount);
        
        staking.buyAndLock(
            amount,
            0,
            ONE_YEAR,
            0,
            referrer1, // Set referrer
            block.timestamp + 1000
        );
        vm.stopPrank();

        // Check referrer was set
        assertEq(staking.referrerOf(user1), referrer1);
        assertEq(staking.directReferrals(referrer1), 1);
    }

    function test_RevertIf_AmountTooLow() public {
        uint256 amount = 10 * 10**6; // $10 - below minimum
        
        vm.startPrank(user1);
        usdt.approve(address(staking), amount);
        
        vm.expectRevert();
        staking.buyAndLock(
            amount,
            0,
            ONE_YEAR,
            0,
            address(0),
            block.timestamp + 1000
        );
        vm.stopPrank();
    }

    function test_RevertIf_InvalidDuration() public {
        uint256 amount = 100 * 10**6;
        
        vm.startPrank(user1);
        usdt.approve(address(staking), amount);
        
        vm.expectRevert("bad duration");
        staking.buyAndLock(
            amount,
            0,
            180 days, // Invalid - not 1-5 years
            0,
            address(0),
            block.timestamp + 1000
        );
        vm.stopPrank();
    }

    /* ============ REFERRAL TESTS ============ */

    function test_ReferrerSetOnce() public {
        uint256 amount = 100 * 10**6;
        
        // First stake with referrer1
        vm.startPrank(user1);
        usdt.approve(address(staking), amount * 2);
        
        staking.buyAndLock(amount, 0, ONE_YEAR, 0, referrer1, block.timestamp + 1000);
        
        // Second stake should not change referrer
        staking.buyAndLock(amount, 0, ONE_YEAR, 0, user2, block.timestamp + 1000);
        vm.stopPrank();

        // Referrer should still be referrer1
        assertEq(staking.referrerOf(user1), referrer1);
        assertEq(staking.directReferrals(referrer1), 1); // Only counted once
    }

    function test_MultipleReferrals() public {
        uint256 amount = 100 * 10**6;
        
        // User1 stakes with referrer1
        vm.startPrank(user1);
        usdt.approve(address(staking), amount);
        staking.buyAndLock(amount, 0, ONE_YEAR, 0, referrer1, block.timestamp + 1000);
        vm.stopPrank();

        // User2 stakes with referrer1
        vm.startPrank(user2);
        usdt.approve(address(staking), amount);
        staking.buyAndLock(amount, 0, ONE_YEAR, 0, referrer1, block.timestamp + 1000);
        vm.stopPrank();

        // User3 stakes with referrer1
        vm.startPrank(user3);
        usdt.approve(address(staking), amount);
        staking.buyAndLock(amount, 0, ONE_YEAR, 0, referrer1, block.timestamp + 1000);
        vm.stopPrank();

        // Referrer1 should have 3 referrals
        assertEq(staking.directReferrals(referrer1), 3);
    }

    /* ============ WITHDRAWAL TESTS ============ */

    function test_Withdraw_AfterLockPeriod() public {
        uint256 amount = 100 * 10**6;
        
        vm.startPrank(user1);
        usdt.approve(address(staking), amount);
        staking.buyAndLock(amount, 0, ONE_YEAR, 0, address(0), block.timestamp + 1000);
        
        // Fast forward past lock period
        vm.warp(block.timestamp + ONE_YEAR + 1);
        
        StakingLock.Lock[] memory locksBefore = staking.getLocks(user1);
        uint256 tokenAmount = locksBefore[0].amountToken;
        
        staking.withdraw(0);
        vm.stopPrank();

        // Check withdrawal
        StakingLock.Lock[] memory locksAfter = staking.getLocks(user1);
        assertTrue(locksAfter[0].withdrawn);
    }

    function test_RevertIf_WithdrawBeforeLock() public {
        uint256 amount = 100 * 10**6;
        
        vm.startPrank(user1);
        usdt.approve(address(staking), amount);
        staking.buyAndLock(amount, 0, ONE_YEAR, 0, address(0), block.timestamp + 1000);
        
        vm.expectRevert("locked");
        staking.withdraw(0);
        vm.stopPrank();
    }

    /* ============ REWARDS TESTS ============ */

    function test_CreateRewardEpoch() public {
        bytes32 merkleRoot = keccak256("test");
        uint256 total = 1000 * 10**18;
        
        // Fund contract with reward tokens
        yourToken.approve(address(staking), total);
        staking.fundRewardTokens(address(yourToken), total);
        
        // Create epoch
        staking.createRewardEpoch(merkleRoot, address(yourToken), total);
        
        // Check epoch
        (bytes32 root, IERC20 payoutToken, uint256 epochTotal, bool active) 
            = staking.epochs(0);
        
        assertEq(root, merkleRoot);
        assertEq(address(payoutToken), address(yourToken));
        assertEq(epochTotal, total);
        assertTrue(active);
    }

    /* ============ ACCESS CONTROL TESTS ============ */

    function test_RevertIf_NonOwnerPause() public {
        vm.prank(user1);
        vm.expectRevert();
        staking.pause();
    }

    function test_OwnerCanPause() public {
        staking.pause();
        assertTrue(staking.paused());
        
        staking.unpause();
        assertFalse(staking.paused());
    }

    function test_RevertIf_StakeWhenPaused() public {
        staking.pause();
        
        vm.startPrank(user1);
        usdt.approve(address(staking), 100 * 10**6);
        
        vm.expectRevert();
        staking.buyAndLock(100 * 10**6, 0, ONE_YEAR, 0, address(0), block.timestamp + 1000);
        vm.stopPrank();
    }

    /* ============ EDGE CASE TESTS ============ */

    function test_CustomPackageMapping() public {
        // Custom package with $150 should map to Pro tier
        uint256 amount = 150 * 10**6;
        
        vm.startPrank(user1);
        usdt.approve(address(staking), amount);
        staking.buyAndLock(amount, 0, ONE_YEAR, 3, address(0), block.timestamp + 1000); // Package 3 = Custom
        vm.stopPrank();

        StakingLock.Lock[] memory locks = staking.getLocks(user1);
        assertEq(locks[0].packageId, 3);
    }

    function test_FeeCollection() public {
        uint256 amount = 100 * 10**6;
        uint256 expectedFee = amount / 10; // 10%
        
        uint256 collectorBalanceBefore = usdt.balanceOf(feeCollector);
        
        // Set to not retain fees (send to collector)
        staking.setRetainFeesInContract(false);
        
        vm.startPrank(user1);
        usdt.approve(address(staking), amount);
        staking.buyAndLock(amount, 0, ONE_YEAR, 0, address(0), block.timestamp + 1000);
        vm.stopPrank();

        // Fee collector should receive the fee
        uint256 collectorBalanceAfter = usdt.balanceOf(feeCollector);
        assertEq(collectorBalanceAfter - collectorBalanceBefore, expectedFee);
    }
}
