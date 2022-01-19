// craco.config.js
module.exports = {
  plugins: [
    {
      plugin: require('craco-esbuild'),
      options: {
        esbuildLoaderOptions: {
          loader: 'tsx',
          implementation: require('esbuild'),
          target: 'es2019',
        },
        esbuildMinimizerOptions: {
          target: 'es2019',
        },
      },
    },
  ],
}
