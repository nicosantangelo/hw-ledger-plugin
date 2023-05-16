import { ethers } from "hardhat";

async function main() {
  const Lock = await ethers.getContractFactory("Lock");
  const contract = Lock.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

  // Now you can call functions of the contract
  console.log(contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
