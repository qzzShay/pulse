/* Shared between the report dialog and the admin area. */

export const REPORT_REASONS = {
  spam: 'Spam oder Werbung',
  impersonation: 'Gibt sich als jemand anderes aus',
  scam: 'Betrug oder Phishing',
  nsfw: 'Nicht jugendfreie Inhalte',
  hate: 'Hass oder Belästigung',
  other: 'Etwas anderes',
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;
