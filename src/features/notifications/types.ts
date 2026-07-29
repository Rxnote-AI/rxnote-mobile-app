/** Mirrors the web `notifications` table (see MedicalRxNote shared/schema.ts). */
export type NotificationType =
  | 'patient_access_request'
  | 'patient_access_approved'
  | 'patient_access_denied'
  | 'template_share_request'
  | 'template_share_approved'
  | 'template_share_denied'
  | string;

export interface AccessRequestMetadata {
  requestId?: number;
  requesterId?: number;
  requesterName?: string;
}

export interface AppNotification {
  id: number;
  recipientId: number;
  senderId: number | null;
  senderName: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  isRead: boolean;
  resourceType: string | null;
  resourceId: number | null;
  metadata: AccessRequestMetadata | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}
