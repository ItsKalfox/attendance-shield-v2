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
 * Generate and download a comprehensive Course-Wide Attendance PDF Report
 * in vertical A4 format with fully customizable settings:
 * - Dynamic logo, organization name, course metadata box, percentages, status, and signature toggles
 * - Dynamic lecture-type column filtering with vertical rotated headers
 * - Dynamic eligibility threshold and minimum session requirements per lecture format
 * 
 * @param {Object} reportData - Aggregated report payload from backend
 * @param {Object} customSettings - Configurable display and eligibility options
 */
export const generateCourseAttendancePDF = async (reportData, customSettings = {}) => {
    if (!reportData || !reportData.course) {
        throw new Error('Report data is missing or incomplete');
    }

    const { 
        organization, 
        course, 
        lectureTypeSummary = [], 
        totalSessionsConducted = 0, 
        totalStudentsEnrolled = 0, 
        students = [] 
    } = reportData;

    const {
        showLogo = true,
        showOrgName = true,
        showCourseDetails = true,
        showPercentages = true,
        showStatus = true,
        showSignature = true,
        visibleLectureTypes = null, // array of strings or null for all
        threshold = customSettings.threshold ?? course.attendanceSettings?.minOverallPercentage ?? 80,
        typeRequirements = customSettings.typeRequirements ?? course.attendanceSettings?.typeRequirements ?? []
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

    // Load Organization Logo if present
    const logoImg = await loadImage(organization?.logo);

    // ----------------------------------------------------
    // 1. Header Banner
    // ----------------------------------------------------
    drawReportHeader(doc, {
        organization,
        reportTitle: 'Course Attendance Report',
        dateStr,
        logoImg: showLogo ? logoImg : null,
        pageWidth,
        showLogo,
        showOrgName
    });

    // ----------------------------------------------------
    // 2. Course Specifications Metadata Box (Conditional)
    // ----------------------------------------------------
    const metaY = 35;
    const metaHeight = 22;
    let tableStartY = metaY + metaHeight + 4;

    if (showCourseDetails) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF_COLORS.borderGray);
        doc.roundedRect(10, metaY, 190, metaHeight, 2, 2, 'FD');

        // Left Column
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text(`${course.code} - ${course.name}`, 14, metaY + 6);

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
        doc.text(`Coordinator: ${lecturerName}${lecturerEmail}`, 14, metaY + 18);

        // Right Column
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text('Sessions Held:', 140, metaY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_COLORS.slateMuted);
        doc.text(`${totalSessionsConducted} sessions`, 164, metaY + 6);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF_COLORS.primaryDark);
        doc.text('Enrolled Students:', 140, metaY + 12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_COLORS.slateMuted);
        doc.text(`${totalStudentsEnrolled} students`, 168, metaY + 12);
    } else {
        tableStartY = 36;
    }

    // ----------------------------------------------------
    // 3. Table Column Filtering & Rows Construction
    // ----------------------------------------------------
    const activeLectureTypes = visibleLectureTypes && Array.isArray(visibleLectureTypes)
        ? lectureTypeSummary.filter(lt => visibleLectureTypes.includes(lt.type))
        : lectureTypeSummary;

    const headRow = [
        '#',
        'Student ID',
        'Student Name',
        ...activeLectureTypes.map(() => ''),
        showPercentages ? `Total\n(${totalSessionsConducted})` : `Total (${totalSessionsConducted})`
    ];

    if (showStatus) {
        headRow.push('Status');
    }

    const bodyRows = students.length > 0 ? students.map((s, idx) => {
        // Recalculate dynamic eligibility based on threshold & per-type requirements
        let isEligible = s.percentage >= threshold;
        if (Array.isArray(typeRequirements) && typeRequirements.length > 0) {
            for (const reqItem of typeRequirements) {
                if (reqItem.minSessions > 0) {
                    const attendedForType = s.attendanceByType?.[reqItem.lectureType] || 0;
                    if (attendedForType < reqItem.minSessions) {
                        isEligible = false;
                        break;
                    }
                }
            }
        }

        const typeCells = activeLectureTypes.map(lt => {
            const attended = s.attendanceByType?.[lt.type] || 0;
            if (!showPercentages) {
                return attended.toString();
            }
            const pct = lt.conducted > 0 
                ? `${Math.round((attended / lt.conducted) * 100)}%` 
                : '0%';
            return `${attended}\n${pct}`;
        });

        const totalCell = showPercentages 
            ? `${s.totalAttended}\n${s.percentage}%` 
            : s.totalAttended.toString();

        const row = [
            (idx + 1).toString(),
            s.studentId && s.studentId !== '-' ? s.studentId : '-',
            s.name || 'Student',
            ...typeCells,
            totalCell
        ];

        if (showStatus) {
            row.push(isEligible ? 'ELIGIBLE' : 'SHORT');
        }

        return row;
    }) : [
        [
            '-',
            '-',
            'No students enrolled in this course',
            ...activeLectureTypes.map(() => showPercentages ? '0\n0%' : '0'),
            showPercentages ? '0\n0%' : '0',
            ...(showStatus ? ['-'] : [])
        ]
    ];

    // Compute column alignments & widths to total exactly 190mm
    const baseFixed = 6 + 22 + 48 + 14 + (showStatus ? 16 : 0); // 106mm or 90mm
    const availableForTypes = 190 - baseFixed;
    const typeColWidth = activeLectureTypes.length > 0 
        ? Math.round((availableForTypes / activeLectureTypes.length) * 100) / 100 
        : 0;
    
    // Distribute any rounding difference to Student Name
    const totalAllocated = baseFixed + (typeColWidth * activeLectureTypes.length);
    const nameColWidth = 48 + (190 - totalAllocated);

    const columnStyles = {
        0: { halign: 'center', cellWidth: 6 },
        1: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        2: { halign: 'left', cellWidth: nameColWidth, fontStyle: 'bold' }
    };

    let colIdx = 3;
    const lectureTypeStartIndex = 3;
    const lectureTypeCount = activeLectureTypes.length;

    activeLectureTypes.forEach(() => {
        columnStyles[colIdx] = { halign: 'center', cellWidth: typeColWidth };
        colIdx++;
    });

    // Total column
    columnStyles[colIdx] = { halign: 'center', fontStyle: 'bold', cellWidth: 14 };
    colIdx++;

    // Status column (if enabled)
    let statusColIndex = -1;
    if (showStatus) {
        columnStyles[colIdx] = { halign: 'center', fontStyle: 'bold', cellWidth: 16 };
        statusColIndex = colIdx;
    }

    autoTable(doc, {
        startY: tableStartY,
        head: [headRow],
        body: bodyRows,
        theme: 'grid',
        margin: { left: 10, right: 10, top: 35, bottom: 16 },
        styles: {
            fontSize: 6.5,
            lineHeightFactor: 1.25,
            cellPadding: 1.5,
            lineColor: PDF_COLORS.borderGray,
            lineWidth: 0.1,
            valign: 'middle'
        },
        headStyles: {
            fillColor: PDF_COLORS.primaryDark,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 6.5,
            valign: 'middle',
            minCellHeight: activeLectureTypes.length > 0 ? 28 : 9
        },
        alternateRowStyles: {
            fillColor: PDF_COLORS.bgLight
        },
        columnStyles,
        didDrawCell: (data) => {
            if (
                data.section === 'head' && 
                activeLectureTypes.length > 0 &&
                data.column.index >= lectureTypeStartIndex && 
                data.column.index < lectureTypeStartIndex + lectureTypeCount
            ) {
                const typeIndex = data.column.index - lectureTypeStartIndex;
                const lt = activeLectureTypes[typeIndex];
                const label = `${lt?.type || ''} (${lt?.conducted || 0})`;
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6);
                doc.setTextColor(255, 255, 255);
                
                const centerX = data.cell.x + data.cell.width / 2;
                const bottomY = data.cell.y + data.cell.height - 2.5;
                
                doc.text(label, centerX, bottomY, {
                    angle: 90,
                    baseline: 'middle'
                });
            }
        },
        didParseCell: (data) => {
            if (showStatus && data.section === 'body' && data.column.index === statusColIndex) {
                if (data.cell.text && data.cell.text[0] === 'ELIGIBLE') {
                    data.cell.styles.textColor = PDF_COLORS.emerald;
                } else if (data.cell.text && data.cell.text[0] === 'SHORT') {
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
        reportTitle: 'Course Attendance Report',
        courseCode: course.code,
        dateStr,
        pageWidth,
        pageHeight
    });

    // ----------------------------------------------------
    // 6. Download / Save PDF
    // ----------------------------------------------------
    const sanitizedCode = (course.code || 'Course').replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedBatch = (course.batch || '').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${sanitizedCode}${sanitizedBatch ? `_${sanitizedBatch}` : ''}_Attendance_Report.pdf`;
    
    doc.save(filename);
};
