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

## TODO

- [ ] Configuration
- [ ] Tests
