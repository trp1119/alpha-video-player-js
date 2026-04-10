import { defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import glslify from 'rollup-plugin-glslify'
import typescript from 'rollup-plugin-typescript2'
import { dts } from "rollup-plugin-dts"
import terser from '@rollup/plugin-terser'
import filesize from 'rollup-plugin-filesize'
import alias from '@rollup/plugin-alias'

const isProd = process.env.NODE_ENV === 'production'

const corePlugins = [
  resolve(),
  glslify(),
  typescript(),
  isProd && terser(),
  filesize()
]

const frameworkEntries = [
  {
    name: 'vue3',
    input: 'src/vue3.ts',
    external: ['vue'],
    plugins: corePlugins,
  },
  {
    name: 'vue2',
    input: 'src/vue2.ts',
    external: ['vue2', 'vue'],
    plugins: [
      alias({ entries: [{ find: 'vue2', replacement: 'vue' }] }),
      ...corePlugins,
    ],
    output: {
      globals: { vue: 'Vue' },
      paths: { vue2: 'vue' },
    },
  },
  {
    name: 'react',
    input: 'src/react.ts',
    external: ['react', 'react-dom'],
    plugins: corePlugins,
  },
]

export default [
  // 核心 JS
  defineConfig({
    input: 'src/index.ts',
    output: {
      name: 'AlphaVideoPlayerJs',
      file: 'dist/alpha-video-player-js.js',
      format: 'es',
    },
    plugins: corePlugins,
  }),
  // 核心 d.ts
  defineConfig({
    input: 'src/index.ts',
    output: {
      name: 'AlphaVideoPlayerJs',
      file: 'dist/alpha-video-player-js.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  }),
  // 框架组件 JS
  ...frameworkEntries.map(entry =>
    defineConfig({
      input: entry.input,
      external: entry.external,
      output: {
        file: `dist/${entry.name}.js`,
        format: 'es',
        ...entry.output,
      },
      plugins: entry.plugins,
    })
  ),
  // 框架组件 d.ts
  ...frameworkEntries.map(entry =>
    defineConfig({
      input: entry.input,
      external: entry.external,
      output: {
        file: `dist/${entry.name}.d.ts`,
        format: 'es',
      },
      plugins: [
        ...(entry.name === 'vue2'
          ? [alias({ entries: [{ find: 'vue2', replacement: 'vue' }] })]
          : []),
        dts(),
      ],
    })
  ),
]
