import * as XLSX from 'xlsx';
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

export const exportToExcel = (
  inputData: ExcelSheet[] | Book[] | any[],
  filename: string
): void => {
  const wb = XLSX.utils.book_new();

  // Determine whether inputData is a list of sheets or a list of items (e.g. books)
  let sheets: ExcelSheet[] = [];

  if (Array.isArray(inputData) && inputData.length > 0 && 'sheetName' in inputData[0]) {
    sheets = inputData as ExcelSheet[];
  } else if (Array.isArray(inputData)) {
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

  sheets.forEach(({ sheetName, data }) => {
    const ws = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
};

export const importFromExcel = async (file: File): Promise<Partial<Book>[]> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Use 'Inventario' sheet or first available sheet
  const sheetName = wb.SheetNames.includes('Inventario') ? 'Inventario' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawData: any[] = XLSX.utils.sheet_to_json(ws);

  const parsedBooks: Partial<Book>[] = rawData.map(row => {
    // Map Spanish column headers or standard names
    const title = String(row['Título'] || row['Titulo'] || row['Title'] || '').trim();
    const author = String(row['Autor'] || row['Author'] || 'Desconocido').trim();
    const stageRaw = String(row['Etapa'] || row['Stage'] || '').trim();
    const genreRaw = String(row['Género'] || row['Genero'] || row['Genre'] || '').trim();
    const age = parseInt(row['Edad'] || row['Edad Recomendada'] || '8', 10);
    const column = parseInt(row['Columna'] || row['Column'] || '1', 10);
    const shelf = parseInt(row['Balda'] || row['Estante'] || row['Shelf'] || '1', 10);
    const barcode = row['Código de Barras'] || row['Barcode'] ? String(row['Código de Barras'] || row['Barcode']) : undefined;
    const synopsis = row['Sinopsis'] || row['Synopsis'] ? String(row['Sinopsis'] || row['Synopsis']) : undefined;

    // Match stage enum
    const stage = Object.values(EducationalStage).find(s => s.toLowerCase() === stageRaw.toLowerCase()) || EducationalStage.REFERENCIA;

    // Match genre enum
    const genre = Object.values(LiteraryGenre).find(g => g.toLowerCase() === genreRaw.toLowerCase()) || LiteraryGenre.NOVELA;

    return {
      title,
      author,
      stage,
      genre,
      age: isNaN(age) ? 8 : age,
      column: isNaN(column) ? 1 : column,
      shelf: isNaN(shelf) ? 1 : shelf,
      barcode,
      synopsis
    };
  }).filter(b => b.title && b.title.length > 0);

  return parsedBooks;
};

export const importStudentsFromExcel = async (file: File): Promise<Partial<Student>[]> => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = wb.SheetNames.includes('Lectores') ? 'Lectores' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawData: any[] = XLSX.utils.sheet_to_json(ws);

  const parsedStudents: Partial<Student>[] = rawData.map(row => {
    const name = String(row['Nombre'] || row['Name'] || row['Alumno'] || '').trim();
    const course = String(row['Grupo/Curso'] || row['Curso'] || row['Course'] || row['Clase'] || 'Sin Grupo').trim();
    const email = row['Email'] || row['Correo'] ? String(row['Email'] || row['Correo']).trim() : undefined;
    const phone = row['Teléfono'] || row['Telefono'] || row['Phone'] ? String(row['Teléfono'] || row['Telefono'] || row['Phone']).trim() : undefined;
    const barcode = row['Código de Barras'] || row['Barcode'] ? String(row['Código de Barras'] || row['Barcode']).trim() : undefined;

    return {
      name,
      course,
      email,
      phone,
      barcode
    };
  }).filter(s => s.name && s.name.length > 0);

  return parsedStudents;
};

export const downloadStudentTemplate = (): void => {
  const sampleData = [
    {
      'Nombre': 'García López, María',
      'Curso': '1º ESO A',
      'Email': 'maria.garcia@colegio.es',
      'Teléfono': '600123456'
    },
    {
      'Nombre': 'Martínez Ruiz, Alejandro',
      'Curso': '4º Primaria B',
      'Email': '',
      'Teléfono': '611987654'
    },
    {
      'Nombre': 'Rodríguez Gómez, Lucas',
      'Curso': 'Infantil 5 años A',
      'Email': 'padres.lucas@email.com',
      'Teléfono': '622345678'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Lectores');
  XLSX.writeFile(wb, 'Plantilla_Alumnos.xlsx');
};
