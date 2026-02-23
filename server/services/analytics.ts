import { query } from './database.js';
import { logger } from './logger.js';

export interface AnalyticsEvent {
  session_id: string;
  user_id?: string | null;
  event_type: string;
  event_name: string;
  properties?: Record<string, unknown> | null;
  page_url?: string | null;
  referrer?: string | null;
  cf_country?: string | null;
  cf_region?: string | null;
  timestamp?: Date | string;
  duration_ms?: number | null;
}

export interface ApiRequestLog {
  method: string;
  endpoint: string;
  user_id?: string | null;
  status_code: number;
  response_time_ms: number;
  cf_country?: string | null;
  cf_ray_id?: string | null;
}

/**
 * Log a single analytics event. Never throws — errors are logged and swallowed.
 */
export async function logEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await query(
      `INSERT INTO analytics_events
        (session_id, user_id, event_type, event_name, properties, page_url, referrer, cf_country, cf_region, timestamp, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        event.session_id,
        event.user_id || null,
        event.event_type,
        event.event_name,
        event.properties ? JSON.stringify(event.properties) : null,
        event.page_url || null,
        event.referrer || null,
        event.cf_country || null,
        event.cf_region || null,
        event.timestamp ? new Date(event.timestamp as string) : new Date(),
        event.duration_ms ?? null,
      ]
    );
  } catch (err) {
    logger.error('Analytics logEvent failed:', err);
  }
}

/**
 * Log a batch of analytics events via multi-row INSERT.
 * No transaction — analytics is append-only, partial success is fine.
 */
export async function logEventBatch(events: AnalyticsEvent[]): Promise<number> {
  if (events.length === 0) return 0;

  let logged = 0;
  // Build multi-row INSERT
  const values: unknown[] = [];
  const rows: string[] = [];

  for (const event of events) {
    const offset = values.length;
    rows.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
    );
    values.push(
      event.session_id,
      event.user_id || null,
      event.event_type,
      event.event_name,
      event.properties ? JSON.stringify(event.properties) : null,
      event.page_url || null,
      event.referrer || null,
      event.cf_country || null,
      event.cf_region || null,
      event.timestamp ? new Date(event.timestamp as string) : new Date(),
      event.duration_ms ?? null,
    );
  }

  try {
    const result = await query(
      `INSERT INTO analytics_events
        (session_id, user_id, event_type, event_name, properties, page_url, referrer, cf_country, cf_region, timestamp, duration_ms)
       VALUES ${rows.join(', ')}`,
      values
    );
    logged = result.rowCount ?? events.length;
    logger.debug(`Analytics: logged ${logged} events`);
  } catch (err) {
    logger.error('Analytics logEventBatch failed:', err);
  }

  return logged;
}

/**
 * Log an API request. Never throws.
 */
export async function logApiRequest(log: ApiRequestLog): Promise<void> {
  try {
    await query(
      `INSERT INTO api_request_log
        (method, endpoint, user_id, status_code, response_time_ms, cf_country, cf_ray_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        log.method,
        log.endpoint,
        log.user_id || null,
        log.status_code,
        log.response_time_ms,
        log.cf_country || null,
        log.cf_ray_id || null,
      ]
    );
  } catch (err) {
    logger.error('Analytics logApiRequest failed:', err);
  }
}
