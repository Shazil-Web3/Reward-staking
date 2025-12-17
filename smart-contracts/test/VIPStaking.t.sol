// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/staking.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// Mock ERC20 Token (Same as StakingLock.t.sol)
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 18; // Standard 18 for YourToken (USDT usage handled separately)
    }
}

// USDT Mock with 6 decimals
contract MockUSDT is ERC20 {
    constructor() ERC20("USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10**6);
    }
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
    function decimals() public pure override returns (uint8) { return 6; }
}

// Mock Router (Simplified)
contract MockRouter {
    address public usdt;
    address public yourToken;
    constructor(address _usdt, address _yourToken) {
        usdt = _usdt;
        yourToken = _yourToken;
    }
    // dummy fallback
    fallback() external {} 
}

contract VIPStakingTest is Test {
    StakingLock public staking;
    MockUSDT public usdt;
    MockERC20 public yourToken;
    MockRouter public router;

    address public owner = address(this);
    address public feeCollector = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    // Tiers
    StakingLock.Tier starter;
    StakingLock.Tier pro;
    StakingLock.Tier elite;

    function setUp() public {
        usdt = new MockUSDT();
        yourToken = new MockERC20("YourToken", "YT");
        router = new MockRouter(address(usdt), address(yourToken));

        starter = StakingLock.Tier({
            minUsd: 50 * 10**6, feeBps: 1000, minLock: 365 days, maxLock: 365 days * 5, referralReq: 10, active: true
        });
        pro = StakingLock.Tier({
            minUsd: 100 * 10**6, feeBps: 1000, minLock: 365 days, maxLock: 365 days * 5, referralReq: 5, active: true
        });
        elite = StakingLock.Tier({
            minUsd: 1000 * 10**6, feeBps: 1000, minLock: 365 days, maxLock: 365 days * 5, referralReq: 0, active: true
        });

        staking = new StakingLock(
            address(yourToken),
            address(usdt),
            address(router),
            feeCollector,
            starter, pro, elite
        );

        // Fund user1 with tokens
        yourToken.mint(user1, 10000 * 10**18);
        
        // Ensure Test Contract has tokens (minted in constructor already, but let's be safe/explicit if needed)
        // The MockERC20 constructor mints to msg.sender (this contract).
        
        // Approve staking contract to spend owner's tokens for funding
        yourToken.approve(address(staking), type(uint256).max);
    }

    // --- Helper for Merkle Tree (Single Leaf for simplicity) ---
    function _getLeaf(address account, uint256 amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, amount));
    }

    // --- VIP Pool & Manual Funding Tests ---

    function test_ManualVipFunding() public {
        uint256 amount = 1000 * 10**18;
        
        yourToken.approve(address(staking), amount);
        staking.fundVipRewardTokens(address(yourToken), amount);

        assertEq(staking.vipPoolBalance(), amount);
        assertEq(yourToken.balanceOf(address(staking)), amount);
    }

    function test_RevertIf_NonOwnerFundsVip() public {
        vm.prank(user1);
        yourToken.approve(address(staking), 100);
        
        vm.prank(user1); // Prank again for the next call
        vm.expectRevert(); // OwnableUnauthorizedAccount
        staking.fundVipRewardTokens(address(yourToken), 100);
    }

    // --- Auto Funding from Claim Tests ---

    function test_ClaimDeducts5PercentForVip() public {
        // 1. Setup Normal Reward Epoch
        uint256 rewardAmount = 1000 * 10**18;
        bytes32 leaf = _getLeaf(user1, rewardAmount);
        bytes32 root = leaf; // Single node tree
        
        // Fund contract for normal rewards (already funded in setUp)
        staking.fundRewardTokens(address(yourToken), rewardAmount);
        staking.createRewardEpoch(root, address(yourToken), rewardAmount);
        
        // 2. User claims
        bytes32[] memory proof = new bytes32[](0); // Empty proof for single root
        
        uint256 userBalBefore = yourToken.balanceOf(user1);
        
        vm.prank(user1);
        staking.claim(0, rewardAmount, proof);
        
        // 3. Verificaion
        uint256 expectedVipFee = (rewardAmount * 500) / 10000; // 5%
        uint256 expectedUserAmount = rewardAmount - expectedVipFee;
        
        assertEq(staking.vipPoolBalance(), expectedVipFee, "VIP pool should receive 5%");
        assertEq(yourToken.balanceOf(user1) - userBalBefore, expectedUserAmount, "User should receive 95%");
    }

    // --- VIP Epoch Creation Tests ---

    function test_CreateVipEpoch() public {
        // Fund VIP pool first
        uint256 fundAmount = 2000 * 10**18;
        yourToken.approve(address(staking), fundAmount);
        staking.fundVipRewardTokens(address(yourToken), fundAmount);
        
        // Create VIP Epoch
        uint256 epochTotal = 1000 * 10**18;
        bytes32 root = keccak256("vip_root");
        
        staking.createVipRewardEpoch(root, address(yourToken), epochTotal);
        
        assertEq(staking.vipPoolBalance(), fundAmount - epochTotal);
        assertEq(staking.vipEpochsCount(), 1);
        
        (bytes32 r, IERC20 t, uint256 tot, bool active) = staking.vipEpochs(0);
        assertEq(r, root);
        assertEq(address(t), address(yourToken));
        assertEq(tot, epochTotal);
        assertTrue(active);
    }

    function test_RevertIf_InsufficientVipBalance() public {
        uint256 epochTotal = 1000 * 10**18;
        bytes32 root = keccak256("vip_root");
        
        vm.expectRevert("insufficient VIP pool");
        staking.createVipRewardEpoch(root, address(yourToken), epochTotal);
    }

    // --- VIP Claiming Tests ---

    function test_ClaimVipReward() public {
        uint256 rewardAmount = 500 * 10**18;
        bytes32 leaf = _getLeaf(user1, rewardAmount);
        
        // Fund & Create Epoch
        yourToken.approve(address(staking), rewardAmount);
        staking.fundVipRewardTokens(address(yourToken), rewardAmount);
        staking.createVipRewardEpoch(leaf, address(yourToken), rewardAmount);
        
        // Claim
        uint256 userBalBefore = yourToken.balanceOf(user1);
        vm.prank(user1);
        staking.claimVip(0, rewardAmount, new bytes32[](0));
        
        assertEq(yourToken.balanceOf(user1) - userBalBefore, rewardAmount);
        assertTrue(staking.vipClaimed(0, user1));
    }

    function test_RevertIf_VerifyFails_Vip() public {
        uint256 rewardAmount = 500 * 10**18;
        bytes32 leaf = _getLeaf(user1, rewardAmount);

        yourToken.approve(address(staking), rewardAmount);
        staking.fundVipRewardTokens(address(yourToken), rewardAmount);
        staking.createVipRewardEpoch(leaf, address(yourToken), rewardAmount);
        
        // Try to claim with wrong amount
        vm.prank(user1);
        vm.expectRevert("bad proof");
        staking.claimVip(0, rewardAmount + 1, new bytes32[](0));
    }

    function test_RevertIf_DoubleClaim_Vip() public {
        uint256 rewardAmount = 500 * 10**18;
        bytes32 leaf = _getLeaf(user1, rewardAmount);

        yourToken.approve(address(staking), rewardAmount);
        staking.fundVipRewardTokens(address(yourToken), rewardAmount);
        staking.createVipRewardEpoch(leaf, address(yourToken), rewardAmount);
        
        vm.prank(user1);
        staking.claimVip(0, rewardAmount, new bytes32[](0));
        
        vm.prank(user1);
        vm.expectRevert("claimed");
        staking.claimVip(0, rewardAmount, new bytes32[](0));
    }

    // --- Fuzz Testing ---

    function testFuzz_ClaimFeeCalculation(uint256 amount) public {
        vm.assume(amount > 10000 && amount < 1000000000 * 10**18); // Reasonable range to avoid overflow/underflow issues (though Solidity 0.8 handles over/underflow)
        
        // Simulate normal claim
        bytes32 leaf = _getLeaf(user1, amount);
        
        // Ensure contract has enough tokens
        uint256 contractBal = yourToken.balanceOf(address(staking));
        if (contractBal < amount) {
             yourToken.mint(address(staking), amount - contractBal);
        }

        // Must manually create epoch since we need a valid root for the amount
        // However, we are testing the logic inside claim, specifically the fee math.
        // We need to bypass the Merkle check or set it up perfectly.
        // Setting up perfectly is easier.
        
        // Mock the epoch
        // Since `epochs` mapping is public, we can't write to it directly if it were a complex struct array, but here we can just call createRewardEpoch if we are owner.
        // But we need to be owner. `setUp` sets owner to `this`.
        
        staking.createRewardEpoch(leaf, address(yourToken), amount);
        uint256 epochId = staking.epochsCount() - 1;
        
        uint256 preVipBal = staking.vipPoolBalance();
        uint256 preUserBal = yourToken.balanceOf(user1);
        
        vm.prank(user1);
        staking.claim(epochId, amount, new bytes32[](0));
        
        uint256 expectedFee = (amount * 500) / 10000;
        uint256 expectedUser = amount - expectedFee;
        
        assertEq(staking.vipPoolBalance() - preVipBal, expectedFee, "Fuzzed fee mismatch");
        assertEq(yourToken.balanceOf(user1) - preUserBal, expectedUser, "Fuzzed user amount mismatch");
    }
}
