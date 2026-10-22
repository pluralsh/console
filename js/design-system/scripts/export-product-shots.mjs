import { spawn, spawnSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'product-shot-exports')
const scenarios = [
  'environment-hygiene',
  'backlog-execution',
  'cost-analysis',
  'incident-response',
]
const themes = ['light', 'dark']
const story = 'product-shots-gallery--environment-hygiene'

await rm(output, { force: true, recursive: true })
await mkdir(resolve(output, 'images'), { recursive: true })

const build = spawnSync('yarn', ['build:storybook'], { cwd: root, stdio: 'inherit' })
if (build.status) process.exit(build.status)

const server = spawn('yarn', ['http-server', 'storybook-static', '-p', '6106', '-c-1'], {
  cwd: root,
  stdio: 'ignore',
})

try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:6106/iframe.html')
      if (response.ok) break
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 2 })
  const manifest = []

  for (const scenario of scenarios) {
    for (let step = 0; step < 4; step += 1) {
      for (const theme of themes) {
        const args = `scenario:${scenario};step:${step};theme:${theme};animate:false`
        await page.goto(`http://127.0.0.1:6106/iframe.html?id=${story}&args=${args}`, {
          waitUntil: 'networkidle',
        })
        const shot = page.locator('[data-product-shot]')
        await shot.waitFor()
        await page.evaluate(() => document.fonts.ready)
        const fidelity = await shot.getAttribute('data-fidelity')
        const file = `images/${scenario}-${step + 1}-${theme}.webp`
        await shot.screenshot({ path: resolve(output, file), type: 'webp', omitBackground: true })
        manifest.push({ id: scenario, step, fidelity, theme, file })
      }
    }
  }

  await browser.close()
  await writeFile(resolve(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(
    resolve(output, 'embed.js'),
    `(()=>{const q=new URLSearchParams(location.search),id=q.get('scenario')||'environment-hygiene',theme=q.get('theme')||'light',root=document.currentScript?.parentElement||document.body,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;let step=0;root.style.cssText='margin:0;display:block;overflow:hidden;background:transparent';const img=document.createElement('img');img.alt='Plural product workflow';img.style.cssText='display:block;width:100%;height:auto;transition:opacity 240ms ease';root.append(img);const show=()=>{img.src='./images/'+id+'-'+(step+1)+'-'+theme+'.webp';img.dataset.step=String(step)};show();if(!reduce)setInterval(()=>{img.style.opacity='0';setTimeout(()=>{step=(step+1)%4;show();img.style.opacity='1'},240)},4000)})();\n`
  )
  await writeFile(
    resolve(output, 'embed.html'),
    '<!doctype html><meta name="viewport" content="width=device-width"><style>html,body{margin:0;background:transparent}</style><script src="./embed.js" defer></script>\n'
  )
} finally {
  server.kill('SIGTERM')
}
