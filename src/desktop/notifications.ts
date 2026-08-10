export function requestNotificationPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

export function showDesktopNotification(title: string, body: string, onClick: () => void) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const notification = new Notification(title, { body });
  notification.onclick = () => {
    window.focus();
    onClick();
    notification.close();
  };
}
