const webpackOptions = {
  resolve: { extensions: ['.ts', '.js'] },
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
