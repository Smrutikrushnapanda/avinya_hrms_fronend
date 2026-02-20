"use client";

import NotificationList from "./NotificationList";

export default function MobileNotificationsPage() {
  return (
    <NotificationList
      title="Notifications"
      backHref="/user/dashboard/mobile"
      detailHrefBase="/user/dashboard/mobile/notifications"
    />
  );
}
