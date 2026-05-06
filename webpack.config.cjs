const path = require("path");

module.exports = (_env, argv) => {
  const isProduction = argv.mode === "production";
  return {
    mode: argv.mode || "development",
    entry: "./src/loa-system.ts",
    target: "web",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "loa-system.js",
      module: true,
      chunkFormat: "module",
      library: { type: "module" },
      clean: true,
    },
    experiments: {
      outputModule: true,
    },
    resolve: {
      extensions: [".ts", ".js"],
      // Erlaubt TS-Dateien die per `.js`-Suffix importiert werden zu finden.
      extensionAlias: { ".js": [".ts", ".js"] },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
              options: { transpileOnly: true },
            },
          ],
        },
      ],
    },
    devtool: isProduction ? "source-map" : "eval-cheap-module-source-map",
    performance: { hints: false },
    stats: "minimal",
  };
};
