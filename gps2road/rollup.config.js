import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { defineConfig } from 'rollup';

const plugins = [ resolve({ 
  preferBuiltins: false,  // you need this one to avoid using node resolutions
  browser: true           // you need this to make sure node things in universal modules don't get included
}), commonjs(), json() ];

const watch = {
  buildDelay: 200, // delay build until 200 ms after last change
  include: "dist-browser/**/*.js",
  exclude: [ "dist-browser/browser/index.mjs", "dist-browser/test/browser/index.mjs" ],
};

// use defineConfig to get typings in editor:
export default defineConfig([
  {
    input: "dist-browser/browser/index.js",
    plugins,
    watch,
    output: {
      file: "dist/browser/index.mjs",
      format: "esm",
      sourcemap: true
    },
  },
  {
    input: "dist-browser/test/browser/index.js",
    plugins,
    watch,
    output: {
      file: "dist/test/browser/index.mjs",
      format: "esm",
      sourcemap: true
    }
  },

]);
