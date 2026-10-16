import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    PDF_COLORS, 
    loadImage, 
    drawReportHeader, 
    drawLecturerSignature, 
    drawRunningFooter, 
    formatReportDate 
} from '../../utils/pdfReportUtils';

/**
 * Generate and download a unified Session Attendance PDF Report
 * with customizable display toggles:
 * - Portrait A4 format (210mm x 297mm)
 * - Branded top banner with organization logo / initial
 * - Session & Course specifications metadata card
 * - Styled attendee records table
 * - Single Course Lecturer signature block on the bottom left
 * - Running footers across all pages
 * 
 * @param {Object} params
 * @param {Object} params.organization - Active organization object
 * @param {Object} params.session - Session details { courseId, lectureType, startTime, expiresAt, status, instructorId }
 * @param {Array} params.records - List of session attendance records
 * @param {number} params.totalEnrolled - Total enrolled students in the course
 * @param {Object} customSettings - Configurable display options
 */
export const generateSessionAttendancePDF = async ({
    organization,
    session,
    records = [],
    totalEnrolled = 0
}, customSettings = {}) => {
    if (!session) {
        throw new Error('Session details are missing');
    }

    const {
        showLogo = true,
        showOrgName = true,
        showCourseDetails = true,
        showStatus = true,
        showSignature = true
    } = customSettings;

    // Vertical A4 (Portrait): 210mm x 297mm
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const dateStr = formatReportDate();

    // ----------------------------------------------------
    // 1. Header Banner
    // ----------------------------------------------------
    const logoImg = await loadImage(organization?.logo || organization?.avatarUrl);
    drawReportHeader(doc, {
        organization,
        reportTitle: 'Session Attendance Report',
        dateStr,
        logoImg: showLogo ? logoImg : null,
        pageWidth,
        showLogo,
        showOrgName
    });

    // ----------------------------------------------------
    // 2. Metadata Box (Session & Course Specifications)
    // ----------------------------------------------------
    const metaY = 35;
    const metaHeight = 24;
    let tableStartY = metaY + metaHeight + 4;

    const courseCode = session.courseId?.code || 'Course';
    const courseName = session.courseId?.name || 'Untitled Course';

    if (showCourseDetails) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF_COLORS.borderGray);
        doc.roundedRect(10, metaY, 190, metaHeight, 2, 2, 'FD');

        // Left Column: Course & Schedule Details
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text(`${courseCode} - ${courseName}`, 14, metaY + 6);

        const sessionDateStr = session.startTime 
            ? new Date(session.startTime).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
            : 'N/A';

        const sessionTimeStr = session.startTime && session.expiresAt
            ? `${new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(session.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Time unspecified';

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF_COLORS.slateMuted);
        doc.text(
            `Type: ${session.lectureType || 'Lecture'}   |   Date: ${sessionDateStr} (${sessionTimeStr})`,
            14,
            metaY + 12
        );

        const instructorName = `${session.instructorId?.userId?.firstName || ''} ${session.instructorId?.userId?.lastName || ''}`.trim() || 'Instructor';
        const instructorEmail = session.instructorId?.userId?.email ? ` (${session.instructorId?.userId?.email})` : '';
        doc.text(`Instructor: ${instructorName}${instructorEmail}`, 14, metaY + 18);

        // Right Column: Attendance Metrics & Status
        const presentCount = records.filter(r => r.status === 'PRESENT' && !r.isFlagged).length;
        const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text('Enrolled Students:', 135, metaY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_COLORS.slateMuted);
        doc.text(`${totalEnrolled} students`, 166, metaY + 6);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text('Present Attendees:', 135, metaY + 12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_COLORS.slateMuted);
        doc.text(`${presentCount} (${attendanceRate}%)`, 166, metaY + 12);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text('Session Status:', 135, metaY + 18);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_COLORS.slateMuted);
        doc.text(`${session.status || 'COMPLETED'}`, 166, metaY + 18);
    } else {
        tableStartY = 36;
    }

    // ----------------------------------------------------
    // 3. Attendee Table
    // ----------------------------------------------------
    const headRow = [
        '#',
        'Student ID',
        'Student Name',
        'Mark Time',
        'Method'
    ];

    if (showStatus) {
        headRow.push('Status');
    }

    const sortedRecords = [...records].sort((a, b) => {
        const idA = a.organizationMemberId?.studentId || '';
        const idB = b.organizationMemberId?.studentId || '';
        if (idA && idB) return idA.localeCompare(idB, undefined, { numeric: true });
        const nameA = `${a.userId?.firstName || ''} ${a.userId?.lastName || ''}`.trim();
        const nameB = `${b.userId?.firstName || ''} ${b.userId?.lastName || ''}`.trim();
        return nameA.localeCompare(nameB);
    });

    const bodyRows = sortedRecords.length > 0 ? sortedRecords.map((r, idx) => {
        const studentId = r.organizationMemberId?.studentId || '-';
        const studentName = `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`.trim() || 'Student';
        const markTime = r.markedAt 
            ? new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '-';
        const method = r.markedBy || 'SELF';
        const status = r.isFlagged ? 'FLAGGED' : (r.status || 'PRESENT');

        const row = [
            (idx + 1).toString(),
            studentId,
            studentName,
            markTime,
            method
        ];

        if (showStatus) {
            row.push(status);
        }

        return row;
    }) : [
        [
            '-',
            '-',
            'No attendance records recorded for this session',
            '-',
            '-',
            ...(showStatus ? ['-'] : [])
        ]
    ];

    const statusColIndex = showStatus ? (headRow.length - 1) : -1;

    const columnStyles = {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
        2: { halign: 'left', cellWidth: showStatus ? 68 : 88, fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 40 },
        4: { halign: 'center', cellWidth: showStatus ? 20 : 30 }
    };

    if (showStatus) {
        columnStyles[5] = { halign: 'center', cellWidth: 20, fontStyle: 'bold' };
    }

    autoTable(doc, {
        startY: tableStartY,
        head: [headRow],
        body: bodyRows,
        theme: 'grid',
        margin: { left: 10, right: 10, top: 35, bottom: 16 },
        styles: {
            fontSize: 7,
            cellPadding: 2.2,
            lineColor: PDF_COLORS.borderGray,
            lineWidth: 0.1,
            valign: 'middle'
        },
        headStyles: {
            fillColor: PDF_COLORS.primaryDark,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 7,
            valign: 'middle',
            minCellHeight: 9
        },
        alternateRowStyles: {
            fillColor: PDF_COLORS.bgLight
        },
        columnStyles,
        didParseCell: (data) => {
            if (showStatus && data.section === 'body' && data.column.index === statusColIndex) {
                const cellVal = data.cell.text && data.cell.text[0];
                if (cellVal === 'PRESENT') {
                    data.cell.styles.textColor = PDF_COLORS.emerald;
                } else if (cellVal === 'FLAGGED' || cellVal === 'ABSENT') {
                    data.cell.styles.textColor = PDF_COLORS.rose;
                }
            }
        }
    });

    // ----------------------------------------------------
    // 4. Lecturer Signature Block (Conditional)
    // ----------------------------------------------------
    if (showSignature) {
        drawLecturerSignature(doc, {
            finalY: doc.lastAutoTable.finalY || 180,
            pageHeight
        });
    }

    // ----------------------------------------------------
    // 5. Page Numbers & Running Footers
    // ----------------------------------------------------
    drawRunningFooter(doc, {
        reportTitle: 'Session Attendance Report',
        courseCode,
        dateStr,
        pageWidth,
        pageHeight
    });

    // ----------------------------------------------------
    // 6. Download / Save PDF
    // ----------------------------------------------------
    const sanitizedCode = courseCode.replace(/[^a-zA-Z0-9]/g, '_');
    const dateTag = session.startTime 
        ? new Date(session.startTime).toISOString().split('T')[0] 
        : 'session';
    const filename = `Attendance_${sanitizedCode}_${dateTag}.pdf`;

    doc.save(filename);
};
