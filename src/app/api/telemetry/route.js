import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function POST(request) {
  try {
    const body = await request.json()
    const { event, payload } = body

    if (!event || !payload) {
      return NextResponse.json({ error: 'event and payload required' }, { status: 400 })
    }

    const col = await getCollection('telemetry')
    await col.insertOne({
      event,
      payload,
      createdAt: new Date(),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const col = await getCollection('telemetry')

    // ── 1. Question Friction Index ──
    const frictionData = await col.aggregate([
      { $match: { event: 'quiz_answer_submitted' } },
      {
        $group: {
          _id: '$payload.question_id',
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$payload.is_correct', 1, 0] } },
          avgTime: { $avg: '$payload.time_spent_sec' },
        },
      },
      {
        $project: {
          question_id: '$_id',
          totalAttempts: '$total',
          correctRate: { $round: [{ $divide: ['$correct', '$total'] }, 2] },
          avgTimeSec: { $round: ['$avgTime', 1] },
          frictionIndex: {
            $round: [
              {
                $multiply: [
                  { $divide: [90, { $min: ['$avgTime', 90] }] },
                  { $subtract: [1, { $divide: ['$correct', '$total'] }] },
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { frictionIndex: -1 } },
      { $limit: 50 },
    ]).toArray()

    // ── 2. Quiz Exhaustion Point ──
    const exhaustionData = await col.aggregate([
      { $match: { event: 'quiz_session_terminated' } },
      {
        $group: {
          _id: '$payload.quiz_id',
          lastStep: { $avg: '$payload.last_completed_step' },
          totalSteps: { $first: '$payload.total_steps' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          quiz_id: '$_id',
          avgLastStep: { $round: ['$lastStep', 0] },
          totalSteps: 1,
          dropoutRate: {
            $round: [
              {
                $subtract: [
                  1,
                  { $divide: [{ $avg: '$lastStep' }, '$totalSteps'] },
                ],
              },
              2,
            ],
          },
          sessions: '$count',
        },
      },
      { $sort: { dropoutRate: -1 } },
      { $limit: 50 },
    ]).toArray()

    // ── 3. Option Distractor Efficiency ──
    const distractorData = await col.aggregate([
      { $match: { event: 'quiz_answer_submitted' } },
      {
        $group: {
          _id: { question_id: '$payload.question_id', option: '$payload.selected_option_index' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.question_id': 1, count: -1 } },
    ]).toArray()

    // Group by question for display
    const distractorMap = {}
    for (const d of distractorData) {
      const qid = d._id.question_id
      if (!distractorMap[qid]) distractorMap[qid] = { question_id: qid, options: [] }
      distractorMap[qid].options.push({ index: d._id.option, count: d.count })
    }

    // ── 4. Explanation Engagement ──
    const engagementData = await col.aggregate([
      { $match: { event: 'explanation_viewed' } },
      {
        $group: {
          _id: '$payload.question_id',
          avgDurationMs: { $avg: '$payload.duration_ms' },
          views: { $sum: 1 },
        },
      },
      {
        $project: {
          question_id: '$_id',
          avgDurationSec: { $round: [{ $divide: ['$avgDurationMs', 1000] }, 1] },
          views: 1,
        },
      },
      { $sort: { avgDurationSec: -1 } },
      { $limit: 50 },
    ]).toArray()

    // ── 5. Zero-Result Queries ──
    const zeroResultData = await col.aggregate([
      { $match: { event: 'search_executed' } },
      { $group: { _id: '$payload.query_string', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]).toArray()

    // ── 6. Space Conversion Velocity ──
    const spaceData = await col.aggregate([
      { $match: { event: 'space_interaction' } },
      {
        $group: {
          _id: { space_id: '$payload.space_id', action: '$payload.action' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.space_id': 1 } },
    ]).toArray()

    const spaceMap = {}
    for (const d of spaceData) {
      const sid = d._id.space_id
      if (!spaceMap[sid]) spaceMap[sid] = { space_id: sid, impressions: 0, joins: 0 }
      if (d._id.action === 'impression') spaceMap[sid].impressions = d.count
      if (d._id.action === 'joined') spaceMap[sid].joins = d.count
    }
    const spaceConversion = Object.values(spaceMap).map((s) => ({
      ...s,
      conversionRate: s.impressions > 0 ? Math.round((s.joins / s.impressions) * 100) : 0,
    }))

    // ── 7. Syllabus Deep-Dive Ratio ──
    const syllabusData = await col.aggregate([
      { $match: { event: 'syllabus_node_expanded' } },
      {
        $group: {
          _id: { course_code: '$payload.course_code', topic_id: '$payload.topic_id' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.course_code': 1, count: -1 } },
    ]).toArray()

    const syllabusMap = {}
    for (const d of syllabusData) {
      const cc = d._id.course_code
      if (!syllabusMap[cc]) syllabusMap[cc] = { course_code: cc, nodes: [], totalExpands: 0 }
      syllabusMap[cc].nodes.push({ topic_id: d._id.topic_id, count: d.count })
      syllabusMap[cc].totalExpands += d.count
    }
    const syllabusDeepDive = Object.values(syllabusMap).map((s) => ({
      ...s,
      avgPerNode: s.nodes.length > 0 ? Math.round(s.totalExpands / s.nodes.length) : 0,
    }))

    // ── 8. Rage Clicks ──
    const rageClickData = await col.aggregate([
      { $match: { event: 'ui_rage_click' } },
      {
        $group: {
          _id: '$payload.target_element_selector',
          count: { $sum: 1 },
          coords: { $last: '$payload.click_coordinates' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]).toArray()

    // ── 9. API Roundtrip Latency ──
    const networkData = await col.aggregate([
      { $match: { event: 'network_transaction_logged' } },
      {
        $group: {
          _id: '$payload.endpoint_url',
          count: { $sum: 1 },
          avgDurationMs: { $avg: '$payload.duration_ms' },
          maxDurationMs: { $max: '$payload.duration_ms' },
          statuses: { $addToSet: '$payload.http_status' },
        },
      },
      {
        $project: {
          endpoint_url: '$_id',
          count: 1,
          avgDurationMs: { $round: ['$avgDurationMs', 0] },
          maxDurationMs: 1,
          statuses: 1,
        },
      },
      { $sort: { avgDurationMs: -1 } },
      { $limit: 20 },
    ]).toArray()

    // ── 10. Validation Rejection Rate ──
    const validationData = await col.aggregate([
      { $match: { event: 'form_validation_failed' } },
      {
        $group: {
          _id: { field: '$payload.input_field_id', rule: '$payload.failed_rule_type' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]).toArray()

    // ── 11. Context Extraction (Copying) ──
    const copyData = await col.aggregate([
      { $match: { event: 'text_clipboard_copied' } },
      {
        $group: {
          _id: '$payload.view_context',
          count: { $sum: 1 },
          avgLength: { $avg: '$payload.copied_text_length' },
          maxLength: { $max: '$payload.copied_text_length' },
        },
      },
      {
        $project: {
          view_context: '$_id',
          count: 1,
          avgLength: { $round: ['$avgLength', 0] },
          maxLength: 1,
        },
      },
      { $sort: { count: -1 } },
    ]).toArray()

    // ── 12. Unhandled Runtime Crashes ──
    const crashData = await col.aggregate([
      { $match: { event: 'runtime_error_caught' } },
      {
        $group: {
          _id: '$payload.error_message',
          count: { $sum: 1 },
          stack: { $last: '$payload.stack_trace' },
          activeView: { $last: '$payload.active_view' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]).toArray()

    return NextResponse.json({
      friction: frictionData,
      exhaustion: exhaustionData,
      distractors: Object.values(distractorMap),
      engagement: engagementData,
      zeroResultQueries: zeroResultData,
      spaceConversion,
      syllabusDeepDive,
      rageClicks: rageClickData,
      networkLatency: networkData,
      validationFailures: validationData,
      textCopying: copyData,
      runtimeCrashes: crashData,
    })
  } catch (error) {
    console.error('Telemetry GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
