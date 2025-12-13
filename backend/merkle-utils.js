const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

/**
 * Generates a Merkle tree for reward distribution
 * @param {Array} recipients - Array of {address: string, amount: string/BigInt}
 * @returns {Object} - {root, tree, proofs}
 */
function generateMerkleTree(recipients) {
    // Create leaves: keccak256(abi.encodePacked(address, amount))
    const leaves = recipients.map(r => {
        const abiCoded = ethers.solidityPacked(
            ['address', 'uint256'],
            [r.address, BigInt(r.amount)]
        );
        return keccak256(abiCoded);
    });

    // Create tree
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const root = tree.getHexRoot();

    // Generate proofs for each recipient
    const proofs = {};
    recipients.forEach((r, index) => {
        const proof = tree.getHexProof(leaves[index]);
        proofs[r.address.toLowerCase()] = proof;
    });

    return {
        root,
        tree,
        proofs,
        leaves: leaves.map(l => '0x' + l.toString('hex'))
    };
}

/**
 * Verify a proof
 */
function verifyProof(proof, leaf, root) {
    const tree = new MerkleTree([], keccak256, { sortPairs: true });
    return tree.verify(proof, leaf, root);
}

module.exports = {
    generateMerkleTree,
    verifyProof
};
