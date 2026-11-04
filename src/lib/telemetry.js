// Thin shippers to /api/telemetry (fire-and-forget, session-muted on failure).
// Deliberately small: only events that answer a product question survive.
// Removed: heartbeats, nav clicks, refresh/PWA dupes, validation/network/
// clipboard/space/syllabus noise — page_view + errors cover the rest.
const TELEMETRY_URL = '/api/telemetry'

function send(event, payload) {
  try {
    fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload }),
    }).catch(() => {})
  } catch {}
}

function sendBeacon(event, payload) {
  try {
    const blob = new Blob([JSON.stringify({ event, payload })], { type: 'application/json' })
    navigator.sendBeacon(TELEMETRY_URL, blob)
  } catch {}
}

export function trackAnswerSubmitted({ question_id, is_correct, time_spent_sec, selected_option_index, correct_option_index, course_code }) {
  send('quiz_answer_submitted', { question_id, is_correct, time_spent_sec, selected_option_index, correct_option_index, course_code })
}

export function trackSessionTerminated({ quiz_id, last_completed_step, total_steps }) {
  sendBeacon('quiz_session_terminated', { quiz_id, last_completed_step, total_steps })
}

export function trackExplanationViewed({ question_id, duration_ms }) {
  send('explanation_viewed', { question_id, duration_ms })
}

// Every completed search (not just dead ends): what people want + gaps.
export function trackSearch({ query_string, results_count, tab }) {
  send('search_executed', { query_string, results_count, tab: tab || 'all' })
}

export function trackRageClick({ target_element_selector, click_coordinates }) {
  send('ui_rage_click', { target_element_selector, click_coordinates })
}

export function trackRuntimeError({ error_message, stack_trace, active_view }) {
  send('runtime_error_caught', { error_message, stack_trace, active_view })
}
