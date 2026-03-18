/**
 * Upload letter template HTML to Lob.
 *
 * Usage:
 *   npx tsx scripts/upload-lob-template.ts
 *
 * Requires LOB_API_KEY in .env.local or environment.
 * Outputs the template ID (tmpl_XXXXX) to save as LOB_TEMPLATE_ID.
 */

import fs from 'fs'
import path from 'path'

const LOB_API_KEY = process.env.LOB_API_KEY
if (!LOB_API_KEY) {
  console.error('Missing LOB_API_KEY environment variable')
  process.exit(1)
}

async function uploadTemplate() {
  const templatePath = path.join(__dirname, '..', 'spec', 'lob-letter-template.html')

  if (!fs.existsSync(templatePath)) {
    console.error(`Template file not found: ${templatePath}`)
    process.exit(1)
  }

  const html = fs.readFileSync(templatePath, 'utf-8')
  const auth = Buffer.from(LOB_API_KEY + ':').toString('base64')

  console.log('Uploading template to Lob...')

  const res = await fetch('https://api.lob.com/v1/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      description: 'Magic Buyer Letter — Main Template',
      html,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error(`Lob API error ${res.status}:`, error)
    process.exit(1)
  }

  const data = await res.json()
  console.log(`\nTemplate created successfully!`)
  console.log(`Template ID: ${data.id}`)
  console.log(`\nAdd to your .env.local:`)
  console.log(`LOB_TEMPLATE_ID=${data.id}`)
}

uploadTemplate().catch(err => {
  console.error('Failed to upload template:', err)
  process.exit(1)
})
