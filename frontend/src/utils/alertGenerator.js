// Calculate days until expiry
export const calculateDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
};

// Determine alert severity based on days until expiry
export const getAlertSeverity = (daysLeft) => {
    if (daysLeft <= 0) return "critical";
    if (daysLeft <= 3) return "critical";
    if (daysLeft <= 7) return "warning";
    return null; // No alert needed
};

// Generate alerts from products based on timing preference
export const generateAlertsFromProducts = (products, alertTimingDays = 7) => {
    const alerts = [];

    products.forEach((product) => {
        const daysLeft = calculateDaysUntilExpiry(product.expiry_date);

        // Only generate alerts for products within the alert timing window
        if (daysLeft <= alertTimingDays && daysLeft > -1) {
            let alertTitle = "";
            let severity = "info";

            if (daysLeft === 0) {
                alertTitle = `${product.name} expires today`;
                severity = "critical";
            } else if (daysLeft === 1) {
                alertTitle = `${product.name} expires tomorrow`;
                severity = "critical";
            } else if (daysLeft <= 3) {
                alertTitle = `${product.name} expires in ${daysLeft} days`;
                severity = "critical";
            } else {
                alertTitle = `${product.name} expires in ${daysLeft} days`;
                severity = "warning";
            }

            alerts.push({
                id: `${product.id}-${daysLeft}`,
                productId: product.id,
                title: alertTitle,
                severity,
                daysLeft,
                expiryDate: product.expiry_date,
                category: product.category,
            });
        } else if (daysLeft < 0) {
            // Add expired products as critical
            alerts.push({
                id: `${product.id}-expired`,
                productId: product.id,
                title: `${product.name} is expired`,
                severity: "critical",
                daysLeft,
                expiryDate: product.expiry_date,
                category: product.category,
            });
        }
    });

    // Sort by days left (soonest first)
    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
};

// Generate alert message for notifications
export const getAlertMessage = (product, daysLeft) => {
    if (daysLeft < 0) {
        return `${product.name} (${product.category}) has been expired for ${Math.abs(daysLeft)} day(s)`;
    } else if (daysLeft === 0) {
        return `⏰ ${product.name} (${product.category}) expires TODAY!`;
    } else if (daysLeft === 1) {
        return `⏰ ${product.name} (${product.category}) expires TOMORROW`;
    } else {
        return `⏰ ${product.name} (${product.category}) expires in ${daysLeft} day(s)`;
    }
};

// Request browser notification permission
export const requestNotificationPermission = async () => {
    if ("Notification" in window) {
        if (Notification.permission === "granted") {
            return true;
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
    }
    return false;
};

// Send browser notification
export const sendBrowserNotification = (title, options = {}) => {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            icon: "🔔",
            ...options,
        });
    }
};

// Check if any products need immediate alerts
export const getUrgentAlerts = (products) => {
    return generateAlertsFromProducts(products, 7).filter(
        (alert) => alert.daysLeft <= 3
    );
};
