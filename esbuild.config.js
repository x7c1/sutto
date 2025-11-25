const esbuild = require('esbuild');
const fs = require('fs');

// Determine build mode from environment variable
const isDev = process.env.BUILD_MODE !== 'release';
const buildMode = isDev ? 'development' : 'release';

console.log(`Building in ${buildMode} mode...`);

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
    // Replace __DEV__ constant at build time
    define: {
        '__DEV__': JSON.stringify(isDev),
    },
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
