export default {
    transform: {
      '^.+\\.js$': 'babel-jest'
    },
    setupFiles: ["./jest.setup.js"],
    testEnvironment: 'node'
  };
  