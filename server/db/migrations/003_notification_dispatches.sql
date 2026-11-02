-- Migration: 003_notification_dispatches.sql
-- Description: Notification attempts, delivery tracking, idempotency, and retry queue

CREATE TABLE IF NOT EXISTS notification_dispatches (
  id VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) REFERENCES applications(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(32),
  recipient_name VARCHAR(255) NOT NULL,
  property_title VARCHAR(255) NOT NULL,
  notification_type VARCHAR(64) NOT NULL DEFAULT 'APPLICATION_REJECTED',
  status VARCHAR(32) NOT NULL DEFAULT 'NOT_CONFIGURED' CHECK (
    status IN ('NOT_CONFIGURED', 'SIMULATED', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED')
  ),
  in_app_status VARCHAR(32) NOT NULL DEFAULT 'RECORDED' CHECK (
    in_app_status IN ('RECORDED', 'NOT_CONFIGURED', 'FAILED')
  ),
  email_status VARCHAR(32) NOT NULL DEFAULT 'NOT_CONFIGURED' CHECK (
    email_status IN ('NOT_CONFIGURED', 'SIMULATED', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED')
  ),
  sms_status VARCHAR(32) NOT NULL DEFAULT 'NOT_CONFIGURED' CHECK (
    sms_status IN ('NOT_CONFIGURED', 'SIMULATED', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED')
  ),
  channels TEXT[] NOT NULL DEFAULT ARRAY['EMAIL']::TEXT[],
  subject VARCHAR(255) NOT NULL,
  email_body TEXT NOT NULL,
  sms_body TEXT,
  reason_code VARCHAR(64),
  reason_title VARCHAR(128),
  explanation TEXT,
  idempotency_key VARCHAR(128) UNIQUE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_app_id ON notification_dispatches(application_id);
CREATE INDEX IF NOT EXISTS idx_notif_email ON notification_dispatches(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notif_status ON notification_dispatches(status);
CREATE INDEX IF NOT EXISTS idx_notif_idempotency ON notification_dispatches(idempotency_key);
