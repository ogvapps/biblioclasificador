/**
 * excelService.ts — Usando ExcelJS (sustituye xlsx que tenía CVE-GHSA-4r6h y CVE-GHSA-5pgg)
 */
import { Workbook } from 'exceljs';
import type { Workbook as WorkbookType } from 'exceljs';
import { Book, Loan, Student, EducationalStage, LiteraryGenre } from '../types';

export interface ExcelSheet {
  sheetName: string;
  data: any[];
}

export const prepareExcelData = (loans: Loan[], books: Book[], students: Student[]): ExcelSheet[] => {
  return [
    {
      sheetName: 'Inventario',
      data: books.map(b => ({
        'Título': b.title,
        'Autor': b.author,
        'Código de Barras': b.barcode || '',
        'Etapa': b.stage,
        'Género': b.genre,
        'Edad Recomendada': b.age,
        'Columna': b.column || '',
        'Balda': b.shelf || '',
        'Estado': b.currentLoanId ? 'Prestado' : 'Disponible',
        'Condición': b.condition || 'Bueno',
        'Valoración Media': b.rating ? b.rating.toFixed(1) : '-',
        'Nº Reseñas': b.totalRatings || 0,
        'Sinopsis': b.synopsis || ''
      }))
    },
    {
      sheetName: 'Préstamos',
      data: loans.map(l => ({
        'Libro': l.bookTitle,
        'Lector': l.studentName,
        'Grupo/Curso': l.course,
        'Fecha Préstamo': l.loanDate ? new Date(l.loanDate).toLocaleDateString() : '',
        'Fecha Vencimiento': l.dueDate ? new Date(l.dueDate).toLocaleDateString() : '',
        'Estado': l.status === 'ACTIVE' ? 'Activo' : 'Devuelto',
        'Fecha Devolución': l.returnDate ? new Date(l.returnDate).toLocaleDateString() : '',
        'Valoración': l.rating || '-'
      }))
    },
    {
      sheetName: 'Lectores',
      data: students.map(s => ({
        'Nombre': s.name,
        'Grupo/Curso': s.course,
        'Email': s.email || '-',
        'Teléfono': s.phone || '-',
        'Código de Barras': s.barcode || '-',
        'Sancionado Hasta': s.sanctionedUntil ? new Date(s.sanctionedUntil).toLocaleDateString() : '-'
      }))
    }
  ];
};

// ─── Helper: build workbook from sheets array ──────────────────────────────────
const buildWorkbook = (sheets: ExcelSheet[]): WorkbookType => {
  const wb = new Workbook();
  wb.creator = 'BiblioClasificador';
  wb.created = new Date();

  for (const { sheetName, data } of sheets) {
    const ws = wb.addWorksheet(sheetName);

    if (data.length === 0) {
      ws.addRow(['(Sin datos)']);
      continue;
    }

    // Header row from first object keys
    const headers = Object.keys(data[0]);
    ws.addRow(headers);

    // Bold + blue header style
    const headerRow = ws.getRow(1);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 20;

    // Data rows
    for (const row of data) {
      ws.addRow(headers.map(h => row[h] ?? ''));
    }

    // Auto-fit column widths (approximate)
    ws.columns.forEach(col => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: false }, cell => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 4, 60);
    });
  }

  return wb;
};

// ─── Helper: trigger browser download ─────────────────────────────────────────
const downloadWorkbook = async (wb: WorkbookType, filename: string): Promise<void> => {
  const cleanName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Public: Export ────────────────────────────────────────────────────────────
export const exportToExcel = async (
  inputData: ExcelSheet[] | Book[] | any[],
  filename: string
): Promise<void> => {
  let sheets: ExcelSheet[];

  if (Array.isArray(inputData) && inputData.length > 0 && 'sheetName' in inputData[0]) {
    sheets = inputData as ExcelSheet[];
  } else {
    // Treat as array of books
    const books = inputData as Book[];
    sheets = [
      {
        sheetName: 'Inventario',
        data: books.map(b => ({
          'Título': b.title,
          'Autor': b.author,
          'Código de Barras': b.barcode || '',
          'Etapa': b.stage,
          'Género': b.genre,
          'Edad': b.age,
          'Columna': b.column || '',
          'Balda': b.shelf || '',
          'Estado': b.currentLoanId ? 'Prestado' : 'Disponible',
          'Valoración': b.rating ? b.rating.toFixed(1) : '-',
          'Sinopsis': b.synopsis || ''
        }))
      }
    ];
  }

  const wb = buildWorkbook(sheets);
  await downloadWorkbook(wb, filename);
};

// ─── Public: Import books ──────────────────────────────────────────────────────
export const importFromExcel = async (file: File): Promise<Partial<Book>[]> => {
  const buffer = await file.arrayBuffer();
  const wb = new Workbook();
  await wb.xlsx.load(buffer);

  // Use 'Inventario' sheet or first available
  const ws = wb.getWorksheet('Inventario') ?? wb.worksheets[0];
  if (!ws) return [];

  const rows: any[][] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    rows.push((row.values as any[]).slice(1)); // values[0] is undefined in exceljs
  });

  // Extract header from row 1
  const headerRow = ws.getRow(1);
  const headers: string[] = (headerRow.values as any[]).slice(1).map(String);

  const parsedBooks: Partial<Book>[] = rows.map(rowVals => {
    const row: Record<string, any> = {};
    headers.forEach((h, i) => { row[h] = rowVals[i] ?? ''; });

    const title = String(row['Título'] || row['Titulo'] || row['Title'] || '').trim();
    const author = String(row['Autor'] || row['Author'] || 'Desconocido').trim();
    const stageRaw = String(row['Etapa'] || row['Stage'] || '').trim();
    const genreRaw = String(row['Género'] || row['Genero'] || row['Genre'] || '').trim();
    const age = parseInt(String(row['Edad'] || row['Edad Recomendada'] || '8'), 10);
    const column = parseInt(String(row['Columna'] || row['Column'] || '1'), 10);
    const shelf = parseInt(String(row['Balda'] || row['Estante'] || row['Shelf'] || '1'), 10);
    const barcode = row['Código de Barras'] || row['Barcode'] ? String(row['Código de Barras'] || row['Barcode']) : undefined;
    const synopsis = row['Sinopsis'] || row['Synopsis'] ? String(row['Sinopsis'] || row['Synopsis']) : undefined;

    const stage = Object.values(EducationalStage).find(s => s.toLowerCase() === stageRaw.toLowerCase()) || EducationalStage.REFERENCIA;
    const genre = Object.values(LiteraryGenre).find(g => g.toLowerCase() === genreRaw.toLowerCase()) || LiteraryGenre.NOVELA;

    return {
      title, author, stage, genre,
      age: isNaN(age) ? 8 : age,
      column: isNaN(column) ? 1 : column,
      shelf: isNaN(shelf) ? 1 : shelf,
      barcode, synopsis
    };
  }).filter(b => b.title && b.title.length > 0);

  return parsedBooks;
};

// ─── Public: Import students ───────────────────────────────────────────────────
export const importStudentsFromExcel = async (file: File): Promise<Partial<Student>[]> => {
  const buffer = await file.arrayBuffer();
  const wb = new Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.getWorksheet('Lectores') ?? wb.worksheets[0];
  if (!ws) return [];

  const headerRow = ws.getRow(1);
  const headers: string[] = (headerRow.values as any[]).slice(1).map(String);

  const parsedStudents: Partial<Student>[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowVals = (row.values as any[]).slice(1);
    const r: Record<string, any> = {};
    headers.forEach((h, i) => { r[h] = rowVals[i] ?? ''; });

    const name = String(r['Nombre'] || r['Name'] || r['Alumno'] || '').trim();
    const course = String(r['Grupo/Curso'] || r['Curso'] || r['Course'] || r['Clase'] || 'Sin Grupo').trim();
    const email = r['Email'] || r['Correo'] ? String(r['Email'] || r['Correo']).trim() : undefined;
    const phone = r['Teléfono'] || r['Telefono'] || r['Phone'] ? String(r['Teléfono'] || r['Telefono'] || r['Phone']).trim() : undefined;
    const barcode = r['Código de Barras'] || r['Barcode'] ? String(r['Código de Barras'] || r['Barcode']).trim() : undefined;

    if (name) parsedStudents.push({ name, course, email, phone, barcode });
  });

  return parsedStudents;
};

// ─── Public: Download student template ────────────────────────────────────────
export const downloadStudentTemplate = async (): Promise<void> => {
  const sheets: ExcelSheet[] = [
    {
      sheetName: 'Lectores',
      data: [
        { 'Nombre': 'García López, María', 'Grupo/Curso': '1º ESO A', 'Email': 'maria.garcia@colegio.es', 'Teléfono': '600123456' },
        { 'Nombre': 'Martínez Ruiz, Alejandro', 'Grupo/Curso': '4º Primaria B', 'Email': '', 'Teléfono': '611987654' },
        { 'Nombre': 'Rodríguez Gómez, Lucas', 'Grupo/Curso': 'Infantil 5 años A', 'Email': 'padres.lucas@email.com', 'Teléfono': '622345678' }
      ]
    }
  ];

  const wb = buildWorkbook(sheets);
  await downloadWorkbook(wb, 'Plantilla_Alumnos.xlsx');
};
