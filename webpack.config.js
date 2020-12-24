const path = require('path');

module.exports = {
	target: 'electron-main', 
	entry: {
		'react': './app/src/components/app.jsx'
	},
	output: {
    	path: path.resolve(__dirname, 'app', 'dist'),
    	filename: '[name].bundle.js'
  	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/, 
				use: {
					loader: "babel-loader",
					options: {
						presets: ['@babel/preset-env', "@babel/preset-react"]
					}
				}
			}
		]
	}
}