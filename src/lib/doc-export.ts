import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import type { Database } from '@/types/database'

type Delegate = Database['public']['Tables']['delegates']['Row']

export const generateAbsentDocx = async (absentDelegates: Delegate[], meetingName: string) => {
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STT", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Họ và tên", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 40, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Đơn vị", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 30, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ghi chú", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 20, type: WidthType.PERCENTAGE } }),
      ],
    }),
    ...absentDelegates.map((d, index) => 
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph(d.name)] }),
          new TableCell({ children: [new Paragraph(d.unit)] }),
          new TableCell({ children: [new Paragraph("")] }),
        ],
      })
    )
  ]

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                bold: true,
                size: 24, // 12pt
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Độc lập - Tự do - Hạnh phúc",
                bold: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: `DANH SÁCH ĐẠI BIỂU VẮNG MẶT`,
                bold: true,
                size: 28, // 14pt
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Hội nghị: ${meetingName}`,
                italics: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Table({
            rows: tableRows,
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Danh_sach_vang_mat.docx");
}
