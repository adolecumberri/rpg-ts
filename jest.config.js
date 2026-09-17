module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testRegex: '(/tests/.*|(\\.|/)(test|spec))\\.[jt]s$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/worldTest/'],
};
