/**
 * Shared PDF Design Tokens & Layout Utilities for Attendance Shield Reports
 * Ensures 100% visual and structural consistency across:
 * - Course-wide Attendance Reports
 * - Student-specific Attendance Reports
 * - Session Attendance Reports
 */

export const PDF_COLORS = {
    primaryDark: [15, 23, 42],     // slate-900 (header background, primary text)
    brandColor: [13, 148, 136],    // teal-600 / brand emerald
    slateMuted: [100, 116, 139],   // slate-500 (subtitles, secondary info, footers)
    borderGray: [226, 232, 240],   // slate-200 (table borders, dividers)
    emerald: [16, 185, 129],       // emerald-500 (eligible / present status)
    rose: [225, 29, 72],           // rose-600 (short / absent / flagged status)
    bgLight: [248, 250, 252],      // slate-50 (top banner fill, alternating rows)
    sigText: [148, 163, 184]       // slate-400 (signature label)
};

/**
 * Helper to safely load an image URL as an Image element for jsPDF
 */
export const loadImage = (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
};

/**
 * Draw a clean circular badge with the organization's initial letter
 */
export const drawOrgInitial = (doc, name, x = 10, y = 5) => {
    const initial = (name || 'A').trim().charAt(0).toUpperCase();
    doc.setFillColor(204, 251, 241); // teal-100
    doc.setDrawColor(153, 246, 228); // teal-200
    doc.circle(x + 11, y + 11, 10, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text(initial, x + 11, y + 14.5, { align: 'center' });
};

/**
 * Standardized Top Banner Header
 * - Background fill (slate-50) from y=0 to y=32
 * - Border line at y=32
 * - Logo / Initial Badge at (10, 5, 22, 22)
 * - Three-line typography block at x=36
 */
export const drawReportHeader = (doc, { 
    organization, 
    reportTitle, 
    dateStr, 
    logoImg, 
    pageWidth = 210,
    showLogo = true,
    showOrgName = true
}) => {
    // 1. Header Banner Background
    doc.setFillColor(...PDF_COLORS.bgLight);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setDrawColor(...PDF_COLORS.borderGray);
    doc.line(0, 32, pageWidth, 32);

    // 2. Organization Logo or Initial
    let titleStartX = 14;
    if (showLogo) {
        titleStartX = 36;
        if (logoImg) {
            try {
                doc.addImage(logoImg, 'PNG', 10, 5, 22, 22);
            } catch {
                drawOrgInitial(doc, organization?.name || 'A', 10, 5);
            }
        } else {
            drawOrgInitial(doc, organization?.name || 'A', 10, 5);
        }
    }

    // Line 1: Organization Name
    if (showOrgName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text((organization?.name || 'ORGANIZATION').toUpperCase(), titleStartX, 12);
    }

    // Line 2: Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.brandColor);
    doc.text(reportTitle.toUpperCase(), titleStartX, showOrgName ? 18.5 : 15);

    // Line 3: Generated Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.slateMuted);
    doc.text(`Generated on: ${dateStr}`, titleStartX, showOrgName ? 25 : 22);
};

/**
 * Standardized Single Lecturer Signature Block
 * Positioned on the bottom-left with adequate space
 */
export const drawLecturerSignature = (doc, { finalY = 180, pageHeight = 297 }) => {
    const requiredSigSpace = 30;
    if (finalY + requiredSigSpace > pageHeight - 18) {
        doc.addPage();
    }

    const currentLastPageY = (finalY + requiredSigSpace > pageHeight - 18) ? 30 : finalY + 16;
    const sigLineY = Math.min(currentLastPageY, pageHeight - 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.sigText);

    doc.setDrawColor(...PDF_COLORS.borderGray);
    doc.line(16, sigLineY, 80, sigLineY);
    doc.text('Course Lecturer Signature', 18, sigLineY + 5);
};

/**
 * Standardized Running Footers Across All Pages
 */
export const drawRunningFooter = (doc, { reportTitle, courseCode, dateStr, pageWidth = 210, pageHeight = 297 }) => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...PDF_COLORS.slateMuted);
        doc.text(
            `Attendance Shield System  |  ${reportTitle}  |  Page ${i} of ${totalPages}`,
            10,
            pageHeight - 6
        );
        doc.text(
            `Confidential  |  ${courseCode || 'Course'}  |  ${dateStr}`,
            pageWidth - 10,
            pageHeight - 6,
            { align: 'right' }
        );
    }
};

/**
 * Format date for report header and footers
 */
export const formatReportDate = (date = new Date()) => {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
