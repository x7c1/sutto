import esbuild from 'esbuild';
import fs from 'fs';
import { execSync } from 'child_process';

// Determine build mode from environment variable
const isDev = process.env.BUILD_MODE !== 'release';
const buildMode = isDev ? 'development' : 'release';

// License API URLs from environment variables (required)
const licenseApiBaseUrl = process.env.LICENSE_API_BASE_URL;
const licensePurchaseUrl = process.env.LICENSE_PURCHASE_URL;

if (!licenseApiBaseUrl) {
    console.error('✗ Build failed: LICENSE_API_BASE_URL environment variable is required');
    process.exit(1);
}
if (!licensePurchaseUrl) {
    console.error('✗ Build failed: LICENSE_PURCHASE_URL environment variable is required');
    process.exit(1);
}

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
            target: 'es2022',
            format: 'esm',
            treeShaking: false,
            external: ['gi://*', 'resource://*'],
            banner: {
                js: '// GNOME Shell Extension - Bundled with esbuild',
            },
            logLevel: 'info',
            define: {
                '__DEV__': JSON.stringify(isDev),
                '__LICENSE_API_BASE_URL__': JSON.stringify(licenseApiBaseUrl),
            },
        });

        // Build prefs.js (GTK4 preferences window)
        await esbuild.build({
            entryPoints: ['src/prefs.ts'],
            bundle: true,
            outfile: 'dist/prefs.js',
            platform: 'neutral',
            target: 'es2022',
            format: 'esm',
            treeShaking: false,
            external: ['gi://*', 'resource://*'],
            banner: {
                js: '// GNOME Shell Extension Preferences - Bundled with esbuild',
            },
            logLevel: 'info',
            define: {
                '__DEV__': JSON.stringify(isDev),
                '__LICENSE_API_BASE_URL__': JSON.stringify(licenseApiBaseUrl),
                '__LICENSE_PURCHASE_URL__': JSON.stringify(licensePurchaseUrl),
            },
        });

        // Compile GSettings schema if it exists
        const schemaPath = 'dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml';
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
