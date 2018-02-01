/**
 * @author: @AngularClass
 */

const helpers = require('./helpers');
const buildUtils = require('./build-utils');
const webpackMerge = require('webpack-merge'); // used to merge webpack configs
const commonConfig = require('./webpack.common.js'); // the settings that are common to prod and dev

/**
 * Webpack Plugins
 */
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
const NamedModulesPlugin = require('webpack/lib/NamedModulesPlugin');
const EvalSourceMapDevToolPlugin = require('webpack/lib/EvalSourceMapDevToolPlugin');

// Dev custom config
const webpackCustomConfig = require(helpers.root("app-config/webpack-custom-config.dev.json"));

/**
 * Webpack configuration
 *
 * See: http://webpack.github.io/docs/configuration.html#cli
 */
module.exports = function () {
  const ENV = process.env.ENV = process.env.NODE_ENV = 'development';
  const HOST = process.env.HOST || 'localhost';
  const PORT = process.env.PORT || 3000;

  const METADATA = Object.assign({}, buildUtils.DEFAULT_METADATA, {
    HOST: HOST,
    PORT: PORT,
    ENV: ENV,
    HMR: helpers.hasProcessFlag('hot'),
    // PUBLIC: process.env.PUBLIC_DEV || HOST + ':' + PORT  // TODO check if needed/useful in our case?
  });

  // Directives to be used in CSP header
  const cspDirectives = [
    "base-uri 'self'",
    // "default-src 'self'", // FIXME: enable as soon as the issue is fixed in Angular (https://github.com/angular/angular-cli/issues/6872 )
    "child-src 'self'",
    "connect-src 'self' ws://" + METADATA.HOST + ":" + METADATA.PORT + " " + webpackCustomConfig["cspConnectSrc"], // ws://HOST:PORT" is due to Webpack
    "font-src 'self'",
    "form-action 'self' " + webpackCustomConfig["cspFormAction"],
    "frame-src 'self'",   // deprecated. Use child-src instead. Used here because child-src is not yet supported by Firefox. Remove as soon as it is fully supported
    "frame-ancestors 'none'",  // the app will not be allowed to be embedded in an iframe (roughly equivalent to X-Frame-Options: DENY)
    "img-src 'self'",
    "media-src 'self'",
    "object-src 'self'",
    "plugin-types application/pdf",  // valid mime-types for plugins invoked via <object> and <embed>
    // "script-src 'self'", // FIXME: enable as soon as the issue is fixed in Angular (https://github.com/angular/angular-cli/issues/6872 )
    // "style-src 'self' 'nonce-cef324d21ec5483c8819cc7a5e33c4a2'" // we define the same nonce value as in the style-loader
  ];

  return webpackMerge(commonConfig({ENV: ENV, metadata: METADATA}), {

    stats: {
      colors: true,
      reasons: true,
      errorDetails: true // display error details. Same as the --show-error-details flag
      // maxModules: Infinity, // examine all modules (ModuleConcatenationPlugin debugging)
      // optimizationBailout: true  // display bailout reasons (ModuleConcatenationPlugin debugging)
    },

    /**
     * Developer tool to enhance debugging
     * reference: https://webpack.js.org/configuration/devtool
     * reference: https://github.com/webpack/docs/wiki/build-performance#sourcemaps
     */
    // TODO: Replace this by EvalSourceMapDevToolPlugin
    devtool: "cheap-module-source-map", // "cheap-module-eval-source-map",

    /**
     * Tell webpack which environment the application is targeting.
     * reference: https://webpack.js.org/configuration/target/
     * reference: https://webpack.js.org/concepts/targets/
     */
    target: "web", // <== can be omitted as default is "web"

    /**
     * Options affecting the output of the compilation.
     *
     * See: http://webpack.github.io/docs/configuration.html#output
     */
    output: {

      /**
       * The output directory as absolute path (required).
       *
       * See: http://webpack.github.io/docs/configuration.html#output-path
       */
      path: helpers.root('dist'),

      /**
       * Specifies the name of each output file on disk.
       * IMPORTANT: You must not specify an absolute path here!
       *
       * See: http://webpack.github.io/docs/configuration.html#output-filename
       */
      filename: '[name].bundle.js',

      /**
       * The filename of the SourceMaps for the JavaScript files.
       * They are inside the output.path directory.
       *
       * See: http://webpack.github.io/docs/configuration.html#output-sourcemapfilename
       */
      sourceMapFilename: '[file].map',

      /** The filename of non-entry chunks as relative path
       * inside the output.path directory.
       *
       * See: http://webpack.github.io/docs/configuration.html#output-chunkfilename
       */
      chunkFilename: '[id].chunk.js',

      library: 'ac_[name]',
      libraryTarget: 'var',
    },

    module: {

      rules: [

        /**
         * Css loader support for *.css files (styles directory only)
         * Loads external css styles into the DOM, supports HMR
         *
         */
        {
          test: /\.css$/,
          use: [
            { loader: 'style-loader', options: { attrs: { nonce: 'cef324d21ec5483c8819cc7a5e33c4a2' } } },
            'css-loader'
          ],
          include: [helpers.root('src', 'styles')]
        },

        /**
         * Sass loader support for *.scss files (styles directory only)
         * Loads external sass styles into the DOM, supports HMR
         *
         */
        {
          test: /\.scss$/,
          use: [
            { loader: 'style-loader', options: { attrs: { nonce: 'cef324d21ec5483c8819cc7a5e33c4a2' } } },
            'css-loader',
            'sass-loader'
          ],
          include: [helpers.root('src', 'styles')]
        },

      ]

    },

    plugins: [
      // TODO: we should use this plugin instead of 'devtool' but providing the same options)
      // See: https://webpack.js.org/plugins/eval-source-map-dev-tool-plugin/
      // new EvalSourceMapDevToolPlugin({
      //   moduleFilenameTemplate: '[resource-path]',
      //   sourceRoot: 'webpack:///'
      // }),

      /**
       * Plugin: NamedModulesPlugin (experimental)
       * Description: Uses file names as module name.
       *
       * See: https://github.com/webpack/webpack/commit/a04ffb928365b19feb75087c63f13cadfc08e1eb
       */
      new NamedModulesPlugin(),

      /**
       * Plugin LoaderOptionsPlugin (experimental)
       *
       * See: https://gist.github.com/sokra/27b24881210b56bbaff7
       */
      new LoaderOptionsPlugin({
        debug: true,
        options: {}
      }),

      // TODO: HMR
    ],

    /**
     * Webpack Development Server configuration
     * Description: The webpack-dev-server is a little node.js Express server.
     * The server emits information about the compilation state to the client,
     * which reacts to those events.
     *
     * See: https://webpack.github.io/docs/webpack-dev-server.html
     */
    devServer: {
      port: METADATA.PORT,
      host: METADATA.HOST,
      hot: METADATA.HMR,
      inline: true,
      compress: true,
      overlay: {
        errors: false,
        warnings: false
      },
      // public: METADATA.PUBLIC, // TODO check if needed/useful in our case?

      // HTML5 History API support: no need for # in URLs
      // automatically redirect 404 errors to the index.html page
      // uses connect-history-api-fallback behind the scenes: https://github.com/bripkens/connect-history-api-fallback
      // reference: http://jaketrent.com/post/pushstate-webpack-dev-server/
      historyApiFallback: true,

      // Due to a security fix of Webpack Server, we enable this option to permit the access to the application when running on 0.0.0.0
      // reference: https://github.com/webpack/webpack-dev-server/releases/tag/v2.4.3
      disableHostCheck: true,

      // file watch configuration
      // reference: https://webpack.js.org/configuration/watch/
      watchOptions: {
        // if you're using Docker you may need this
        aggregateTimeout: 300,
        poll: 1000,
        // ignored: /node_modules/ // node_modules should also be watched for any changes in @nationalbankbelgium
      },
      // TODO: to enable this we should make Webpack to write dist files to disk
      // contentBase: helpers.root("dist"), // necessary so that all the content is available (e.g., app assets, stark assets, ...)

      /**
       * Here you can access the Express app object and add your own custom middleware to it.
       *
       * See: https://webpack.github.io/docs/webpack-dev-server.html
       */
      setup: function (app) {
        // For example, to define custom handlers for some paths:
        // app.get('/some/path', function(req, res) {
        //   res.json({ custom: 'response' });
        // });
      },

      // Can be used to add specific headers
      headers: {
        // enable CORS
        "Access-Control-Allow-Origin": "*",

        // TODO: enable CSP
        // CSP header (and its variants per browser)
        "Content-Security-Policy": cspDirectives.join(" ; "),
        "X-Content-Security-Policy": cspDirectives.join(" ; "),
        "X-WebKit-CSP": cspDirectives.join(" ; "),

        // Other security headers

        // protect against clickjacking: https://en.wikipedia.org/wiki/Clickjacking
        // reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/X-Frame-Options
        "X-Frame-Options": "deny",

        // enable some protection against XSS
        // reference: https://www.owasp.org/index.php/List_of_useful_HTTP_headers
        "X-Xss-Protection": "1; mode=block",

        // protect against drive-by download attacks and user uploaded content that could be treated by Internet Explorer as executable or dynamic HTML files
        // reference: https://www.owasp.org/index.php/List_of_useful_HTTP_headers
        "X-Content-Type-Options": "nosniff"
      }
    }

  });
}
