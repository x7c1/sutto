const esbuild = require('esbuild');
const fs = require('fs');
const { execSync } = require('child_process');

// Determine build mode from environment variable
const isDev = process.env.BUILD_MODE !== 'release';
const buildMode = isDev ? 'development' : 'release';

console.log(`Building in ${buildMode} mode...`);

async function build() {
    try {
        // Ensure dist directory exists
        if (!fs.existsSync('dist')) {
            fs.mkdirSync('dist', { recursive: true });
        }

        // Build extension.js (GNOME Shell runtime)
        await esbuild.build({
            entryPoints: ['src/extension.ts'],
            bundle: true,
            outfile: 'dist/extension.js',
            platform: 'neutral',
            target: 'es2020',
            format: 'cjs',
            treeShaking: false,
            banner: {
                js: '// GNOME Shell Extension - Bundled with esbuild',
            },
            logLevel: 'info',
            define: {
                '__DEV__': JSON.stringify(isDev),
            },
        });

        // Build prefs.js (GTK4 preferences window)
        await esbuild.build({
            entryPoints: ['src/prefs.ts'],
            bundle: true,
            outfile: 'dist/prefs.js',
            platform: 'neutral',
            target: 'es2020',
            format: 'cjs',
            treeShaking: false,
            banner: {
                js: '// GNOME Shell Extension Preferences - Bundled with esbuild',
            },
            logLevel: 'info',
        });

        // Compile GSettings schema if it exists
        const schemaPath = 'dist/schemas/org.gnome.shell.extensions.snappa.gschema.xml';
        if (fs.existsSync(schemaPath)) {
            console.log('Compiling GSettings schema...');
            try {
                execSync('glib-compile-schemas dist/schemas/', { stdio: 'inherit' });
                console.log('✓ Schema compiled successfully!');
            } catch (error) {
                console.error('✗ Schema compilation failed:', error.message);
            }
        }

        // Check metadata.json exists
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
