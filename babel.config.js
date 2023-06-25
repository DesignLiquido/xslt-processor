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
    ]
};
