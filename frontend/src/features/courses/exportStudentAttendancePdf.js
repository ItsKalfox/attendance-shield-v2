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
 * Generate and download a unified Student Attendance PDF Report
 * with customizable display toggles and eligibility criteria:
 * - Portrait A4 format (210mm x 297mm)
 * - Branded top banner with organization logo / initial
 * - Course & Student metadata card
 * - Styled breakdown table with total summary row
 * - Single Course Lecturer signature block on the bottom left
 * - Running footers across all pages
 * 
 * @param {Object} params
 * @param {Object} params.organization - Active organization object
 * @param {Object} params.student - Student details { name, email, studentId }
 * @param {Object} params.course - Course specifications { code, name, batch, semester, instructor }
 * @param {Array} params.breakdown - Lecture format breakdown items
 * @param {Object} params.summary - Summary stats { totalConducted, totalAttended, totalAbsent, overallPercentage, isEligible, threshold }
 * @param {Object} customSettings - Configurable display options
 */
export const generateStudentAttendancePDF = async ({
    organization,
    student,
    course,
    breakdown = [],
    summary = {}
}, customSettings = {}) => {
    if (!student || !course) {
        throw new Error('Student or course details are missing');
    }

    const {
        showLogo = true,
        showOrgName = true,
        showCourseDetails = true,
        showPercentages = true,
        showStatus = true,
        showSignature = true,
        threshold = customSettings.threshold ?? summary.threshold ?? 80
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
        reportTitle: 'Student Attendance Report',
        dateStr,
        logoImg: showLogo ? logoImg : null,
        pageWidth,
        showLogo,
        showOrgName
    });

    // ----------------------------------------------------
    // 2. Metadata Box (Course & Student Context)
    // ----------------------------------------------------
    const metaY = 35;
    const metaHeight = 24;
    let tableStartY = metaY + metaHeight + 4;

    const isEligible = (summary.overallPercentage || 0) >= threshold;

    if (showCourseDetails) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF_COLORS.borderGray);
        doc.roundedRect(10, metaY, 190, metaHeight, 2, 2, 'FD');

        // Left Column: Course Specifications
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text(`${course.code || 'Course'} - ${course.name || 'Untitled Course'}`, 14, metaY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF_COLORS.slateMuted);
        doc.text(
            `Batch: ${course.batch || 'Unspecified'}   |   Semester: ${course.semester || 'Unspecified'}`,
            14,
            metaY + 12
        );

        const lecturerName = course.instructor?.name || 'Not assigned';
        const lecturerEmail = course.instructor?.email ? ` (${course.instructor.email})` : '';
        doc.text(`Lecturer: ${lecturerName}${lecturerEmail}`, 14, metaY + 18);

        // Right Column: Student Specifications & Attendance Rate
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...PDF_COLORS.primaryDark);
        const studentIdText = student.studentId ? ` [${student.studentId}]` : '';
        doc.text(`Student: ${student.name || 'Student'}${studentIdText}`, 118, metaY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF_COLORS.slateMuted);
        doc.text(`Email: ${student.email || 'N/A'}`, 118, metaY + 12);

        if (showStatus) {
            const statusText = isEligible ? 'ELIGIBLE' : 'SHORT ATTENDANCE';
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(isEligible ? PDF_COLORS.emerald[0] : PDF_COLORS.rose[0], isEligible ? PDF_COLORS.emerald[1] : PDF_COLORS.rose[1], isEligible ? PDF_COLORS.emerald[2] : PDF_COLORS.rose[2]);
            doc.text(
                `Overall Rate: ${summary.overallPercentage || 0}% (${statusText})`,
                118,
                metaY + 18
            );
        } else {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PDF_COLORS.primaryDark);
            doc.text(`Overall Attendance: ${summary.totalAttended || 0}/${summary.totalConducted || 0} (${summary.overallPercentage || 0}%)`, 118, metaY + 18);
        }
    } else {
        tableStartY = 36;
    }

    // ----------------------------------------------------
    // 3. Attendance Table with Format Breakdown & Total Row
    // ----------------------------------------------------
    const headRow = [
        '#',
        'Session Format / Lecture Type',
        'Conducted',
        'Attended',
        'Absent'
    ];

    if (showPercentages) {
        headRow.push('Attendance Rate');
    }
    if (showStatus) {
        headRow.push('Status');
    }

    // Data rows
    const bodyRows = breakdown.map((item, idx) => {
        const conducted = item.conducted || 0;
        const attended = item.attended || 0;
        const absent = item.absent || 0;
        const pct = conducted > 0 ? `${item.percentage}%` : '0%';
        const status = conducted === 0 
            ? '-' 
            : (item.percentage >= threshold ? 'ELIGIBLE' : 'SHORT');

        const row = [
            (idx + 1).toString(),
            item.type || 'Lecture',
            conducted.toString(),
            attended.toString(),
            absent.toString()
        ];

        if (showPercentages) row.push(pct);
        if (showStatus) row.push(status);

        return row;
    });

    // Append Total / Summary row
    const totalRowIndex = bodyRows.length;
    const totalRow = [
        '',
        'Total / Overall Summary',
        (summary.totalConducted || 0).toString(),
        (summary.totalAttended || 0).toString(),
        (summary.totalAbsent || 0).toString()
    ];
    if (showPercentages) totalRow.push(`${summary.overallPercentage || 0}%`);
    if (showStatus) totalRow.push(isEligible ? 'ELIGIBLE' : 'SHORT');
    bodyRows.push(totalRow);

    const statusColIndex = showStatus ? (headRow.length - 1) : -1;

    // Distribute widths across 190mm
    const baseWidths = {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: showPercentages && showStatus ? 60 : (showPercentages || showStatus ? 84 : 108), fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 24 },
        3: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 24 }
    };
    let currIdx = 5;
    if (showPercentages) {
        baseWidths[currIdx] = { halign: 'center', cellWidth: 24, fontStyle: 'bold' };
        currIdx++;
    }
    if (showStatus) {
        baseWidths[currIdx] = { halign: 'center', cellWidth: 24, fontStyle: 'bold' };
        currIdx++;
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
        columnStyles: baseWidths,
        didParseCell: (data) => {
            if (data.section === 'body' && data.row.index === totalRowIndex) {
                data.cell.styles.fillColor = [241, 245, 249];
                data.cell.styles.fontStyle = 'bold';
            }

            if (showStatus && data.section === 'body' && data.column.index === statusColIndex) {
                const cellVal = data.cell.text && data.cell.text[0];
                if (cellVal === 'ELIGIBLE') {
                    data.cell.styles.textColor = PDF_COLORS.emerald;
                } else if (cellVal === 'SHORT') {
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
        reportTitle: 'Student Attendance Report',
        courseCode: course.code,
        dateStr,
        pageWidth,
        pageHeight
    });

    // ----------------------------------------------------
    // 6. Download / Save PDF
    // ----------------------------------------------------
    const sanitizedCode = (course.code || 'Course').replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedStudent = (student.studentId || student.name || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${sanitizedCode}_${sanitizedStudent}_Attendance_Report.pdf`;

    doc.save(filename);
};
