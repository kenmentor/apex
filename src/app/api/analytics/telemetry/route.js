import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET() {
  try {
    const col = await getCollection('analytics')

    // ── 1. Question Friction Index ──
    const frictionData = await col.aggregate([
      { $match: { event: 'quiz_answer_submitted' } },
      {
        $group: {
          _id: '$data.question_id',
          total: { $sum: 1 },
          correct: { $sum: { $cond: ['$data.is_correct', 1, 0] } },
          avgTime: { $avg: '$data.time_spent_sec' },
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
          _id: '$data.quiz_id',
          lastStep: { $avg: '$data.last_completed_step' },
          totalSteps: { $first: '$data.total_steps' },
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
          _id: { question_id: '$data.question_id', option: '$data.selected_option_index' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.question_id': 1, count: -1 } },
    ]).toArray()

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
          _id: '$data.question_id',
          avgDurationMs: { $avg: '$data.duration_ms' },
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
      { $group: { _id: '$data.query_string', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]).toArray()

    // ── 6. Space Conversion Velocity ──
    const spaceData = await col.aggregate([
      { $match: { event: 'space_interaction' } },
      {
        $group: {
          _id: { space_id: '$data.space_id', action: '$data.action' },
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
          _id: { course_code: '$data.course_code', topic_id: '$data.topic_id' },
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
          _id: '$data.target_element_selector',
          count: { $sum: 1 },
          coords: { $last: '$data.click_coordinates' },
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
          _id: '$data.endpoint_url',
          count: { $sum: 1 },
          avgDurationMs: { $avg: '$data.duration_ms' },
          maxDurationMs: { $max: '$data.duration_ms' },
          statuses: { $addToSet: '$data.http_status' },
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
          _id: { field: '$data.input_field_id', rule: '$data.failed_rule_type' },
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
          _id: '$data.view_context',
          count: { $sum: 1 },
          avgLength: { $avg: '$data.copied_text_length' },
          maxLength: { $max: '$data.copied_text_length' },
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
          _id: '$data.error_message',
          count: { $sum: 1 },
          stack: { $last: '$data.stack_trace' },
          activeView: { $last: '$data.active_view' },
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
