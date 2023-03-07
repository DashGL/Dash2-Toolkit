import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from "path";

export default defineConfig({
	base : '/Tool-MML2SaveStateViewer/',
	resolve: {
		alias: [
			{ find: "@", replacement: path.resolve(__dirname, "src") }
		],
  	},
	build: {
		outDir: 'docs'
	}
})
