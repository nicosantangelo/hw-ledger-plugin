# Hardhat Ledger Plugin

This project is still in development. To test it you'll have to link a hardhat version running the [feat/extend-providers](https://github.com/NomicFoundation/hardhat/tree/feat/extend-providers) branch, tracked in [this PR](https://github.com/NomicFoundation/hardhat/pull/3932#pullrequestreview-1442364041).

```shell
git clone git clone git@github.com:NomicFoundation/hardhat.git
cd hardhat
git checkout feat/extend-providers
npm link
npx yarn watch
```

```shell
cd hw-ledger-plugin.git
npm i
npm link hardhat
npx hardhat run scripts/test-plugin.ts
```

You should get something like the following result logged in the console as a result. Remember to accept the prompts in your ledger and to change the expected results in `test-plugin` for your signatures:

```
EXPECTED     Account: 0x9f649FE750340A295dDdbBd7e1EC8f378cF24b43
eth_accounts Account: 0x9f649FE750340A295dDdbBd7e1EC8f378cF24b43


EXPECTED      Result: 0xdfbab2781f2b3086a954d05c8924e1f047cc85e18c6640a6077f4e2cae93f15b4bc225b8d7692da2d6e80f41edf0abfa1c9fb8300652ee3ece056787acda31ad00
personal_sign Result: 0xdfbab2781f2b3086a954d05c8924e1f047cc85e18c6640a6077f4e2cae93f15b4bc225b8d7692da2d6e80f41edf0abfa1c9fb8300652ee3ece056787acda31ad00


EXPECTED Result: 0x095655e777e3c940cc1e9a509d584f73b1aea4edbb7722ddf830a9e0f8b2fc67478532aba93736e600250814a3b087a5ac179e5f10965aa543faa6b943117cf301
eth_sign Result: 0x095655e777e3c940cc1e9a509d584f73b1aea4edbb7722ddf830a9e0f8b2fc67478532aba93736e600250814a3b087a5ac179e5f10965aa543faa6b943117cf301


EXPECTED             Result: 0x66227cf0eb9710e328d68b1cf07a03638abd3c127fe2521c1843522eff689ffa2dcda378d5a8d2ccaecbbfb060b69775a02a05187a49d1fdcc367b2924bc014f00
eth_signTypedData_v4 Result: 0x66227cf0eb9710e328d68b1cf07a03638abd3c127fe2521c1843522eff689ffa2dcda378d5a8d2ccaecbbfb060b69775a02a05187a49d1fdcc367b2924bc014f00


Balance of 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 : 10000.0 - 0x21e19e0c9bab2400000
Balance of 0x9f649FE750340A295dDdbBd7e1EC8f378cF24b43 : 0.0 - 0x0
-----
Balance of 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 : 9995.999950125 - 0x21de25dc18fa7078200
Balance of 0x9f649FE750340A295dDdbBd7e1EC8f378cF24b43 : 4.0 - 0x3782dace9d900000
-----
Balance of 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 : 9995.9999501250000001 - 0x21de25dc18fa7078264
Balance of 0x9f649FE750340A295dDdbBd7e1EC8f378cF24b43 : 3.9999629186593749 - 0x3782b914f16d3f34
```

## TODO

- [ ] Configuration
- [ ] Tests
