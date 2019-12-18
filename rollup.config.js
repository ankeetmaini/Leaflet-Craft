import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import babel from "rollup-plugin-babel";
import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import visualizer from 'rollup-plugin-visualizer';
import pkg from './package.json';
const globals = {
  react: 'React',
  'react-dom': 'ReactDOM',
  leaflet: 'L',
  'react-leaflet': 'ReactLeaflet'
}

module.exports = {
  input: "src/FreeDraw.js",
  external: dep => Object.keys(pkg.peerDependencies).includes(dep),
  output: [
    // {
    //   file: "dist/leaflet-freedraw.esm.js",
    //   format: "esm",
    //   sourcemap: true,
    //   exports: 'named',
    //   external: pkg.peerDependencies,
    //   globals
    // },
    {
      file: "dist/leaflet-freedraw.web.js",
      format: "umd",
      sourcemap: true,
      exports: 'named',
      name: 'ReactLeafletCraft',
      globals
    },
    // {
    //   file: "dist/leaflet-freedraw.iife.js",
    //   format: "iife",
    //   sourcemap: true,
    //   name: 'LeafletFreeDraw',
    //   exports: 'named',
    //   external: pkg.peerDependencies,
    //   globals
    // }
  ],
  plugins: [
    resolve({
      only: Object.keys(pkg.dependencies)
    }),
    commonjs({
      namedExports: {
        'node_modules/leaflet/dist/leaflet-src.js': [
          'DomUtil',
          'Point',
          'DivIcon',
          'Marker',
          'DomEvent',
          'Polygon',
          'LineUtil',
          'FeatureGroup',
          'Control',
          'Circle',
          'CircleMarker',
          'GeoJSON',
          'GridLayer',
          'ImageOverlay',
          'latLngBounds',
          'LayerGroup',
          'Map',
          'Polyline',
          'Popup',
          'Rectangle',
          'SVGOverlay',
          'TileLayer',
          'Tooltip',
          'VideoOverlay',
          'Layer'
        ],
        'node_modules/ramda/dist/ramda.js': ['flatten', 'compose', 'head', 'complement', 'identical'],
        'node_modules/react/index.js': [
          'createContext',
          'useContext',
          'forwardRef',
          'Component',
          'Fragment',
          'Children',
          'cloneElement'
        ],
        'node_modules/react-dom/index.js': [
          'createPortal'
        ],

      }
    }),
    postcss({
      plugins: []
    }),
    babel({
      exclude: "node_modules/**"
    }),
    // peerDepsExternal(),
    visualizer()
    // terser()
  ]
};
