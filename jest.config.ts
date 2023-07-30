import type {JestConfigWithTsJest} from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  verbose: true,
  moduleNameMapper: {
    "@noble/secp256k1": require.resolve("@noble/secp256k1"),
  },
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.cjs.json",
    },
  },
};

export default jestConfig;
