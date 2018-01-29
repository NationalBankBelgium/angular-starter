/**
 * @author: @AngularClass
 */

const helpers = require('./helpers');

/**
 * Webpack Plugins
 *
 * problem with copy-webpack-plugin
 */
const DefinePlugin = require('webpack/lib/DefinePlugin');
const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlElementsPlugin = require('./html-elements-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineManifestWebpackPlugin = require('inline-manifest-webpack-plugin');
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const {AngularCompilerPlugin} = require('@ngtools/webpack');
const NoEmitOnErrorsPlugin = require("webpack/lib/NoEmitOnErrorsPlugin");
const WebpackSHAHash = require("webpack-sha-hash");
const ContextReplacementPlugin = require("webpack/lib/ContextReplacementPlugin");
// const PurifyPlugin = require('@angular-devkit/build-optimizer').PurifyPlugin; // TODO should we add this plugin?

const buildUtils = require('./build-utils');


/**
 * Webpack configuration
 *
 * See: http://webpack.github.io/docs/configuration.html#cli
 */
module.exports = function (options) {
  const isProd = options.env === 'production';
  const METADATA = Object.assign({}, buildUtils.DEFAULT_METADATA, options.metadata || {});
  const supportES2015 = buildUtils.supportES2015(METADATA.tsConfigPath);

  const entry = {
    polyfills: './src/polyfills.browser.ts',
    main: './src/main.browser.ts'
  };

  const environment = buildUtils.getEnvFile(METADATA.envFileSuffix);

  const buildOptimizerLoader = {
    loader: '@angular-devkit/build-optimizer/webpack-loader',
    options: {
      sourceMap: true // TODO: apply based on tsConfig value?
    }
  };

  // TODO aparently we don't need babel to make it work in IE
  // const babelOptions = {
  //   presets: [
  //     ["@babel/preset-env", {
  //       "targets": {
  //         "browsers": [
  //           "last 2 versions",
  //           "ie >= 11",
  //           "Chrome >= 56",
  //           "Firefox >= 48",
  //           "Safari >= 7"
  //         ]
  //       },
  //       "modules": false
  //     }]
  //   ]
  // };

  return {
    /**
     * The entry point for the bundle
     * Our Angular.js app
     *
     * See: http://webpack.github.io/docs/configuration.html#entry
     */
    entry: entry,

    /**
     * Options affecting the resolving of modules.
     *
     * See: http://webpack.github.io/docs/configuration.html#resolve
     */
    resolve: {
      mainFields: [...(supportES2015 ? ['es2015'] : []), 'browser', 'module', 'main'],

      /**
       * An array of extensions that should be used to resolve modules.
       *
       * See: http://webpack.github.io/docs/configuration.html#resolve-extensions
       */
      extensions: ['.ts', '.js', '.json'],

      /**
       * An array of directory names to be resolved to the current directory
       */
      modules: [helpers.root('src'), helpers.root('node_modules')],

      /**
       * Add support for lettable operators.
       *
       * For existing codebase a refactor is required.
       * All rxjs operator imports (e.g. `import 'rxjs/add/operator/map'` or `import { map } from `rxjs/operator/map'`
       * must change to `import { map } from 'rxjs/operators'` (note that all operators are now under that import.
       * Additionally some operators have changed to to JS keyword constraints (do => tap, catch => catchError)
       *
       * Remember to use the `pipe()` method to chain operators, this functinoally makes lettable operators similar to
       * the old operators usage paradigm.
       *
       * For more details see:
       * https://github.com/ReactiveX/rxjs/blob/master/doc/lettable-operators.md#build-and-treeshaking
       *
       * If you are not planning on refactoring your codebase (or not planning on using imports from `rxjs/operators`
       * comment out this line.
       *
       * BE AWARE that not using lettable operators will probably result in significant payload added to your bundle.
       */
      alias: buildUtils.rxjsAlias(supportES2015)
    },

    /**
     * Options affecting the normal modules.
     *
     * See: http://webpack.github.io/docs/configuration.html#module
     */
    module: {

      rules: [
        // TODO could we use BuildOptimizer in all environments?
        {
          test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
          use: METADATA.AOT && isProd ?
            [
              buildOptimizerLoader,
              // {
              //   loader: "babel-loader",
              //   options: babelOptions
              // },
              '@ngtools/webpack',
            ] : [
              // {
              //   loader: "babel-loader",
              //   options: babelOptions
              // },
              '@ngtools/webpack'
            ]
        },

        // use babel in any case for JS
        ...isProd ? [
          {
            test: /\.js$/,
            use: [
              buildOptimizerLoader,
              // {
              //   loader: "babel-loader",
              //   options: babelOptions
              // }
            ]
          }
        ] : [
          // {
          //   test: /\.js$/,
          //   use: [
          //     {
          //       loader: "babel-loader",
          //       options: babelOptions
          //     }
          //   ]
          // }
        ],

        // TsLint loader support for *.ts files
        // reference: https://github.com/wbuchwalter/tslint-loader
        {
          enforce: "pre",
          test: /\.ts$/,
          use: [
            "tslint-loader"
          ],
          exclude: [
            helpers.root("node_modules")
            // helpers.rootStark("node_modules")
          ]
        },

        // Source map loader support for *.js files
        // Extracts SourceMaps for source files that as added as sourceMappingURL comment.
        // reference: https://github.com/webpack/source-map-loader
        {
          enforce: "pre",
          test: /\.js$/,
          use: [
            "source-map-loader"
          ],
          exclude: [
            // helpers.rootStark("node_modules/rxjs"),
            helpers.root("node_modules/rxjs"),
            helpers.root('node_modules/@angular')
          ]
        },

        /**
         * To string and css loader support for *.css files (from Angular components)
         * Returns file content as string
         *
         */
        {
          test: /\.css$/,
          use: ['to-string-loader', 'css-loader'],
          exclude: [helpers.root('src', 'styles')]
        },

        /**
         * To string and sass loader support for *.scss files (from Angular components)
         * Returns compiled css content as string
         *
         */
        // TODO Check if this loader is needed for Angular Material components
        {
          test: /\.scss$/,
          use: ['to-string-loader', 'css-loader', 'sass-loader'],
          exclude: [helpers.root('src', 'styles')]
        },

        /**
         * To string and css and postcss loader support for *.pcss files
         * Returns compiled css content as string
         *
         */
        {
          test: /\.pcss$/,
          use: [
            "to-string-loader",
            {
              loader: "css-loader",
              options: {
                //modules: true, // to check if needed
                //minimize: true,
                // even if disabled, sourceMaps gets generated
                sourceMap: false, // true
                autoprefixer: false,
                // see https://github.com/webpack-contrib/css-loader#importloaders)
                importLoaders: 1 // 1 => postcss-loader
              }
            },
            {
              loader: "postcss-loader",
              options: {
                sourceMap: true,
                plugins: [
                  // reference: https://github.com/postcss/postcss-import
                  // https://github.com/postcss/postcss-import/issues/244
                  require("postcss-import")(),

                  // plugin to rebase, inline or copy on url().
                  // https://github.com/postcss/postcss-url
                  require("postcss-url")(),

                  require("postcss-nesting")(),
                  require("postcss-simple-extend")(),
                  require("postcss-cssnext")({
                    // see https://github.com/MoOx/postcss-cssnext/issues/268 for example
                    browsers: ["last 3 versions", "Chrome >= 45"]
                  })
                ]
              }
            }
          ],
          exclude: [helpers.root('src', 'styles')]
        },

        /**
         * Raw loader support for *.html
         * Returns file content as string
         *
         * See: https://github.com/webpack/raw-loader
         */
        {
          test: /\.html$/,
          use: 'raw-loader',
          exclude: [helpers.root('src/index.html')]
        },

        /**
         * File loader for supporting images, for example, in CSS files.
         */
        {
          test: /\.(jpg|png|gif)$/,
          use: 'file-loader'
        },

        /**
         *  File loader for supporting fonts, for example, in CSS files.
         */
        {
          test: /\.(eot|woff2?|svg|ttf)([\?]?.*)$/,
          use: 'file-loader'
        }

      ],

    },

    /**
     * Add additional plugins to the compiler.
     *
     * See: http://webpack.github.io/docs/configuration.html#plugins
     */
    plugins: [
      // /**
      //  * Plugin: DefinePlugin
      //  * Description: Define free variables.
      //  * Useful for having development builds with debug logging or adding global constants.
      //  *
      //  * Environment helpers
      //  *
      //  * See: https://webpack.github.io/docs/list-of-plugins.html#defineplugin
      //  */
      // // NOTE: when adding more properties make sure you include them in custom-typings.d.ts
      // new DefinePlugin({
      //   'ENV': JSON.stringify(METADATA.ENV),
      //   'HMR': METADATA.HMR,
      //   'AOT': METADATA.AOT,
      //   'process.env.ENV': JSON.stringify(METADATA.ENV),
      //   'process.env.NODE_ENV': JSON.stringify(METADATA.ENV),
      //   'process.env.HMR': METADATA.HMR
      // }),

      // new PurifyPlugin()  // TODO should we add this plugin?

      /**
       * Plugin: NoEmitOnErrorsPlugin
       * Description: Only emit files when there are no errors.
       *
       * See: https://webpack.js.org/plugins/no-emit-on-errors-plugin
       */
      new NoEmitOnErrorsPlugin(),

      /**
       * Plugin: CommonsChunkPlugin
       * Description: Shares common code between the pages.
       * It identifies common modules and put them into a commons chunk.
       *
       * See: https://webpack.github.io/docs/list-of-plugins.html#commonschunkplugin
       * See: https://github.com/webpack/docs/wiki/optimization#multi-page-app
       */
      new CommonsChunkPlugin({
        name: 'polyfills',
        chunks: ['polyfills']
      }),

      new CommonsChunkPlugin({
        minChunks: Infinity,
        name: 'inline'
      }),
      new CommonsChunkPlugin({
        name: 'main',
        async: 'common',
        children: true,
        minChunks: 2
      }),

      /**
       * Plugin: CopyWebpackPlugin
       * Description: Copy files and directories in webpack.
       * Copies project static assets.
       *
       * See: https://www.npmjs.com/package/copy-webpack-plugin
       */
      new CopyWebpackPlugin(
        [
          // TODO uncomment this when is part of Stark
          // // Stark assets
          // {
          //   from: helpers.rootStark("assets"),
          //   to: "assets"
          // },
          // // those assets are copied to the root of the target folder
          // {
          //   from: helpers.rootStark("assets-base"),
          //   to: ""
          // },

          // Mdi svg file
          {
            from: "node_modules/@nationalbankbelgium/angular-mdi-svg/mdi.svg",
            to: "assets/icons/mdi.svg"
          },

          // Application assets
          {
            from: helpers.root("assets"),
            to: "assets",
            force: "true" // overwrite files already copied from Stark
          },
          // those assets are copied to the root of the target folder
          {
            from: helpers.root("assets-base"),
            to: "",
            force: "true" // overwrite files already copied from Stark
          }
        ],
        {
          ignore: [
            "translations/*", // skip translation since they will be copied in the next round (see block below)
            "*.md",
            //See https://github.com/kevlened/copy-webpack-plugin/issues/54#issuecomment-223205388
            {
              dot: true,
              glob: ".svn/**/*"
            }
          ]

          // By default the plugin only copies modified files during
          // a watch or webpack-dev-server build
          // Setting this to true copies all files
          // copyUnmodified: true
        }
      ),

      /**
       * Plugin: CopyWebpackPlugin
       * Description: Copy files and directories in webpack.
       * Copies project static assets.
       *
       * See: https://www.npmjs.com/package/copy-webpack-plugin
       */
      new CopyWebpackPlugin(
        [
          // TODO uncomment this when is part of Stark
          // // Stark assets
          // {
          //   from: helpers.rootStark("assets/translations"),
          //   to: "assets/translations/stark"
          // },

          // Application assets
          {
            from: helpers.root("assets/translations"),
            to: "assets/translations/app"
          }
        ],
        {}
      ),

      /**
       * Plugin: WebpackSHAHash
       * Description: Generate SHA content hashes
       * See: https://www.npmjs.com/package/webpack-sha-hash
       */
      new WebpackSHAHash(),

      /**
       * Plugin: ContextReplacementPlugin
       * Description: allows to override the inferred information in a 'require' context
       * Including only a certain set of Moment locales
       *
       * See: https://webpack.js.org/plugins/context-replacement-plugin/
       */
      // TODO Change with moment-locales-webpack-plugin
      new ContextReplacementPlugin(/moment[\/\\]locale$/, /(de|fr|en-gb|nl|nl-be)\.js/),

      /**
       * Plugin: HtmlWebpackPlugin
       * Description: Simplifies creation of HTML files to serve your webpack bundles.
       * This is especially useful for webpack bundles that include a hash in the filename
       * which changes every compilation.
       *
       * See: https://github.com/ampedandwired/html-webpack-plugin
       */
      new HtmlWebpackPlugin({
        template: 'src/index.html',
        title: METADATA.title,
        chunksSortMode: function (a, b) {
          const entryPoints = ["inline", "polyfills", "sw-register", "styles", "vendor", "main"];
          return entryPoints.indexOf(a.names[0]) - entryPoints.indexOf(b.names[0]);
        },
        metadata: METADATA,
        inject: 'body',
        xhtml: true,
        minify: isProd ? {
          caseSensitive: true,
          collapseWhitespace: true,
          keepClosingSlash: true
        } : false
      }),

      /**
       * Plugin: ScriptExtHtmlWebpackPlugin
       * Description: Enhances html-webpack-plugin functionality
       * with different deployment options for your scripts including:
       *
       * See: https://github.com/numical/script-ext-html-webpack-plugin
       */
      // TODO evaluate this
      // new ScriptExtHtmlWebpackPlugin({
      //   sync: /inline|polyfills|vendor/,
      //   defaultAttribute: 'async',
      //   preload: [/polyfills|vendor|main/],
      //   prefetch: [/chunk/]
      // }),

      /**
       * Plugin: HtmlElementsPlugin
       * Description: Generate html tags based on javascript maps.
       *
       * If a publicPath is set in the webpack output configuration, it will be automatically added to
       * href attributes, you can disable that by adding a "=href": false property.
       * You can also enable it to other attribute by settings "=attName": true.
       *
       * The configuration supplied is map between a location (key) and an element definition object (value)
       * The location (key) is then exported to the template under then htmlElements property in webpack configuration.
       *
       * Example:
       *  Adding this plugin configuration
       *  new HtmlElementsPlugin({
       *    headTags: { ... }
       *  })
       *
       *  Means we can use it in the template like this:
       *  <%= webpackConfig.htmlElements.headTags %>
       *
       * Dependencies: HtmlWebpackPlugin
       */
      // TODO implement this
      // new HtmlElementsPlugin({
      //   headTags: require('./head-config.common')
      // }),

      new AngularCompilerPlugin({
        mainPath: entry.main,
        platform: 0,  // 0 = browser, 1 = server
        // entryModule: 'path/to/app.module#AppModule', // TODO not used, probably already defined in the main.browser.ts?
        hostReplacementPaths: {
          [helpers.root('src/environments/environment.ts')]: environment
        },
        sourceMap: true, // TODO: apply based on tsConfig value?
        tsConfigPath: METADATA.tsConfigPath,
        skipCodeGeneration: !METADATA.AOT,
        compilerOptions: {
          module: !isProd && METADATA.WATCH ? 'commonjs' : 'es2015' // TODO is it needed in our case? => Force commonjs module format for TS on dev watch builds.
        }
      })

      /**
       * Plugin: InlineManifestWebpackPlugin
       * Inline Webpack's manifest.js in index.html
       *
       * https://github.com/szrenwei/inline-manifest-webpack-plugin
       */
      // TODO evaluate this
      // new InlineManifestWebpackPlugin(),
    ],

    /**
     * Include polyfills or mocks for various node stuff
     * Description: Node configuration
     *
     * See: https://webpack.js.org/configuration/node
     */
    node: {
      global: true,
      process: false,
      crypto: "empty",
      module: false,
      clearImmediate: false,
      setImmediate: false
    }

  };
}
