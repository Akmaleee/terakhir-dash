// src/app/api/jik/generate-docx/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/postgres";
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType, TableLayoutType
} from "docx";
import { Jik, JikApprover, Approver } from "@prisma/client";

// --- KONFIGURASI LEBAR KOLOM (FIXED) ---
// Total lebar area tulisan A4 (tanpa margin) ~ 9000 - 9500 DXA
// Kita gunakan total 9500 DXA agar pas
const COL_WIDTH_NO = 800;    // Sekitar 8.5% (Cukup lebar agar NO tidak turun)
const COL_WIDTH_LABEL = 2500; // Sekitar 33.5%
const COL_WIDTH_CONTENT = 6200; // Sekitar 58%

// --- STATE MANAGEMENT UNTUK NUMBERING ---
interface NumberingContext {
    configs: any[];
    counter: number;
}

function createOrderedListConfig(referenceName: string) {
    return {
        reference: referenceName,
        levels: [
            { level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
            { level: 1, format: "lowerLetter", text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
            { level: 2, format: "lowerRoman", text: "%3.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 2160, hanging: 360 } } } },
        ],
    };
}

const STATIC_BULLET_CONFIG = {
    reference: "my-bullet-points",
    levels: [
        { level: 0, format: "bullet", text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: "bullet", text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        { level: 2, format: "bullet", text: "\u25AA", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 2160, hanging: 360 } } } },
    ],
};

// --- HELPER LAINNYA ---
async function fetchImage(url: string): Promise<Buffer | undefined> {
    try {
        const response = await fetch(url);
        if (!response.ok) return undefined;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error("Error fetching image:", error);
        return undefined;
    }
}

function sanitizeFileName(name: string): string {
    if (!name) return "";
    return name.trim().replace(/[\\/:*?"<>|]/g, '_');
}

const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };
const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

interface TiptapNode {
    type: string;
    content?: TiptapNode[];
    text?: string;
    marks?: { type: string }[];
    attrs?: { src?: string; align?: 'left' | 'center' | 'right' | 'justify'; [key: string]: any };
}

// --- CORE PARSER ---
async function nodeToDocx(
    node: TiptapNode, 
    ctx: NumberingContext,
    options: { isHeader?: boolean, level?: number, listRef?: string } = {}
): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
    const currentLevel = options.level || 0;

    const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
        const textRuns: TextRun[] = [];
        if (content) {
            for (const child of content) {
                if (child.type === 'text' && child.text) {
                    textRuns.push(new TextRun({
                        text: child.text || "",
                        bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
                        italics: child.marks?.some(m => m.type === 'italic'),
                    }));
                }
            }
        }
        return textRuns.length === 0 ? [new TextRun("")] : textRuns;
    };

    const getAlignment = (alignAttr?: string) => {
        if (alignAttr === 'center') return AlignmentType.CENTER;
        if (alignAttr === 'right') return AlignmentType.RIGHT;
        if (alignAttr === 'left') return AlignmentType.LEFT;
        return AlignmentType.BOTH; 
    };

    switch (node.type) {
        case 'paragraph':
            return new Paragraph({
                children: createTextRuns(node.content),
                alignment: getAlignment(node.attrs?.align),
            });

        case 'orderedList': {
            let listRef = options.listRef;
            if (!listRef) {
                listRef = `ordered-list-${ctx.counter++}`; 
                ctx.configs.push(createOrderedListConfig(listRef));
            }

            const listItems: Paragraph[] = [];
            if (node.content) {
                for (const listItem of node.content) {
                    if (listItem.type === 'listItem' && listItem.content) {
                        for (const itemContent of listItem.content) {
                            if (itemContent.type === 'paragraph') {
                                listItems.push(new Paragraph({
                                    children: createTextRuns(itemContent.content),
                                    numbering: { reference: listRef, level: currentLevel },
                                    alignment: getAlignment(itemContent.attrs?.align),
                                }));
                            } else if (itemContent.type === 'orderedList' || itemContent.type === 'bulletList') {
                                const nested = await nodeToDocx(itemContent, ctx, { ...options, level: currentLevel + 1, listRef: listRef });
                                if (nested && Array.isArray(nested)) listItems.push(...nested);
                            }
                        }
                    }
                }
            }
            return listItems;
        }

        case 'bulletList': {
            const listRef = "my-bullet-points"; 
            const listItems: Paragraph[] = [];
            if (node.content) {
                for (const listItem of node.content) {
                    if (listItem.type === 'listItem' && listItem.content) {
                        for (const itemContent of listItem.content) {
                            if (itemContent.type === 'paragraph') {
                                listItems.push(new Paragraph({
                                    children: createTextRuns(itemContent.content),
                                    numbering: { reference: listRef, level: currentLevel },
                                    alignment: getAlignment(itemContent.attrs?.align),
                                }));
                            } else if (itemContent.type === 'orderedList' || itemContent.type === 'bulletList') {
                                const nested = await nodeToDocx(itemContent, ctx, { ...options, level: currentLevel + 1 });
                                if (nested && Array.isArray(nested)) listItems.push(...nested);
                            }
                        }
                    }
                }
            }
            return listItems;
        }

        case 'image':
            if (node.attrs?.src) {
                const imgBuffer = await fetchImage(node.attrs.src);
                if (imgBuffer) {
                    return new Paragraph({
                        children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 }, type: "jpg", } as any)],
                        alignment: getAlignment(node.attrs?.align),
                    });
                }
            }
            return undefined;

        case 'table':
            const tableRows: TableRow[] = [];
            if (node.content) {
                for (const rowNode of node.content) {
                    if (rowNode.type === 'tableRow' && rowNode.content) {
                        const cells: TableCell[] = [];
                        for (const cellNode of rowNode.content) {
                            if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
                                const isHeader = cellNode.type === 'tableHeader';
                                const cellParagraphs: Paragraph[] = [];
                                if (cellNode.content) {
                                    for (const cellContentNode of cellNode.content) {
                                        const docxElement = await nodeToDocx(cellContentNode, ctx, { isHeader }); 
                                        if (docxElement) {
                                            if (Array.isArray(docxElement)) cellParagraphs.push(...docxElement);
                                            else if (docxElement instanceof Paragraph) cellParagraphs.push(docxElement);
                                        }
                                    }
                                }
                                cells.push(new TableCell({
                                    children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
                                    borders: fullThinBorder,
                                    verticalAlign: VerticalAlign.CENTER,
                                    margins: cellMargins,
                                    shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
                                }));
                            }
                        }
                        tableRows.push(new TableRow({ children: cells }));
                    }
                }
            }
            return new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows,
                alignment: getAlignment(node.attrs?.align),
            });

        default:
            if (node.content) {
                return new Paragraph({ children: createTextRuns(node.content) });
            }
            return new Paragraph({ children: [new TextRun("")] });
    }
}

async function parseTiptapContent(sections: any[], ctx: NumberingContext): Promise<TableRow[]> {
    const tableRows: TableRow[] = [];
    if (!Array.isArray(sections)) { return tableRows; }

    let i = 0;
    for (const section of sections) {
        // --- CELL 1: NO ---
        const noCell = new TableCell({
            children: [new Paragraph({ text: (i + 1).toString(), alignment: AlignmentType.CENTER })],
            borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.TOP,
            // GUNAKAN WIDTH TYPE DXA AGAR FIX
            width: { size: COL_WIDTH_NO, type: WidthType.DXA } 
        });

        // --- CELL 2: LABEL ---
        const labelCell = new TableCell({
            children: [new Paragraph({ text: section.title || "" })],
            borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.TOP,
             width: { size: COL_WIDTH_LABEL, type: WidthType.DXA }
        });

        // --- CELL 3: CONTENT ---
        const contentChildren: (Paragraph | Table)[] = [];
        const tiptapJson = section.content as TiptapNode;

        if (tiptapJson && tiptapJson.type === 'doc' && Array.isArray(tiptapJson.content)) {
            for (const node of tiptapJson.content) {
                if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) continue;
                const docxElement = await nodeToDocx(node, ctx); 
                if (docxElement) {
                    if (Array.isArray(docxElement)) contentChildren.push(...docxElement);
                    else contentChildren.push(docxElement);
                }
            }
        }

        if (contentChildren.length === 0) contentChildren.push(new Paragraph(""));

        const contentCell = new TableCell({
            children: contentChildren,
            borders: fullThinBorder, margins: cellMargins,
            width: { size: COL_WIDTH_CONTENT, type: WidthType.DXA }
        });

        tableRows.push(new TableRow({ children: [noCell, labelCell, contentCell] }));
        i++;
    }
    return tableRows;
}


// --- API ROUTE UTAMA ---
type JikApproverWithApprover = JikApprover & { approver: Approver; };

function createJikApproverTable(approvers: JikApproverWithApprover[]): Table {
    const grouped: { [key: string]: JikApproverWithApprover[] } = { Inisiator: [], Pemeriksa: [], 'Pemberi Persetujuan': [] };
    approvers.forEach(appr => { if (appr.approver_type && grouped[appr.approver_type]) grouped[appr.approver_type].push(appr); });

    const headerRow = new TableRow({
        children: ["", "Jabatan", "Nama", "Tanda Tangan", "Catatan"].map(text => 
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins })
        )
    });

    const rows: TableRow[] = [headerRow];
    const createDataRows = (type: string, list: JikApproverWithApprover[]) => {
        if (list.length === 0) {
            rows.push(new TableRow({ children: Array(5).fill(null).map((_, idx) => new TableCell({ children: [new Paragraph(idx===0?type:"")], verticalMerge: idx===0?"restart":undefined, borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER })) }));
            return;
        }
        list.forEach((appr, index) => {
            const nameParagraphs: Paragraph[] = [new Paragraph(appr.approver.name || "")];
            if (appr.approver.nik) nameParagraphs.push(new Paragraph(appr.approver.nik));
            rows.push(new TableRow({ children: [
                new TableCell({ children: [new Paragraph(index === 0 ? type : "")], verticalMerge: index === 0 ? "restart" : "continue", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph(appr.approver.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: nameParagraphs, borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
                new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
                new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
            ]}));
        });
    };
    createDataRows("Inisiator", grouped.Inisiator);
    createDataRows("Pemeriksa", grouped.Pemeriksa);
    createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

    return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows, columnWidths: [15, 25, 25, 15, 20] });
}

function createJikInfoTable(jikData: Jik): Table {
    const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
        const valText = value ? String(value) : "";
        const displayText = key === "Contract Duration" ? (valText ? `: ${valText} Tahun` : "") : `: ${valText}`;
        return new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })], borders: fullNoBorder, width: { size: 30, type: WidthType.PERCENTAGE }, margins: cellMargins, verticalAlign: VerticalAlign.TOP }),
            new TableCell({ children: [new Paragraph({ text: displayText, alignment: AlignmentType.BOTH })], borders: fullNoBorder, width: { size: 70, type: WidthType.PERCENTAGE }, margins: cellMargins, verticalAlign: VerticalAlign.TOP }),
        ]});
    };
    return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit)], columnWidths: [4000, 5500], borders: fullNoBorder });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const jikId = body.jikId;
        if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

        const jikData = await prisma.jik.findUnique({
            where: { id: parseInt(jikId as string) },
            include: { company: true, jik_approvers: { include: { approver: true } } },
        });
        if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

        const numberingCtx: NumberingContext = {
            configs: [STATIC_BULLET_CONFIG],
            counter: 1
        };

        const approverTable = createJikApproverTable(jikData.jik_approvers);
        const infoTable = createJikInfoTable(jikData);
        
        const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || [], numberingCtx);

        // --- HEADER KOLOM (DENGAN WIDTH DXA YANG SAMA) ---
        const mainContentHeaderRow = new TableRow({
            children: [
                new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })], 
                    borders: fullThinBorder, margins: cellMargins, shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" }, 
                    width: { size: COL_WIDTH_NO, type: WidthType.DXA } 
                }),
                new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })], 
                    borders: fullThinBorder, margins: cellMargins, shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" }, 
                    width: { size: COL_WIDTH_LABEL, type: WidthType.DXA } 
                }),
                new TableCell({ 
                    children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })], 
                    borders: fullThinBorder, margins: cellMargins, shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" }, 
                    width: { size: COL_WIDTH_CONTENT, type: WidthType.DXA } 
                }),
            ]
        });

        const mainContentTable = new Table({
            // --- KUNCI: FIXED LAYOUT ---
            layout: TableLayoutType.FIXED, 
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [COL_WIDTH_NO, COL_WIDTH_LABEL, COL_WIDTH_CONTENT], 
            rows: [mainContentHeaderRow, ...parsedContentTableRows]
        });

        const doc = new Document({
            numbering: { config: numberingCtx.configs },
            sections: [{
                headers: { default: new Header({ children: [] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true })] })] }) },
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                children: [
                    new Paragraph({ children: [new TextRun({ text: "LEMBAR PENGESAHAN", color: "000000" })], heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
                    approverTable,
                    new Paragraph({ text: "", spacing: { after: 400 } }),
                    new Paragraph({ children: [new TextRun({ text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)", color: "000000" })], heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, pageBreakBefore: true }),
                    new Paragraph({ children: [new TextRun({ text: jikData.judul.toUpperCase(), color: "000000" })], heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: `No: ${jikData.no || 'xxx'}`, color: "000000" })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
                    infoTable,
                    new Paragraph({ text: "", spacing: { after: 400 } }),
                    mainContentTable,
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
        const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
        const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

        return new NextResponse(Uint8Array.from(buffer), {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });

    } catch (error: any) {
        console.error("Error generating JIK DOCX:", error);
        return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
    }
}

// // src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType
// } from "docx";
// import { Jik, JikApprover, Approver } from "@prisma/client";

// // --- STATE MANAGEMENT UNTUK NUMBERING ---
// // Kita butuh context object untuk menyimpan konfigurasi numbering yang digenerate secara dinamis
// interface NumberingContext {
//     configs: any[];
//     counter: number;
// }

// // Helper untuk menghasilkan konfigurasi Ordered List baru yang unik
// function createOrderedListConfig(referenceName: string) {
//     return {
//         reference: referenceName,
//         levels: [
//             {
//                 level: 0,
//                 format: "decimal",
//                 text: "%1.",
//                 alignment: AlignmentType.LEFT,
//                 style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//             },
//             {
//                 level: 1,
//                 format: "lowerLetter", // a., b.
//                 text: "%2.",
//                 alignment: AlignmentType.LEFT,
//                 style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
//             },
//             {
//                 level: 2,
//                 format: "lowerRoman", // i., ii.
//                 text: "%3.",
//                 alignment: AlignmentType.LEFT,
//                 style: { paragraph: { indent: { left: 2160, hanging: 360 } } },
//             },
//         ],
//     };
// }

// // Helper untuk konfigurasi Bullet Points (Statis cukup, karena simbolnya sama)
// const STATIC_BULLET_CONFIG = {
//     reference: "my-bullet-points",
//     levels: [
//         {
//             level: 0,
//             format: "bullet",
//             text: "\u2022", // Bullet bulat hitam
//             alignment: AlignmentType.LEFT,
//             style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//         },
//         {
//             level: 1,
//             format: "bullet",
//             text: "\u25E6", // Bullet bulat putih
//             alignment: AlignmentType.LEFT,
//             style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
//         },
//         {
//             level: 2,
//             format: "bullet",
//             text: "\u25AA", // Bullet kotak
//             alignment: AlignmentType.LEFT,
//             style: { paragraph: { indent: { left: 2160, hanging: 360 } } },
//         },
//     ],
// };


// // --- HELPER LAINNYA ---

// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) return undefined;
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// interface TiptapNode {
//     type: string;
//     content?: TiptapNode[];
//     text?: string;
//     marks?: { type: string }[];
//     attrs?: { src?: string; align?: 'left' | 'center' | 'right' | 'justify'; [key: string]: any };
// }

// // --- CORE PARSER ---

// // Update: nodeToDocx sekarang menerima `ctx` (NumberingContext)
// async function nodeToDocx(
//     node: TiptapNode, 
//     ctx: NumberingContext,
//     options: { isHeader?: boolean, level?: number, listRef?: string } = {}
// ): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const currentLevel = options.level || 0;

//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (alignAttr?: string) => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         if (alignAttr === 'left') return AlignmentType.LEFT;
//         return AlignmentType.BOTH; 
//     };

//     switch (node.type) {
//         case 'paragraph':
//             return new Paragraph({
//                 children: createTextRuns(node.content),
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'orderedList': {
//             // LOGIKA RESET NUMBERING:
//             // Jika options.listRef sudah ada, berarti ini adalah nested list (sub-point), gunakan ref parent.
//             // Jika belum ada, berarti ini adalah list induk baru. Buat ref unik baru agar nomor reset ke 1.
//             let listRef = options.listRef;
            
//             if (!listRef) {
//                 listRef = `ordered-list-${ctx.counter++}`; // Generate ID unik
//                 // Tambahkan config untuk ID ini ke context
//                 ctx.configs.push(createOrderedListConfig(listRef));
//             }

//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItem of node.content) {
//                     if (listItem.type === 'listItem' && listItem.content) {
//                         for (const itemContent of listItem.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: listRef, // Gunakan ref dinamis
//                                         level: currentLevel,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             } else if (itemContent.type === 'orderedList' || itemContent.type === 'bulletList') {
//                                 // Recursive call: Teruskan listRef yang sama untuk nested ordered list
//                                 // (Logic Word: nested level pakai ref sama tapi level naik)
//                                 const nested = await nodeToDocx(itemContent, ctx, { 
//                                     ...options, 
//                                     level: currentLevel + 1,
//                                     listRef: listRef // PASS REFERENCE KE ANAK
//                                 });
//                                 if (nested && Array.isArray(nested)) listItems.push(...nested);
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;
//         }

//         case 'bulletList': {
//             // Bullet list biasanya aman pakai statis ref karena simbolnya sama
//             const listRef = "my-bullet-points"; 
            
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItem of node.content) {
//                     if (listItem.type === 'listItem' && listItem.content) {
//                         for (const itemContent of listItem.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: listRef,
//                                         level: currentLevel,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             } else if (itemContent.type === 'orderedList' || itemContent.type === 'bulletList') {
//                                 const nested = await nodeToDocx(itemContent, ctx, { 
//                                     ...options, 
//                                     level: currentLevel + 1 
//                                 });
//                                 if (nested && Array.isArray(nested)) listItems.push(...nested);
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;
//         }

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 }, type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             // ... (Kode table sama, pastikan pass ctx)
//             const tableRows: TableRow[] = [];
//             if (node.content) {
//                 for (const rowNode of node.content) {
//                     if (rowNode.type === 'tableRow' && rowNode.content) {
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, ctx, { isHeader }); // PASS CTX
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) cellParagraphs.push(...docxElement);
//                                             else if (docxElement instanceof Paragraph) cellParagraphs.push(docxElement);
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: fullThinBorder,
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }

// // Update: parseTiptapContent menerima ctx
// async function parseTiptapContent(sections: any[], ctx: NumberingContext): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }

//     let i = 0;
//     for (const section of sections) {
//         const noCell = new TableCell({
//             children: [new Paragraph({ text: (i + 1).toString(), alignment: AlignmentType.CENTER })],
//             borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.TOP,
//         });

//         const labelCell = new TableCell({
//             children: [new Paragraph({ text: section.title || "" })],
//             borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.TOP,
//         });

//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;

//         if (tiptapJson && tiptapJson.type === 'doc' && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) continue;
                
//                 // PASS CTX DI SINI
//                 const docxElement = await nodeToDocx(node, ctx); 
                
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) contentChildren.push(...docxElement);
//                     else contentChildren.push(docxElement);
//                 }
//             }
//         }

//         if (contentChildren.length === 0) contentChildren.push(new Paragraph(""));

//         const contentCell = new TableCell({
//             children: contentChildren,
//             borders: fullThinBorder, margins: cellMargins,
//         });

//         tableRows.push(new TableRow({ children: [noCell, labelCell, contentCell] }));
//         i++;
//     }
//     return tableRows;
// }


// // --- API ROUTE UTAMA ---

// type JikApproverWithApprover = JikApprover & { approver: Approver; };

// // (Fungsi Helper Approver & Info Table tetap sama, saya singkat untuk fokus ke numbering)
// function createJikApproverTable(approvers: JikApproverWithApprover[]): Table {
//     // ... [Kode createJikApproverTable sama persis dengan sebelumnya] ...
//     // Agar kode tidak terlalu panjang di chat, asumsikan logika tabel approver 
//     // sama seperti jawaban sebelumnya. Jika perlu, copy dari jawaban sebelumnya.
//     // Tapi karena Anda minta "kode lengkap", saya tulis ulang versi ringkasnya yang bekerja:
    
//     const grouped: { [key: string]: JikApproverWithApprover[] } = { Inisiator: [], Pemeriksa: [], 'Pemberi Persetujuan': [] };
//     approvers.forEach(appr => { if (appr.approver_type && grouped[appr.approver_type]) grouped[appr.approver_type].push(appr); });

//     const headerRow = new TableRow({
//         children: ["", "Jabatan", "Nama", "Tanda Tangan", "Catatan"].map(text => 
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins })
//         )
//     });

//     const rows: TableRow[] = [headerRow];
//     const createDataRows = (type: string, list: JikApproverWithApprover[]) => {
//         if (list.length === 0) {
//             rows.push(new TableRow({ children: Array(5).fill(null).map((_, idx) => new TableCell({ children: [new Paragraph(idx===0?type:"")], verticalMerge: idx===0?"restart":undefined, borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER })) }));
//             return;
//         }
//         list.forEach((appr, index) => {
//             const nameParagraphs: Paragraph[] = [new Paragraph(appr.approver.name || "")];
//             if (appr.approver.nik) nameParagraphs.push(new Paragraph(appr.approver.nik));
//             rows.push(new TableRow({ children: [
//                 new TableCell({ children: [new Paragraph(index === 0 ? type : "")], verticalMerge: index === 0 ? "restart" : "continue", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                 new TableCell({ children: [new Paragraph(appr.approver.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                 new TableCell({ children: nameParagraphs, borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                 new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                 new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//             ]}));
//         });
//     };
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows, columnWidths: [15, 25, 25, 15, 20] });
// }

// function createJikInfoTable(jikData: Jik): Table {
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
//         const displayText = key === "Contract Duration" ? (valText ? `: ${valText} Tahun` : "") : `: ${valText}`;
//         return new TableRow({ children: [
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })], borders: fullNoBorder, width: { size: 30, type: WidthType.PERCENTAGE }, margins: cellMargins, verticalAlign: VerticalAlign.TOP }),
//             new TableCell({ children: [new Paragraph({ text: displayText, alignment: AlignmentType.BOTH })], borders: fullNoBorder, width: { size: 70, type: WidthType.PERCENTAGE }, margins: cellMargins, verticalAlign: VerticalAlign.TOP }),
//         ]});
//     };
//     return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit)], columnWidths: [4000, 5500], borders: fullNoBorder });
// }

// export async function POST(req: Request) {
//     try {
//         const body = await req.json();
//         const jikId = body.jikId;
//         if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//         const jikData = await prisma.jik.findUnique({
//             where: { id: parseInt(jikId as string) },
//             include: { company: true, jik_approvers: { include: { approver: true } } },
//         });
//         if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//         // --- INISIALISASI CONTEXT NUMBERING ---
//         // Context ini akan dibawa keliling ke dalam fungsi parser untuk menampung config dinamis
//         const numberingCtx: NumberingContext = {
//             configs: [STATIC_BULLET_CONFIG], // Masukkan bullet config default
//             counter: 1
//         };

//         const approverTable = createJikApproverTable(jikData.jik_approvers);
//         const infoTable = createJikInfoTable(jikData);
        
//         // Parse konten dengan membawa numberingCtx
//         const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || [], numberingCtx);

//         // Header Table Konten Utama
//         const mainContentHeaderRow = new TableRow({
//             children: [
//                 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins, shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" }, width: { size: 5, type: WidthType.PERCENTAGE } }),
//                 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins, shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" }, width: { size: 35, type: WidthType.PERCENTAGE } }),
//                 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins, shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" }, width: { size: 60, type: WidthType.PERCENTAGE } }),
//             ]
//         });

//         const mainContentTable = new Table({
//             width: { size: 100, type: WidthType.PERCENTAGE },
//             columnWidths: [500, 4000, 5000],
//             rows: [mainContentHeaderRow, ...parsedContentTableRows]
//         });

//         // --- MEMBUAT DOKUMEN ---
//         const doc = new Document({
//             // PENTING: Masukkan semua config yang sudah terkumpul di numberingCtx
//             numbering: {
//                 config: numberingCtx.configs
//             },
//             sections: [{
//                 headers: { default: new Header({ children: [] }) },
//                 footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true })] })] }) },
//                 properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
//                 children: [
//                     new Paragraph({ children: [new TextRun({ text: "LEMBAR PENGESAHAN", color: "000000" })], heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
//                     approverTable,
//                     new Paragraph({ text: "", spacing: { after: 400 } }),
//                     new Paragraph({ children: [new TextRun({ text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)", color: "000000" })], heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, pageBreakBefore: true }),
//                     new Paragraph({ children: [new TextRun({ text: jikData.judul.toUpperCase(), color: "000000" })], heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
//                     new Paragraph({ children: [new TextRun({ text: `No: ${jikData.no || 'xxx'}`, color: "000000" })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
//                     infoTable,
//                     new Paragraph({ text: "", spacing: { after: 400 } }),
//                     mainContentTable,
//                 ],
//             }],
//         });

//         const buffer = await Packer.toBuffer(doc);
//         const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//         const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//         const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//         return new NextResponse(Uint8Array.from(buffer), {
//             status: 200,
//             headers: {
//                 "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//                 "Content-Disposition": `attachment; filename="${fileName}"`,
//             },
//         });

//     } catch (error: any) {
//         console.error("Error generating JIK DOCX:", error);
//         return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//     }
// }


// // src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType, LevelFormat
// } from "docx";
// // Impor 'Approver' juga
// import { Jik, JikApprover, Approver } from "@prisma/client";

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) DIPERBAIKI (Mendukung Multi-Level) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022", // Bullet bulat hitam
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//                 {
//                     level: 1,
//                     format: "bullet" as const,
//                     text: "\u25E6", // Bullet bulat putih
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
//                 },
//                 {
//                     level: 2,
//                     format: "bullet" as const,
//                     text: "\u25AA", // Bullet kotak
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 2160, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//                 {
//                     level: 1,
//                     format: "lowerLetter" as const, // a., b., c.
//                     text: "%2.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
//                 },
//                 {
//                     level: 2,
//                     format: "lowerRoman" as const, // i., ii., iii.
//                     text: "%3.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 2160, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP ---
// interface TiptapNode {
//     type: string;
//     content?: TiptapNode[];
//     text?: string;
//     marks?: { type: string }[];
//     attrs?: { src?: string; align?: 'left' | 'center' | 'right' | 'justify'; [key: string]: any };
// }

// // UPDATE: Tambahkan parameter 'level' pada options untuk recursivity
// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean, level?: number } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     // Ambil level saat ini, default 0
//     const currentLevel = options.level || 0;

//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     const getAlignment = (
//         alignAttr?: 'left' | 'center' | 'right' | 'justify'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         if (alignAttr === 'left') return AlignmentType.LEFT;
//         if (alignAttr === 'justify') return AlignmentType.BOTH;
//         return AlignmentType.BOTH; // Default justify
//     };

//     switch (node.type) {
//         case 'paragraph':
//             const runs = createTextRuns(node.content);
//             return new Paragraph({
//                 children: runs,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) {
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
                            
//                             // 1. Jika konten adalah Paragraf
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: currentLevel, // Gunakan level dinamis
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align),
//                                 }));
//                             } 
//                             // 2. [PERBAIKAN UTAMA] Jika konten adalah Nested List (Sub-point)
//                             else if (itemContent.type === 'bulletList' || itemContent.type === 'orderedList') {
//                                 // Panggil recursive dengan level + 1
//                                 const nestedList = await nodeToDocx(itemContent, { ...options, level: currentLevel + 1 });
//                                 if (nestedList) {
//                                     if (Array.isArray(nestedList)) {
//                                         listItems.push(...nestedList);
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 }, type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align),
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) {
//                 for (const rowNode of node.content) {
//                     if (rowNode.type === 'tableRow' && rowNode.content) {
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align),
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }


// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }

//     let i = 0;
//     for (const section of sections) {

//         // --- CELL 1: NOMOR ---
//         const noCell = new TableCell({
//             children: [new Paragraph({
//                 text: (i + 1).toString(),
//                 alignment: AlignmentType.CENTER,
//             })],
//             borders: fullThinBorder,
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP,
//         });

//         // --- CELL 2: LABEL ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({
//                 text: section.title || "",
//             })],
//             borders: fullThinBorder,
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP,
//         });

//         // --- CELL 3: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;

//         if (tiptapJson && tiptapJson.type === 'doc' && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 // Lewati paragraf kosong yang tidak memiliki konten
//                 if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
//                     continue;
//                 }

//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         }

//         if (contentChildren.length === 0) {
//             contentChildren.push(new Paragraph(""));
//         }

//         const contentCell = new TableCell({
//             children: contentChildren,
//             borders: fullThinBorder,
//             margins: cellMargins,
//         });

//         tableRows.push(new TableRow({
//             children: [noCell, labelCell, contentCell]
//         }));

//         i++;
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---


// // Definisikan tipe data yang akan kita gunakan
// type JikApproverWithApprover = JikApprover & {
//     approver: Approver;
// };


// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApproverWithApprover[]): Table {
//     const grouped: { [key: string]: JikApproverWithApprover[] } = {
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         const type = appr.approver_type;
//         if (type && (type === 'Inisiator' || type === 'Pemeriksa' || type === 'Pemberi Persetujuan')) {
//             grouped[type].push(appr);
//         }
//     });

//     // Buat baris header
//     const headerRow = new TableRow({
//         children: [
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     const createDataRows = (type: string, list: JikApproverWithApprover[]) => {
//         if (list.length === 0) {
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {
//             const nameParagraphs: Paragraph[] = [
//                 new Paragraph(appr.approver.name || "")
//             ];

//             if (appr.approver.nik) {
//                 nameParagraphs.push(new Paragraph(appr.approver.nik));
//             }

//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({
//                         children: [new Paragraph(index === 0 ? type : "")],
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER
//                     }),
//                     new TableCell({ children: [new Paragraph(appr.approver.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({
//                         children: nameParagraphs,
//                         borders: fullThinBorder,
//                         margins: cellMargins,
//                         verticalAlign: VerticalAlign.CENTER
//                     }),
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [15, 25, 25, 15, 20],
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? `: ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder,
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 new TableCell({
//                     children: [new Paragraph({
//                         text: displayText,
//                         alignment: AlignmentType.BOTH
//                     })],
//                     borders: fullNoBorder,
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership),
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder,
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//     try {
//         const body = await req.json();
//         const jikId = body.jikId;

//         if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//         const jikData = await prisma.jik.findUnique({
//             where: { id: parseInt(jikId as string) },
//             include: {
//                 company: true,
//                 jik_approvers: {
//                     include: {
//                         approver: true
//                     }
//                 }
//             },
//         });

//         if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//         const approverTable = createJikApproverTable(jikData.jik_approvers);
//         const infoTable = createJikInfoTable(jikData);
//         const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//         const mainContentHeaderRow = new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 5, type: WidthType.PERCENTAGE },
//                 }),
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 35, type: WidthType.PERCENTAGE },
//                 }),
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 60, type: WidthType.PERCENTAGE },
//                 }),
//             ]
//         });

//         const mainContentTable = new Table({
//             width: { size: 100, type: WidthType.PERCENTAGE },
//             columnWidths: [500, 4000, 5000],
//             rows: [
//                 mainContentHeaderRow,
//                 ...parsedContentTableRows,
//             ]
//         });

//         const doc = new Document({
//             numbering: numberingConfig,
//             sections: [{
//                 headers: { default: new Header({ children: [] }) },
//                 footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }),], }),], }) },

//                 properties: {
//                     page: {
//                         margin: {
//                             top: 1440,
//                             right: 1440,
//                             bottom: 1440,
//                             left: 1440,
//                         }
//                     }
//                 },

//                 children: [
//                     new Paragraph({
//                         children: [new TextRun({ text: "LEMBAR PENGESAHAN", color: "000000" })],
//                         heading: HeadingLevel.HEADING_1,
//                         alignment: AlignmentType.CENTER,
//                         spacing: { after: 200 }
//                     }),

//                     approverTable,
//                     new Paragraph({ text: "", spacing: { after: 400 } }),

//                     new Paragraph({
//                         children: [new TextRun({ text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)", color: "000000" })],
//                         heading: HeadingLevel.HEADING_1,
//                         alignment: AlignmentType.CENTER,
//                         pageBreakBefore: true,
//                     }),

//                     new Paragraph({
//                         children: [new TextRun({ text: jikData.judul.toUpperCase(), color: "000000" })],
//                         heading: HeadingLevel.HEADING_2,
//                         alignment: AlignmentType.CENTER,
//                     }),
//                     new Paragraph({
//                         children: [new TextRun({ text: `No: ${jikData.no || 'xxx'}`, color: "000000" })],
//                         alignment: AlignmentType.CENTER,
//                         spacing: { after: 300 }
//                     }),

//                     infoTable,
//                     new Paragraph({ text: "", spacing: { after: 400 } }),

//                     mainContentTable,
//                 ],
//             }],
//         });

//         const buffer = await Packer.toBuffer(doc);
//         const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//         const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//         const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//         return new NextResponse(Uint8Array.from(buffer), {
//             status: 200,
//             headers: {
//                 "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//                 "Content-Disposition": `attachment; filename="${fileName}"`,
//             },
//         });

//     } catch (error: any) {
//         console.error("Error generating JIK DOCX:", error);
//         return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//     }
// }

// // src/app/api/jik/generate-docx/route.ts

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma/postgres";
// import {
//     Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, VerticalAlign, BorderStyle, Header, Footer, PageNumber, IBorderOptions, ShadingType,
// } from "docx";
// // Impor 'Approver' juga
// import { Jik, JikApprover, Approver } from "@prisma/client"; 

// // --- HELPER UNTUK GAMBAR & NAMA FILE (DIPAKAI ULANG DARI MOM) ---
// async function fetchImage(url: string): Promise<Buffer | undefined> {
//     try {
//         const response = await fetch(url);
//         if (!response.ok) {
//             console.error(`Gagal fetch image: ${response.status} ${response.statusText}`);
//             return undefined;
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         return Buffer.from(arrayBuffer);
//     } catch (error) {
//         console.error("Error fetching image:", error);
//         return undefined;
//     }
// }

// function sanitizeFileName(name: string): string {
//     if (!name) return "";
//     return name.trim().replace(/[\\/:*?"<>|]/g, '_');
// }

// // --- Style Border ---
// const thinBlackBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
// // Menggunakan .NIL untuk memastikan border benar-benar hilang
// const noBorder: IBorderOptions = { style: BorderStyle.NIL, size: 0, color: "auto" };
// const dottedBorder: IBorderOptions = { style: BorderStyle.DOTTED, size: 6, color: "000000" };
// const fullThinBorder = { top: thinBlackBorder, bottom: thinBlackBorder, left: thinBlackBorder, right: thinBlackBorder };
// // Definisi ini menghilangkan border luar (top, bottom, left, right) dan dalam (insideH, insideV)
// const fullNoBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder };


// // --- Cell Margins ---
// const cellMargins = { top: 100, bottom: 100, left: 100, right: 100 };

// // --- KONFIGURASI NUMBERING (LIST) (DIPAKAI ULANG DARI MOM) ---
// const numberingConfig = {
//     config: [
//         {
//             reference: "my-bullet-points",
//             levels: [
//                 {
//                     level: 0,
//                     format: "bullet" as const,
//                     text: "\u2022",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//         {
//             reference: "my-ordered-list",
//             levels: [
//                 {
//                     level: 0,
//                     format: "decimal" as const,
//                     text: "%1.",
//                     alignment: AlignmentType.LEFT,
//                     style: { paragraph: { indent: { left: 720, hanging: 360 } } },
//                 },
//             ],
//         },
//     ],
// };

// // --- PARSER KONTEN TIPTAP (DIPAKAI ULANG DARI MOM) ---
// interface TiptapNode {
//     type: string;
//     content?: TiptapNode[];
//     text?: string;
//     marks?: { type: string }[];
//     attrs?: { src?: string; align?: 'left' | 'center' | 'right' | 'justify'; [key: string]: any }; 
// }

// async function nodeToDocx(node: TiptapNode, options: { isHeader?: boolean } = {}): Promise<(Paragraph | Table | Paragraph[]) | undefined> {
    
//     const createTextRuns = (content: TiptapNode[] | undefined): TextRun[] => {
//         const textRuns: TextRun[] = [];
//         if (content) {
//             for (const child of content) {
//                 if (child.type === 'text' && child.text) {
//                     textRuns.push(new TextRun({
//                         text: child.text || "",
//                         bold: options.isHeader || child.marks?.some(m => m.type === 'bold'),
//                         italics: child.marks?.some(m => m.type === 'italic'),
//                     }));
//                 }
//             }
//         }
//         // Jika tidak ada text run, kembalikan satu text run kosong
//         return textRuns.length === 0 ? [new TextRun("")] : textRuns;
//     };

//     // --- Gunakan AlignmentType.BOTH ---
//     const getAlignment = (
//         alignAttr?: 'left' | 'center' | 'right' | 'justify'
//     ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
//         if (alignAttr === 'center') return AlignmentType.CENTER;
//         if (alignAttr === 'right') return AlignmentType.RIGHT;
//         if (alignAttr === 'left') return AlignmentType.LEFT;
//         // Pustaka docx menggunakan 'BOTH' untuk 'justify'
//         if (alignAttr === 'justify') return AlignmentType.BOTH; 
        
//         // Default ke 'BOTH' (justify)
//         return AlignmentType.BOTH; 
//     };
//     // --- AKHIR PERBAIKAN ---

//     switch (node.type) {
//         case 'paragraph':
//             const runs = createTextRuns(node.content);
//             return new Paragraph({ 
//                 children: runs,
//                 alignment: getAlignment(node.attrs?.align), // Ini sekarang akan default ke justify
//             });

//         case 'bulletList':
//         case 'orderedList':
//             const listItems: Paragraph[] = [];
//             if (node.content) {
//                 for (const listItemNode of node.content) { 
//                     if (listItemNode.type === 'listItem' && listItemNode.content) {
//                         for (const itemContent of listItemNode.content) {
//                             if (itemContent.type === 'paragraph') {
//                                 listItems.push(new Paragraph({
//                                     children: createTextRuns(itemContent.content),
//                                     numbering: {
//                                         reference: node.type === 'bulletList' ? "my-bullet-points" : "my-ordered-list",
//                                         level: 0,
//                                     },
//                                     alignment: getAlignment(itemContent.attrs?.align), // Ini juga akan default ke justify
//                                 }));
//                             }
//                         }
//                     }
//                 }
//             }
//             return listItems;

//         case 'image':
//             if (node.attrs?.src) {
//                 const imgBuffer = await fetchImage(node.attrs.src);
//                 if (imgBuffer) {
//                     return new Paragraph({
//                         children: [new ImageRun({ data: imgBuffer.toString("base64"), transformation: { width: 450, height: 300 },type: "jpg", } as any)],
//                         alignment: getAlignment(node.attrs?.align), // Image alignment tetap menghormati setting
//                     });
//                 }
//             }
//             return undefined;

//         case 'table':
//             const tableRows: TableRow[] = [];
//             if (node.content) { 
//                 for (const rowNode of node.content) { 
//                     if (rowNode.type === 'tableRow' && rowNode.content) { 
//                         const cells: TableCell[] = [];
//                         for (const cellNode of rowNode.content) {
//                             if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
//                                 const isHeader = cellNode.type === 'tableHeader';
//                                 const cellParagraphs: Paragraph[] = [];
//                                 if (cellNode.content) {
//                                     for (const cellContentNode of cellNode.content) {
//                                         const docxElement = await nodeToDocx(cellContentNode, { isHeader: isHeader });
//                                         if (docxElement) {
//                                             if (Array.isArray(docxElement)) {
//                                                 cellParagraphs.push(...docxElement);
//                                             } else if (docxElement instanceof Paragraph) {
//                                                 cellParagraphs.push(docxElement);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 cells.push(new TableCell({
//                                     children: cellParagraphs.length === 0 ? [new Paragraph("")] : cellParagraphs,
//                                     borders: { top: thinBlackBorder, left: thinBlackBorder, bottom: thinBlackBorder, right: thinBlackBorder },
//                                     verticalAlign: VerticalAlign.CENTER,
//                                     margins: cellMargins,
//                                     shading: isHeader ? { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" } : undefined,
//                                 }));
//                             }
//                         }
//                         tableRows.push(new TableRow({ children: cells }));
//                     }
//                 }
//             }
//             return new Table({
//                 width: { size: 100, type: WidthType.PERCENTAGE },
//                 rows: tableRows,
//                 alignment: getAlignment(node.attrs?.align), // Alignment tabel
//             });

//         default:
//             if (node.content) {
//                 return new Paragraph({ children: createTextRuns(node.content) });
//             }
//             return new Paragraph({ children: [new TextRun("")] });
//     }
// }


// async function parseTiptapContent(sections: any[]): Promise<TableRow[]> {
//     const tableRows: TableRow[] = [];
//     if (!Array.isArray(sections)) { return tableRows; }
    
//     let i = 0;
//     for (const section of sections) {
        
//         // --- CELL 1: NOMOR ---
//         const noCell = new TableCell({
//              children: [new Paragraph({ 
//                 text: (i + 1).toString(),
//                 alignment: AlignmentType.CENTER,
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 2: LABEL (DIUBAH KE .title) ---
//         const labelCell = new TableCell({
//             children: [new Paragraph({ 
//                 text: section.title || "", // <-- Menggunakan .title
//             })],
//             borders: fullThinBorder, 
//             margins: cellMargins,
//             verticalAlign: VerticalAlign.TOP, 
//         });

//         // --- CELL 3: CONTENT ---
//         const contentChildren: (Paragraph | Table)[] = [];
//         const tiptapJson = section.content as TiptapNode;
        
//         // Cek apakah kontennya ada dan merupakan Tiptap doc
//         if (tiptapJson && tiptapJson.type === 'doc' && Array.isArray(tiptapJson.content)) {
//             for (const node of tiptapJson.content) {
//                 // Periksa apakah node paragraf kosong
//                 if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
//                     continue; // Lewati paragraf kosong
//                 }

//                 const docxElement = await nodeToDocx(node);
//                 if (docxElement) {
//                     if (Array.isArray(docxElement)) {
//                         contentChildren.push(...docxElement);
//                     } else {
//                         contentChildren.push(docxElement);
//                     }
//                 }
//             }
//         } 
        
//         // Jika setelah parsing tidak ada elemen (atau jika datanya kosong), 
//         // pastikan kita tetap memasukkan 1 paragraf kosong agar selnya tidak kolaps
//         if (contentChildren.length === 0) {
//             contentChildren.push(new Paragraph(""));
//         }
        
//         const contentCell = new TableCell({
//             children: contentChildren,
//             borders: fullThinBorder, 
//             margins: cellMargins,
//         });

//         // --- Buat Baris (Sekarang 3 sel) ---
//         tableRows.push(new TableRow({
//             children: [noCell, labelCell, contentCell]
//         }));

//         i++; // Increment nomor
//     }
//     return tableRows;
// }
// // --- AKHIR PARSER TIPTAP ---


// // Definisikan tipe data yang akan kita gunakan
// // Ini adalah JikApprover yang di-include dengan data Approver
// type JikApproverWithApprover = JikApprover & {
//     approver: Approver;
// };


// // --- PARSER APPROVER JIK (BARU) ---
// function createJikApproverTable(approvers: JikApproverWithApprover[]): Table {
//     // Kelompokkan approver berdasarkan tipe (Inisiator, Pemeriksa, Pemberi Persetujuan)
//     const grouped: { [key: string]: JikApproverWithApprover[] } = { 
//         Inisiator: [],
//         Pemeriksa: [],
//         'Pemberi Persetujuan': [],
//     };

//     approvers.forEach(appr => {
//         const type = appr.approver_type; 
//         if (type && (type === 'Inisiator' || type === 'Pemeriksa' || type === 'Pemberi Persetujuan')) {
//             grouped[type].push(appr);
//         }
//     });

//     // Buat baris header (Sekarang 5 kolom)
//     const headerRow = new TableRow({
//         children: [
//             // Kolom 1: Header dikosongkan 
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 2: Jabatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 3: Nama
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nama", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 4: Tanda Tangan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tanda Tangan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//             // Kolom 5: Catatan
//             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Catatan", bold: true })], alignment: AlignmentType.CENTER })], borders: fullThinBorder, margins: cellMargins }),
//         ],
//     });

//     const rows: TableRow[] = [headerRow];

//     // Fungsi untuk membuat baris data (Sekarang 5 kolom)
//     const createDataRows = (type: string, list: JikApproverWithApprover[]) => {
//         if (list.length === 0) {
//             // Jika tidak ada data, buat 1 baris kosong (5 sel)
//             rows.push(new TableRow({
//                 children: [
//                     new TableCell({ children: [new Paragraph(type)], verticalMerge: "restart", borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Jabatan kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Nama kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel TTD kosong
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }), // Sel Catatan kosong
//                 ]
//             }));
//             return;
//         }

//         list.forEach((appr, index) => {

//             // Buat array paragraf untuk Nama dan NIK
//             const nameParagraphs: Paragraph[] = [
//                 new Paragraph(appr.approver.name || "") // Selalu tambahkan nama
//             ];
            
//             // Cek jika NIK ada, tambahkan sebagai paragraf kedua
//             if (appr.approver.nik) {
//                 nameParagraphs.push(new Paragraph(appr.approver.nik));
//             }

//             rows.push(new TableRow({
//                 children: [
//                     // Kolom 1: Tipe (Inisiator, dll)
//                     new TableCell({ 
//                         children: [new Paragraph(index === 0 ? type : "")], 
//                         verticalMerge: index === 0 ? "restart" : "continue",
//                         borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER 
//                     }),
//                     // Kolom 2: Jabatan
//                     new TableCell({ children: [new Paragraph(appr.approver.jabatan || "")], borders: fullThinBorder, margins: cellMargins, verticalAlign: VerticalAlign.CENTER }),
                    
//                     // Kolom 3: Nama (dan NIK)
//                     new TableCell({ 
//                         children: nameParagraphs, // <-- Menggunakan array yang baru dibuat
//                         borders: fullThinBorder, 
//                         margins: cellMargins, 
//                         verticalAlign: VerticalAlign.CENTER 
//                     }),

//                     // Kolom 4: TTD (Kosong)
//                     new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 400, after: 400 } })], borders: fullThinBorder, margins: cellMargins }),
//                     // Kolom 5: Catatan (Kosong)
//                     new TableCell({ children: [new Paragraph("")], borders: fullThinBorder, margins: cellMargins }),
//                 ]
//             }));
//         });
//     };

//     // Buat baris untuk setiap grup
//     createDataRows("Inisiator", grouped.Inisiator);
//     createDataRows("Pemeriksa", grouped.Pemeriksa);
//     createDataRows("Pemberi Persetujuan", grouped['Pemberi Persetujuan']);

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         // Sesuaikan lebar 5 kolom (misalnya: 15% + 25% + 25% + 15% + 20% = 100%)
//         columnWidths: [15, 25, 25, 15, 20], 
//     });
// }
// // --- AKHIR PARSER APPROVER JIK ---

// // --- HELPER UNTUK INFO JIK (BARU) ---
// function createJikInfoTable(jikData: Jik): Table {
//     // Fungsi helper untuk membuat baris Key-Value
//     const createInfoRow = (key: string, value: string | number | null | undefined): TableRow => {
//         const valText = value ? String(value) : "";
        
//         const valuePrefix = key === "Contract Duration" ? "" : ": ";
//         const valueSuffix = key === "Contract Duration" && valText ? `: ${valText} Tahun` : valText;
//         const displayText = key === "Contract Duration" ? valueSuffix : `${valuePrefix}${valueSuffix}`;

//         return new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
//                     borders: fullNoBorder, 
//                     width: { size: 30, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 // --- PERBAIKAN: Tambahkan alignment: AlignmentType.BOTH ---
//                 new TableCell({
//                     children: [new Paragraph({
//                         text: displayText,
//                         alignment: AlignmentType.BOTH // <-- Rata kiri-kanan
//                     })],
//                     borders: fullNoBorder, 
//                     width: { size: 70, type: WidthType.PERCENTAGE },
//                     margins: cellMargins,
//                     verticalAlign: VerticalAlign.TOP,
//                 }),
//                 // --- AKHIR PERBAIKAN ---
//             ],
//         });
//     };

//     const rows: TableRow[] = [
//         createInfoRow("Nama Inisiatif Kemitraan", jikData.initiative_partnership), 
//         createInfoRow("Unit Kerja Pelaksana", jikData.nama_unit),
//         // createInfoRow("Investment Value", jikData.invest_value),
//         // createInfoRow("Contract Duration", jikData.contract_duration_years),
//     ];

//     return new Table({
//         width: { size: 100, type: WidthType.PERCENTAGE },
//         rows: rows,
//         columnWidths: [4000, 5500],
//         borders: fullNoBorder, 
//     });
// }
// // --- AKHIR HELPER INFO JIK ---


// // --- API ROUTE UTAMA (JIK) ---
// export async function POST(req: Request) {
//     try {
//         const body = await req.json();
//         const jikId = body.jikId; // Ubah dari momId ke jikId

//         if (!jikId) { return NextResponse.json({ error: "JIK ID is required" }, { status: 400 }); }

//         // Ambil data JIK dari database
//         const jikData = await prisma.jik.findUnique({
//             where: { id: parseInt(jikId as string) },
//             // Lakukan nested include untuk 'approver'
//             include: {
//                 company: true, 
//                 jik_approvers: {
//                     include: {
//                         approver: true // <-- Ini akan mengambil data 'name', 'jabatan', dan 'nik'
//                     }
//                 }
//             },
//         });

//         if (!jikData) { return NextResponse.json({ error: "JIK not found" }, { status: 404 }); }

//         // 1. Buat Tabel Lembar Pengesahan
//         const approverTable = createJikApproverTable(jikData.jik_approvers);

//         // 2. Buat Tabel Info JIK (Key-Value)
//         const infoTable = createJikInfoTable(jikData);

//         // 3. Parse Konten Tiptap (document_initiative) 
//         const parsedContentTableRows = await parseTiptapContent(jikData.document_initiative as any[] || []);

//         // 4. Buat Tabel Konten Utama (yang berisi Tiptap)
        
//         // --- BUAT HEADER ROW BARU ---
//         const mainContentHeaderRow = new TableRow({
//             children: [
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 5, type: WidthType.PERCENTAGE }, // Kolom No kecil
//                 }),
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "DOKUMEN INISIATIF", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 35, type: WidthType.PERCENTAGE }, // Kolom Label
//                 }),
//                 new TableCell({
//                     children: [new Paragraph({ children: [new TextRun({ text: "KETERANGAN", bold: true })], alignment: AlignmentType.CENTER })],
//                     borders: fullThinBorder,
//                     margins: cellMargins,
//                     shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
//                     width: { size: 60, type: WidthType.PERCENTAGE }, // Kolom Isi
//                 }),
//             ]
//         });

//         const mainContentTable = new Table({
//             width: { size: 100, type: WidthType.PERCENTAGE },
//             // Lebar 3 kolom
//             columnWidths: [500, 4000, 5000], 
//             rows: [
//                 mainContentHeaderRow, // Header
//                 ...parsedContentTableRows, // Isi
//             ]
//         });


//         // --- Gabungkan Semua Elemen di Dokumen ---
//         const doc = new Document({
//             numbering: numberingConfig, // Pakai ulang config numbering
//             sections: [{
//                 // JIK tidak memiliki header berulang seperti MOM
//                 headers: { default: new Header({ children: [] }) }, // Header kosong
                
//                 // Footer (Boleh pakai ulang)
//                 footers: { default: new Footer({ children: [ new Paragraph({ alignment: AlignmentType.RIGHT, children: [ new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], italics: true }), ], }), ], }) },
                
//                 properties: {
//                     page: {
//                         margin: {
//                             top: 1440, 
//                             right: 1440,
//                             bottom: 1440,
//                             left: 1440,
//                         }
//                     }
//                 },

//                 // Urutan anak-anak dokumen
//                 children: [
//                     // 1. Judul Halaman - LEMBAR PENGESAHAN (DIUBAH WARNANYA)
//                     new Paragraph({
//                         children: [new TextRun({ text: "LEMBAR PENGESAHAN", color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         heading: HeadingLevel.HEADING_1,
//                         alignment: AlignmentType.CENTER,
//                         spacing: { after: 200 }
//                     }),
                    
//                     // 2. Tabel Approver
//                     approverTable,
//                     new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//                     // 3. Judul Dokumen - DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK) (DIUBAH WARNANYA)
//                     new Paragraph({
//                         children: [new TextRun({ text: "DOKUMEN JUSTIFIKASI INISIATIF KEMITRAAN (JIK)", color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         heading: HeadingLevel.HEADING_1,
//                         alignment: AlignmentType.CENTER,
//                         pageBreakBefore: true, 
//                     }),
                    
//                     // Sub-judul - FILE JIK 3 (DIUBAH WARNANYA)
//                     new Paragraph({
//                         children: [new TextRun({ text: jikData.judul.toUpperCase(), color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         heading: HeadingLevel.HEADING_2,
//                         alignment: AlignmentType.CENTER,
//                     }),
//                     new Paragraph({
//                         children: [new TextRun({ text: `No: ${jikData.no || 'xxx'}`, color: "000000" })], // <-- TAMBAH COLOR HITAM
//                         alignment: AlignmentType.CENTER,
//                         spacing: { after: 300 }
//                     }),

//                     // 4. Tabel Info JIK (Key-Value)
//                     infoTable, 
//                     new Paragraph({ text: "", spacing: { after: 400 } }), // Spasi

//                     // 5. Tabel Konten Tiptap 
//                     mainContentTable, 

//                 ],
//             }],
//         });

//         // --- Packing dan Kirim ---
//         const buffer = await Packer.toBuffer(doc);
//         const jikTitleSanitized = sanitizeFileName(jikData.judul || 'JIK');
//         const companyNameSanitized = sanitizeFileName(jikData.company?.name || 'Generated');
//         const fileName = `JIK-${jikTitleSanitized}-${companyNameSanitized}.docx`;

//         // Gunakan 'Uint8Array'
//         return new NextResponse(Uint8Array.from(buffer), {
//             status: 200,
//             headers: {
//                 "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//                 "Content-Disposition": `attachment; filename="${fileName}"`,
//             },
//         });

//     } catch (error: any) {
//         console.error("Error generating JIK DOCX:", error);
//         return NextResponse.json({ error: "Failed to generate JIK DOCX", details: error.message }, { status: 500 });
//     }
// }