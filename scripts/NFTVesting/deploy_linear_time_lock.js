const { ethers } = require("hardhat");

// Test script for deploying the contract

async function main() {
	// Local Blockchain Deployment
	const [owner] = await ethers.getSigners();
	const ownerBalance = await ethers.provider.getBalance(owner.address);
	console.log("Owner: ", owner.address);
	console.log("Owner Balance: ", ethers.utils.formatEther(ownerBalance));

	console.log("\nDeploying NFT contract...");

	// Deploying Basic NFT Contract
	const basicNFTContract = await ethers.getContractFactory("BasicNft");
	const basicNFTInstance = await basicNFTContract.deploy("TestNft", "TFT");

	// Minting NFT
	const basicMintTx = await basicNFTInstance.mintNft();
	await basicMintTx.wait(1);

	console.log(
		`Basic NFT index 0 tokenURI: ${await basicNFTInstance.tokenURI(0)}`
	);

	const nftOwner = await basicNFTInstance.ownerOf(0);
	console.log(`nftOwner: ${nftOwner}`);

	// getting timestamp
	const blockNumBefore = await ethers.provider.getBlockNumber();
	const blockBefore = await ethers.provider.getBlock(blockNumBefore);
	const timestampBefore = blockBefore.timestamp;
	const vestingStartTime = timestampBefore + 100;
	const maxDuration = 1000;
	console.log("timestampBefore: ", timestampBefore);

	console.log("\nDeploying TimeLock contract...");

	// Deploying Timelock and send ETH to TimeLock contract
	const timeLock = await ethers.getContractFactory("LinearVestingNftTimeLock");
	const timeLockInstance = await timeLock.deploy(
		basicNFTInstance.address,
		0,
		owner.address,
		vestingStartTime,
		maxDuration,
		{ value: ethers.utils.parseEther("1") }
	);

	await timeLockInstance.deployed();

	console.log("basicNFT deployed to:", basicNFTInstance.address);
	console.log("timeLockInstance deployed to:", timeLockInstance.address);

	// check NFT Locked
	const nftLocked = await timeLockInstance.nft();
	console.log("nftLocked: ", nftLocked);

	// Send NFT to timelock contract
	await basicNFTInstance.transferFrom(
		owner.address,
		timeLockInstance.address,
		0 // token id
	);

	// check owner of NFT after transfer to be timelock contract
	const nftOwnerAfterTransfer = await basicNFTInstance.ownerOf(0);
	console.log("nftOwnerAfterTransfer: ", nftOwnerAfterTransfer);

	// Set new timestamp by speeding up time
	await ethers.provider.send("evm_setNextBlockTimestamp", [
		timestampBefore + 188,
	]);
	await ethers.provider.send("evm_mine"); // Fast forward time

	// Get new timestamp
	const blockNumAfter = await ethers.provider.getBlockNumber();
	const blockAfter = await ethers.provider.getBlock(blockNumAfter);
	const currentTimeStamp = blockAfter.timestamp;
	console.log("currentTimeStamp: ", currentTimeStamp, "\n");

	// Get balance of timelock contract
	const timeLockBalance = await ethers.provider.getBalance(
		timeLockInstance.address
	);
	console.log("timeLockBalance: ", ethers.utils.formatEther(timeLockBalance));

	// Get current discount
	const currentDiscount = await timeLockInstance.getDiscount();
	console.log(
		"currentDiscount: ",
		ethers.utils.formatEther(currentDiscount),
		"\n"
	);

	// release NFT
	console.log(
		"Release Time: ",
		ethers.utils.formatUnits(await timeLockInstance.vestingStartTime(), 18 - 18)
	);
	
	console.log(
		"Release Time: ",
		ethers.utils.formatUnits(await timeLockInstance.vestingStartTime(), 18 - 18)
	);

	const blockNumBeforeRelease = await ethers.provider.getBlockNumber();
	const blockBeforeRelease = await ethers.provider.getBlock(
		blockNumBeforeRelease
	);
	console.log("Time Before Release:", blockBeforeRelease.timestamp, "\n");

	// Get current discount
	const currentDiscount2 = await timeLockInstance.getDiscount();
	console.log(
		"currentDiscount: ",
		ethers.utils.formatEther(currentDiscount2),
		"\n"
	);

	console.log("Releasing NFT... \n");

	const releaseTx = await timeLockInstance.release();
	const newNftOwner = await basicNFTInstance.ownerOf(0);
	console.log("newNftOwner: ", newNftOwner); // same as original beneficiary

	// // check if {release} function can be called again. Expected failure.
	// const releaseTx2 = await timeLockInstance.release();
	// console.log("releaseTx2: ", releaseTx2);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
