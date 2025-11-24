const esbuild = require('esbuild');
const fs = require('fs');

// Build configuration
const buildConfig = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    platform: 'neutral', // Don't assume Node.js or browser
    target: 'es2020',
    format: 'cjs', // CommonJS for GNOME Shell
    treeShaking: false, // Disable tree-shaking to keep all code
    banner: {
        js: '// GNOME Shell Extension - Bundled with esbuild',
    },
    logLevel: 'info',
};

async function build() {
    try {
        // Ensure dist directory exists
        if (!fs.existsSync('dist')) {
            fs.mkdirSync('dist', { recursive: true });
        }

        // Build with esbuild
        await esbuild.build(buildConfig);

        // Copy metadata.json to dist if it doesn't exist
        const metadataSource = 'dist/metadata.json';
        if (!fs.existsSync(metadataSource)) {
            console.log('Note: metadata.json should be in dist/ directory');
        }

        console.log('✓ Build complete!');
    } catch (error) {
        console.error('✗ Build failed:', error);
        process.exit(1);
    }
}

build();
