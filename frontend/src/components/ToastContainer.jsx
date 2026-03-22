import { useNotification } from "../context/NotificationContext";

function Toast({ notification, onClose }) {
    const severityStyles = {
        critical: "bg-red-500",
        warning: "bg-yellow-500",
        info: "bg-blue-500",
        success: "bg-green-500",
    };

    const severityIcons = {
        critical: "🔴",
        warning: "🟡",
        info: "ℹ️",
        success: "✅",
    };

    return (
        <div
            className={`${severityStyles[notification.severity] || severityStyles.info} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 animate-pulse`}
        >
            <span className="text-lg">{severityIcons[notification.severity]}</span>
            <span className="flex-1">{notification.message}</span>
            <button
                onClick={onClose}
                className="text-white hover:opacity-75 text-xl font-bold"
            >
                ×
            </button>
        </div>
    );
}

export function ToastContainer() {
    const { notifications, removeNotification } = useNotification();

    return (
        <div className="fixed top-4 right-4 space-y-2 z-50 max-w-xs">
            {notifications.map((notification) => (
                <Toast
                    key={notification.id}
                    notification={notification}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}
        </div>
    );
}
