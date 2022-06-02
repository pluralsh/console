const fs = require('fs')
const path = require('path')

const { ESLint } = require('eslint')

const makeFile = svg => `import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  ${svg}))

`

async function main() {
  const inputPath = path.resolve(__dirname, './input.txt')
  const rawInput = fs.readFileSync(inputPath, 'utf8')
  const inputArray = rawInput.split('@@@')
  const eslint = new ESLint({ fix: true, baseConfig: { extends: 'pluralsh' } })

  for (const input of inputArray) {
    const lines = input.split('\n')
    lines.shift()
    const name = lines.shift()

    console.log(`${name}Icon`)

    const svg = lines.join('\n')
    const fileContent = makeFile(svg)

    const results = await eslint.lintText(fileContent)

    if (!results[0].output) {
      console.log(results[0])

      throw new Error('No output')
    }

    const result = results[0].output
      .replace('width="16"', 'width={size}')
      .replace('height="16"\n    ', '')
      // .replace('"\n  >', '"\n    {...props}\n  >')
      .replace(/stroke="#C4CAD4"/g, 'stroke={color}')
      .replace(/fill="#C4CAD4"/g, 'fill={color}')

    const outputPath = path.resolve(__dirname, `../src/components/icons/${name}Icon.jsx`)

    fs.writeFileSync(outputPath, result, 'utf8')
  }

  console.log('Done!')
}

main()
