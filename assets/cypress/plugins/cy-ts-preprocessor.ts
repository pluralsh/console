import * as path from 'path';

const webpackOptions = {
  resolve: { extensions: ['.ts', '.js'] },
  alis: {
    '@pages/*': path.resolve(__dirname, '../pages'),
    '@config/*': path.resolve(__dirname, '../config'),
    '@support/*': path.resolve(__dirname, '../support')
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'ts-loader',
            options: { configFile: 'cypress/tsconfig.e2e.json' },
          },
        ],
      },
    ],
  },
};

export const configuration = { webpackOptions };
export default configuration;
