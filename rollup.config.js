import { defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import glslify from 'rollup-plugin-glslify'
import typescript from 'rollup-plugin-typescript2'
import { dts } from "rollup-plugin-dts"
import terser from '@rollup/plugin-terser'
import filesize from 'rollup-plugin-filesize'

const isProd = process.env.NODE_ENV === 'production'

export default [
  defineConfig({
    input: 'src/index.ts',
    output: {
      name: 'AlphaVideoPlayerJs',
      file: 'dist/alpha-video-player-js.js',
      format: 'es',
    },
    plugins: [
      resolve(),
      glslify(),
      typescript(),
      isProd && terser(),
      filesize()
    ]
  }),
  defineConfig({
    input: 'src/index.ts',
    output: {
      name: 'AlphaVideoPlayerJs',
      file: 'dist/alpha-video-player-js.d.ts',
      format: 'es'
    },
    plugins: [
      dts(),
    ]
  })
]