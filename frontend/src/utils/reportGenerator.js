// Generate CSV export of report data
export const generateReportCSV = (stats, products, wastageData, categoryData) => {
    const timestamp = new Date().toLocaleString();
    const lines = [];

    // Header
    lines.push("EXPIRY TRACKER - REPORT");
    lines.push(`Generated: ${timestamp}`);
    lines.push("");

    // Summary Statistics
    lines.push("SUMMARY STATISTICS");
    lines.push("-------------------");
    lines.push(`Fresh Products,${stats.freshProducts}`);
    lines.push(`Expiring Soon,${stats.expiringSoon}`);
    lines.push(`Expired,${stats.expired}`);
    lines.push(`Waste Avoided,${stats.wastageValue}`);
    lines.push("");

    // All Products
    lines.push("ALL PRODUCTS");
    lines.push("-------------------");
    lines.push("Product Name,Category,Expiry Date,Status");

    const today = new Date();
    products.forEach((p) => {
        const expiry = new Date(p.expiry_date);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        let status = "Fresh";

        if (daysLeft <= 0) status = "Expired";
        else if (daysLeft <= 3) status = "Expiring Soon";
        else if (daysLeft <= 7) status = "Expires Soon";

        const escapedName = `"${p.name.replace(/"/g, '""')}"`;
        lines.push(`${escapedName},${p.category},${expiry.toLocaleDateString()},${status}`);
    });
    lines.push("");

    // Wastage Data (Last 6 Months)
    lines.push("WASTAGE AVOIDED (LAST 6 MONTHS)");
    lines.push("-------------------");
    lines.push("Month,Units");
    wastageData.forEach((item) => {
        lines.push(`${item.label},${item.value}`);
    });
    lines.push("");

    // Category Distribution
    lines.push("PRODUCT CATEGORIES");
    lines.push("-------------------");
    lines.push("Category,Count,Percentage");
    const total = categoryData.reduce((sum, item) => sum + item.value, 0);
    categoryData.forEach((item) => {
        const percentage = Math.round((item.value / total) * 100);
        lines.push(`${item.label},${item.value},${percentage}%`);
    });

    // Create CSV content
    const csvContent = lines.join("\n");

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `expiry-tracker-report-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Generate PDF export (requires jspdf library)
export const generateReportPDF = async (stats, products, wastageData, categoryData) => {
    try {
        // Dynamically import jsPDF
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();

        const timestamp = new Date().toLocaleString();
        let yPosition = 20;
        const pageHeight = doc.internal.pageSize.height;
        const lineHeight = 7;
        const margin = 15;

        // Helper function to add text and handle page breaks
        const addText = (text, fontSize = 10, isBold = false) => {
            if (yPosition > pageHeight - 15) {
                doc.addPage();
                yPosition = 20;
            }
            doc.setFontSize(fontSize);
            if (isBold) doc.setFont(undefined, "bold");
            else doc.setFont(undefined, "normal");
            doc.text(text, margin, yPosition);
            yPosition += lineHeight;
        };

        // Title
        addText("EXPIRY TRACKER - REPORT", 18, true);
        addText(`Generated: ${timestamp}`, 9, false);
        yPosition += 5;

        // Summary Statistics
        addText("SUMMARY STATISTICS", 12, true);
        addText(`Fresh Products: ${stats.freshProducts}`, 10, false);
        addText(`Expiring Soon: ${stats.expiringSoon}`, 10, false);
        addText(`Expired: ${stats.expired}`, 10, false);
        addText(`Waste Avoided: ${stats.wastageValue}`, 10, false);
        yPosition += 5;

        // Products Section
        addText("ALL PRODUCTS", 12, true);
        doc.setFontSize(8);
        doc.setFont(undefined, "bold");
        doc.text("Product Name", margin, yPosition);
        doc.text("Category", margin + 50, yPosition);
        doc.text("Expiry Date", margin + 100, yPosition);
        doc.text("Status", margin + 150, yPosition);
        yPosition += 6;

        doc.setFont(undefined, "normal");
        doc.setFontSize(8);

        products.forEach((p) => {
            if (yPosition > pageHeight - 15) {
                doc.addPage();
                yPosition = 20;
            }
            const expiry = new Date(p.expiry_date);
            const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
            let status = "Fresh";

            if (daysLeft <= 0) status = "Expired";
            else if (daysLeft <= 3) status = "Expiring Soon";
            else if (daysLeft <= 7) status = "Expires Soon";

            doc.text(p.name.substring(0, 25), margin, yPosition);
            doc.text(p.category, margin + 50, yPosition);
            doc.text(expiry.toLocaleDateString(), margin + 100, yPosition);
            doc.text(status, margin + 150, yPosition);
            yPosition += lineHeight + 1;
        });

        yPosition += 3;

        // Wastage Data
        addText("WASTAGE AVOIDED (LAST 6 MONTHS)", 12, true);
        doc.setFontSize(8);
        doc.setFont(undefined, "bold");
        doc.text("Month", margin, yPosition);
        doc.text("Units", margin + 80, yPosition);
        yPosition += 6;

        doc.setFont(undefined, "normal");
        wastageData.forEach((item) => {
            if (yPosition > pageHeight - 15) {
                doc.addPage();
                yPosition = 20;
            }
            doc.text(item.label, margin, yPosition);
            doc.text(item.value.toString(), margin + 80, yPosition);
            yPosition += lineHeight;
        });

        yPosition += 3;

        // Category Distribution
        addText("PRODUCT CATEGORIES", 12, true);
        doc.setFontSize(8);
        doc.setFont(undefined, "bold");
        doc.text("Category", margin, yPosition);
        doc.text("Count", margin + 80, yPosition);
        doc.text("Percentage", margin + 120, yPosition);
        yPosition += 6;

        doc.setFont(undefined, "normal");
        const total = categoryData.reduce((sum, item) => sum + item.value, 0);
        categoryData.forEach((item) => {
            if (yPosition > pageHeight - 15) {
                doc.addPage();
                yPosition = 20;
            }
            const percentage = Math.round((item.value / total) * 100);
            doc.text(item.label, margin, yPosition);
            doc.text(item.value.toString(), margin + 80, yPosition);
            doc.text(`${percentage}%`, margin + 120, yPosition);
            yPosition += lineHeight;
        });

        doc.save(`expiry-tracker-report-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
        console.error("Error generating PDF:", err);
        alert("Error: " + err.message);
    }
};

// Generic export function (defaults to CSV)
export const exportReport = async (stats, products, wastageData, categoryData, format = "csv") => {
    if (format === "pdf") {
        await generateReportPDF(stats, products, wastageData, categoryData);
    } else {
        generateReportCSV(stats, products, wastageData, categoryData);
    }
};
