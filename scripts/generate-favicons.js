const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const svgBuffer = fs.readFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'))

const sizes = [16, 32, 48, 192, 512]
const outputDir = path.join(__dirname, '..', 'public')

async function main() {
  for (const size of sizes) {
    const name = size <= 48 ? `favicon-${size}x${size}.png` : `android-chrome-${size}x${size}.png`
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, name))
    console.log(`Created ${name}`)
  }

  // apple-touch-icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'))
  console.log('Created apple-touch-icon.png')

  // For favicon.ico, create a 32x32 PNG (browsers accept PNG as .ico on modern sites)
  // Chrome/Firefox parse .ico as PNG if it's a valid PNG
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(outputDir, 'favicon.ico'))
  console.log('Created favicon.ico (PNG-based)')
}

main().catch(console.error)
