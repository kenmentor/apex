import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:agentwithme@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function sendPushNotification(subscription, title, body, url) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url }))
    return true
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return false
    }
    console.error('Push send error:', err)
    return false
  }
}

export async function sendToUser(email, title, body, url, getCollection) {
  try {
    const subsCol = await getCollection('push_subscriptions')
    const subs = await subsCol.find({ userEmail: email }).toArray()
    const invalid = []
    for (const sub of subs) {
      const ok = await sendPushNotification(sub.subscription, title, body, url)
      if (!ok) invalid.push(sub._id)
    }
    if (invalid.length > 0) {
      await subsCol.deleteMany({ _id: { $in: invalid } })
    }
    return true
  } catch (err) {
    console.error('sendToUser error:', err)
    return false
  }
}

export async function sendToAll(title, body, url, getCollection) {
  try {
    const subsCol = await getCollection('push_subscriptions')
    const subs = await subsCol.find({}).toArray()
    const invalid = []
    for (const sub of subs) {
      const ok = await sendPushNotification(sub.subscription, title, body, url)
      if (!ok) invalid.push(sub._id)
    }
    if (invalid.length > 0) {
      await subsCol.deleteMany({ _id: { $in: invalid } })
    }
    return true
  } catch (err) {
    console.error('sendToAll error:', err)
    return false
  }
}
