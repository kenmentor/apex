import { NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth-server'
import cloudinary from 'cloudinary'

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await request.formData()
    const file = form.get('file')
    const folder = form.get('folder') || 'gss-quiz/uploads'
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const mime = file.type || ''

    let resourceType = 'image'
    let options = { folder, width: 800, height: 800, crop: 'limit' }

    if (mime.startsWith('video/')) {
      resourceType = 'video'
      options = { folder, resource_type: 'video', transformation: [{ width: 1280, height: 720, crop: 'limit' }] }
    } else if (mime.startsWith('audio/')) {
      resourceType = 'video'
      options = { folder, resource_type: 'video' }
    } else if (mime === 'application/pdf' || file.name?.endsWith('.pdf')) {
      resourceType = 'raw'
      options = { folder, resource_type: 'raw' }
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        options,
        (err, res) => err ? reject(err) : resolve(res)
      )
      stream.end(buffer)
    })

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id, type: resourceType })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
