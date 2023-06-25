module.exports = {
    presets: [
        [
            '@babel/preset-react',
            {
                pragma: 'dom',
                throwIfNamespace: false
            }
        ],
        '@babel/preset-env',
        '@babel/preset-typescript'
    ],
    plugins: [
        // "@babel/plugin-transform-react-jsx",
        // "@babel/plugin-transform-typescript"
    ]
};
