// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title StakingHub
 * @notice Complete staking system with Merkle reward distribution:
 * 1. Users deposit USDT → Treasury wallet
 * 2. Stakes created immediately
 * 3. Admin funds CCT escrow
 * 4. Users withdraw CCT after lock period
 * 5. Users claim rewards from Standard & VIP pools (Merkle proof)
 */
contract StakingHub is Ownable {
    // --- Configuration ---
    IERC20 public immutable usdt;
    IERC20 public immutable cctToken;
    address public treasury;
    
    uint256 public minDepositAmount = 100000; // 0.1 USDT

    // --- Staking State ---
    struct Stake {
        uint256 cctAmount;
        uint256 unlockTime;
        bool withdrawn;
        uint256 createdAt;
    }
    
    mapping(address => Stake[]) public userStakes;

    // --- Reward System (Merkle Tree) ---
    bytes32 public rewardMerkleRoot;  // Standard reward pool
    bytes32 public vipMerkleRoot;     // VIP reward pool
    
    // Track claimed rewards: keccak256(user, epochId) => claimed
    mapping(bytes32 => bool) public rewardsClaimed;
    mapping(bytes32 => bool) public vipRewardsClaimed;

    // --- Events ---
    event USDTDeposited(
        bytes32 indexed orderId,
        address indexed user,
        uint256 usdtAmount,
        uint256 cctAmount,
        uint256 lockDurationSeconds,
        string referralCode,
        uint256 timestamp
    );
    
    event StakeCreated(
        address indexed user, 
        uint256 index, 
        uint256 cctAmount, 
        uint256 unlockTime
    );
    
    event StakeWithdrawn(address indexed user, uint256 index, uint256 amount);
    
    event RewardClaimed(
        address indexed user,
        uint256 indexed epochId,
        uint256 amount,
        uint256 timestamp
    );
    
    event VIPRewardClaimed(
        address indexed user,
        uint256 indexed epochId,
        uint256 amount,
        uint256 timestamp
    );
    
    event RewardMerkleRootUpdated(bytes32 newRoot, uint256 timestamp);
    event VIPMerkleRootUpdated(bytes32 newRoot, uint256 timestamp);
    event TreasuryUpdated(address newTreasury);
    event MinDepositUpdated(uint256 newAmount);
    event ContractFunded(address indexed funder, uint256 amount);
    
    constructor(
        address _usdt, 
        address _cctToken, 
        address _treasury
    ) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT");
        require(_cctToken != address(0), "Invalid CCT");
        require(_treasury != address(0), "Invalid Treasury");
        
        usdt = IERC20(_usdt);
        cctToken = IERC20(_cctToken);
        treasury = _treasury;
    }
    
    // ========================================
    // USER FUNCTIONS - STAKING
    // ========================================
    
    /**
     * @notice User deposits USDT and creates stake.
     */
    function depositUSDT(
        bytes32 orderId,
        uint256 usdtAmount,
        uint256 cctAmount,
        uint256 lockDurationSeconds,
        string calldata referralCode
    ) external returns (uint256 stakeIndex) {
        require(usdtAmount >= minDepositAmount, "Below minimum");
        require(lockDurationSeconds > 0, "Invalid lock duration");
        require(cctAmount > 0, "CCT amount must be > 0");
        
        bool success = usdt.transferFrom(msg.sender, treasury, usdtAmount);
        require(success, "USDT transfer failed");
        
        uint256 unlockTime = block.timestamp + lockDurationSeconds;
        
        userStakes[msg.sender].push(Stake({
            cctAmount: cctAmount,
            unlockTime: unlockTime,
            withdrawn: false,
            createdAt: block.timestamp
        }));
        
        stakeIndex = userStakes[msg.sender].length - 1;
        
        emit USDTDeposited(
            orderId,
            msg.sender,
            usdtAmount,
            cctAmount,
            lockDurationSeconds,
            referralCode,
            block.timestamp
        );
        
        emit StakeCreated(msg.sender, stakeIndex, cctAmount, unlockTime);
        
        return stakeIndex;
    }
    
    /**
     * @notice User withdraws unlocked CCT stake.
     */
    function withdraw(uint256 index) external {
        require(index < userStakes[msg.sender].length, "Invalid index");
        Stake storage stake = userStakes[msg.sender][index];
        
        require(!stake.withdrawn, "Already withdrawn");
        require(block.timestamp >= stake.unlockTime, "Still locked");
        require(
            cctToken.balanceOf(address(this)) >= stake.cctAmount,
            "Insufficient CCT in contract - contact admin"
        );
        
        stake.withdrawn = true;
        
        // 5% Fee Calculation
        uint256 fee = (stake.cctAmount * 5) / 100;
        uint256 netAmount = stake.cctAmount - fee;

        bool success = cctToken.transfer(msg.sender, netAmount);
        require(success, "CCT transfer failed");
        
        emit StakeWithdrawn(msg.sender, index, stake.cctAmount);
    }
    
    /**
     * @notice View all stakes for a user.
     */
    function getUserStakes(address user) external view returns (Stake[] memory) {
        return userStakes[user];
    }
    
    // ========================================
    // USER FUNCTIONS - REWARD CLAIMS
    // ========================================
    
    /**
     * @notice Claim standard reward using Merkle proof.
     * @param epochId Reward epoch ID
     * @param amount Reward amount in CCT
     * @param proof Merkle proof array
     */
    function claimReward(
        uint256 epochId,
        uint256 amount,
        bytes32[] calldata proof
    ) external {
        bytes32 claimId = keccak256(abi.encodePacked(msg.sender, epochId));
        require(!rewardsClaimed[claimId], "Already claimed");
        require(rewardMerkleRoot != bytes32(0), "No reward distribution active");
        
        // Verify Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, epochId, amount));
        require(
            MerkleProof.verify(proof, rewardMerkleRoot, leaf),
            "Invalid Merkle proof"
        );
        
        // Mark as claimed
        rewardsClaimed[claimId] = true;
        
        // Transfer reward
        require(
            cctToken.balanceOf(address(this)) >= amount,
            "Insufficient CCT for rewards"
        );
        
        // 5% Fee Calculation
        uint256 fee = (amount * 5) / 100;
        uint256 netAmount = amount - fee;

        bool success = cctToken.transfer(msg.sender, netAmount);
        require(success, "Reward transfer failed");
        
        emit RewardClaimed(msg.sender, epochId, amount, block.timestamp);
    }
    
    /**
     * @notice Claim VIP reward using Merkle proof.
     * @param epochId VIP epoch ID
     * @param amount VIP reward amount in CCT
     * @param proof Merkle proof array
     */
    function claimVIPReward(
        uint256 epochId,
        uint256 amount,
        bytes32[] calldata proof
    ) external {
        bytes32 claimId = keccak256(abi.encodePacked(msg.sender, epochId));
        require(!vipRewardsClaimed[claimId], "Already claimed");
        require(vipMerkleRoot != bytes32(0), "No VIP distribution active");
        
        // Verify Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, epochId, amount));
        require(
            MerkleProof.verify(proof, vipMerkleRoot, leaf),
            "Invalid Merkle proof"
        );
        
        // Mark as claimed
        vipRewardsClaimed[claimId] = true;
        
        // Transfer reward
        require(
            cctToken.balanceOf(address(this)) >= amount,
            "Insufficient CCT for VIP rewards"
        );
        
        // 5% Fee Calculation
        uint256 fee = (amount * 5) / 100;
        uint256 netAmount = amount - fee;

        bool success = cctToken.transfer(msg.sender, netAmount);
        require(success, "VIP reward transfer failed");
        
        emit VIPRewardClaimed(msg.sender, epochId, amount, block.timestamp);
    }
    
    /**
     * @notice Check if user has claimed standard reward for epoch.
     */
    function hasClaimedReward(address user, uint256 epochId) external view returns (bool) {
        bytes32 claimId = keccak256(abi.encodePacked(user, epochId));
        return rewardsClaimed[claimId];
    }
    
    /**
     * @notice Check if user has claimed VIP reward for epoch.
     */
    function hasClaimedVIPReward(address user, uint256 epochId) external view returns (bool) {
        bytes32 claimId = keccak256(abi.encodePacked(user, epochId));
        return vipRewardsClaimed[claimId];
    }
    
    // ========================================
    // ADMIN FUNCTIONS
    // ========================================
    
    /**
     * @notice Publish new Merkle root for standard rewards.
     * @param newRoot New Merkle root hash
     */
    function publishRewardRoot(bytes32 newRoot) external onlyOwner {
        require(newRoot != bytes32(0), "Invalid root");
        rewardMerkleRoot = newRoot;
        emit RewardMerkleRootUpdated(newRoot, block.timestamp);
    }
    
    /**
     * @notice Publish new Merkle root for VIP rewards.
     * @param newRoot New Merkle root hash
     */
    function publishVIPRoot(bytes32 newRoot) external onlyOwner {
        require(newRoot != bytes32(0), "Invalid root");
        vipMerkleRoot = newRoot;
        emit VIPMerkleRootUpdated(newRoot, block.timestamp);
    }
    
    /**
     * @notice Fund contract with CCT (for withdrawals and rewards).
     */
    function fundContract(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        bool success = cctToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Funding failed");
        
        emit ContractFunded(msg.sender, amount);
    }
    
    /**
     * @notice Emergency CCT withdrawal.
     */
    function emergencyWithdrawCCT(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(
            cctToken.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );
        cctToken.transfer(msg.sender, amount);
    }
    
    /**
     * @notice Update treasury wallet.
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid address");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }
    
    /**
     * @notice Update minimum deposit.
     */
    function updateMinDeposit(uint256 newAmount) external onlyOwner {
        minDepositAmount = newAmount;
        emit MinDepositUpdated(newAmount);
    }
    
    /**
     * @notice Check contract's CCT balance.
     */
    function getContractCCTBalance() external view returns (uint256) {
        return cctToken.balanceOf(address(this));
    }
}

}
