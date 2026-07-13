const TELEMETRY_URL = '/api/telemetry'

function send(event, payload) {
  if (typeof window === 'undefined') return
  try {
    fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload }),
    }).catch(() => {})
  } catch {}
}

function sendBeacon(event, payload) {
  if (typeof window === 'undefined' || !navigator.sendBeacon) return
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

export function trackZeroResultQuery({ query_string }) {
  send('search_executed', { query_string, results_count: 0 })
}

export function trackSpaceInteraction({ space_id, action }) {
  send('space_interaction', { space_id, action })
}

export function trackSyllabusExpand({ course_code, topic_id }) {
  send('syllabus_node_expanded', { course_code, topic_id })
}

export function trackRageClick({ target_element_selector, click_coordinates }) {
  send('ui_rage_click', { target_element_selector, click_coordinates })
}

export function trackNetworkTransaction({ endpoint_url, duration_ms, http_status }) {
  send('network_transaction_logged', { endpoint_url, duration_ms, http_status })
}

export function trackValidationFailed({ input_field_id, failed_rule_type }) {
  send('form_validation_failed', { input_field_id, failed_rule_type })
}

export function trackTextCopied({ view_context, copied_text_length }) {
  send('text_clipboard_copied', { view_context, copied_text_length })
}

export function trackRuntimeError({ error_message, stack_trace, active_view }) {
  send('runtime_error_caught', { error_message, stack_trace, active_view })
}
