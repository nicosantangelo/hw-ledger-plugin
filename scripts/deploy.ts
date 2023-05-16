import hre from "hardhat";

async function main() {
  const chainId = await hre.network.provider.request({ method: "eth_chainId" });
  hre.network.provider.on("change", () => {});
  console.log("Chain id", chainId);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
