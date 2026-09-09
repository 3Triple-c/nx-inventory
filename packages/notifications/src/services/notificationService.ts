import { prisma } from '@nx-inventory/database'
import type { AppEventType } from '@nx-inventory/events'

export async function createNotification(params: {
  businessId: string
  type: AppEventType
  message: string
  link?: string
}) {
  console.log("[notifications] creating notification", {
    businessId: params.businessId,
    type: params.type,
    link: params.link,
  })
  return prisma.notification.create({
    data: {
      businessId: params.businessId,
      type: params.type,
      message: params.message,
      link: params.link,
    },
  })
}

export async function listNotifications(businessId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: { businessId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function getUnreadCount(businessId: string) {
  return prisma.notification.count({ where: { businessId, read: false } })
}

export async function markAsRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { read: true } })
}

export async function markAllAsRead(businessId: string) {
  return prisma.notification.updateMany({ where: { businessId, read: false }, data: { read: true } })
}
