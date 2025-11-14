
import path from 'path';
import { fileURLToPath } from 'url';

import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: {
        background: {
            import: './src/background.ts',
            chunkLoading: `import-scripts`,
        },
        window: './src/window.ts',
        content: './src/content.ts',
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    resolveLoader: {
        alias: {
            'ts-loader': 'ts-loader'
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true,
                        compilerOptions: {
                            isolatedModules: true
                        }
                    }
                },
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/window.html',
            filename: 'window.html',
            chunks: ['window'],
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: "public",
                    to: "." // Copies to build folder
                },
                {
                    from: "src/window.css",
                    to: "window.css"
                }
            ],
        })
    ],
};

export default config;
