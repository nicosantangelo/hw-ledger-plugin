import hre from "hardhat";

async function main() {
  const { provider } = hre.network;

  const [account] = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  console.log("METAMASK Account: 0x8f649fe750340a295dddbbd7e1ec8f378cf24b42");
  console.log("Account", account);
  console.log("\n");

  // const personalSignResult = await provider.request({
  //   method: "personal_sign",
  //   params: [
  //     "0x5417aa2a18a44da0675524453ff108c545382f0d7e26605c56bba47c21b5e979",
  //     account,
  //   ],
  // });
  // console.log(
  //   "METAMASK      Result: 0xdfbab2781f2b3086a954d05c8924e1f047cc85e18c6640a6077f4e2cae93f15b4bc225b8d7692da2d6e80f41edf0abfa1c9fb8300652ee3ece056787acda31ad00"
  // );
  // console.log("personal_sign Result:", personalSignResult);
  // console.log("\n");

  // const ethSignResult = await provider.request({
  //   method: "eth_sign",
  //   params: [
  //     account,
  //     "0x7699f568ecd7753e6ddf75a42fa4c2cc86cbbdc704c9eb1a6b6d4b9d8b8d1519",
  //   ],
  // });
  // console.log(
  //   "METAMASK Result: 0x095655e777e3c940cc1e9a509d584f73b1aea4edbb7722ddf830a9e0f8b2fc67478532aba93736e600250814a3b087a5ac179e5f10965aa543faa6b943117cf301"
  // );
  // console.log("eth_sign Result:", ethSignResult);
  // console.log("\n");

  const ethSignResultDataV4 = await provider.request({
    method: "eth_signTypedData_v4",
    params: [
      account,
      {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" },
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" },
          ],
        },
        primaryType: "Mail",
        domain: {
          name: "Ether Mail",
          version: "1",
          chainId: 1,
          verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
        },
        message: {
          from: {
            name: "Cow",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          to: {
            name: "Bob",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          },
          contents: "Hello, Bob!",
        },
      },
    ],
  });
  console.log(
    "METAMASK             Result: 0x66227cf0eb9710e328d68b1cf07a03638abd3c127fe2521c1843522eff689ffa2dcda378d5a8d2ccaecbbfb060b69775a02a05187a49d1fdcc367b2924bc014f00"
  );
  console.log("eth_signTypedData_v4 Result:", ethSignResultDataV4);
  console.log("\n");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
