import { trackEvent } from '@/lib/tracking'

export function trackAnswerSubmitted({ question_id, is_correct, time_spent_sec, selected_option_index, correct_option_index, course_code }) {
  trackEvent('quiz_answer_submitted', { question_id, is_correct, time_spent_sec, selected_option_index, correct_option_index, course_code })
}

export function trackSessionTerminated({ quiz_id, last_completed_step, total_steps }) {
  trackEvent('quiz_session_terminated', { quiz_id, last_completed_step, total_steps })
}

export function trackExplanationViewed({ question_id, duration_ms }) {
  trackEvent('explanation_viewed', { question_id, duration_ms })
}

export function trackZeroResultQuery({ query_string }) {
  trackEvent('search_executed', { query_string, results_count: 0 })
}

export function trackSpaceInteraction({ space_id, action }) {
  trackEvent('space_interaction', { space_id, action })
}

export function trackSyllabusExpand({ course_code, topic_id }) {
  trackEvent('syllabus_node_expanded', { course_code, topic_id })
}

export function trackRageClick({ target_element_selector, click_coordinates }) {
  trackEvent('ui_rage_click', { target_element_selector, click_coordinates })
}

export function trackNetworkTransaction({ endpoint_url, duration_ms, http_status }) {
  trackEvent('network_transaction_logged', { endpoint_url, duration_ms, http_status })
}

export function trackValidationFailed({ input_field_id, failed_rule_type }) {
  trackEvent('form_validation_failed', { input_field_id, failed_rule_type })
}

export function trackTextCopied({ view_context, copied_text_length }) {
  trackEvent('text_clipboard_copied', { view_context, copied_text_length })
}

export function trackRuntimeError({ error_message, stack_trace, active_view }) {
  trackEvent('runtime_error_caught', { error_message, stack_trace, active_view })
}
