const icongen = require('icon-gen');
const path = require('path');
const fs = require('fs');

async function generateIcons() {
    const inputSvg = path.join(__dirname, 'build', 'icon-1024.svg');
    const outputDir = path.join(__dirname, 'build');

    console.log('🎨 Generating app icons...');

    try {
        // Generate ICO for Windows
        console.log('📱 Generating Windows ICO...');
        await icongen(inputSvg, outputDir, {
            ico: {
                sizes: [16, 24, 32, 48, 64, 128, 256],
                name: 'icon',
            },
        });

        // Generate ICNS for macOS
        console.log('🍎 Generating macOS ICNS...');
        await icongen(inputSvg, outputDir, {
            icns: {
                sizes: [16, 32, 64, 128, 256, 512, 1024],
                name: 'icon',
            },
        });

        // Generate PNG for Linux
        console.log('🐧 Generating Linux PNG...');
        await icongen(inputSvg, outputDir, {
            png: {
                sizes: [16, 24, 32, 48, 64, 96, 128, 256, 512],
                name: 'icon',
            },
        });

        console.log('✅ Icons generated successfully!');
        console.log('📁 Files created:');
        console.log('   - build/icon.ico (Windows)');
        console.log('   - build/icon.icns (macOS)');
        console.log('   - build/icon.png (Linux)');
        console.log('');
        console.log('🚀 Now you can build your app with custom icons!');
        console.log('   npm run build:win');
        console.log('   npm run build:mac');
        console.log('   npm run build:linux');
    } catch (error) {
        console.error('❌ Error generating icons:', error);
        console.log('');
        console.log('📌 Alternative: Use an online converter:');
        console.log(
            '1. Convert build/icon-1024.svg to PNG at https://convertio.co/svg-png/'
        );
        console.log(
            '2. Use https://icoconvert.com/ to create ICO and ICNS files'
        );
        console.log('3. Save files as:');
        console.log('   - build/icon.ico');
        console.log('   - build/icon.icns');
        console.log('   - build/icon.png');
    }
}

generateIcons();
