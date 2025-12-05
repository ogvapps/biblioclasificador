
import * as XLSX from 'xlsx';
import { Book, EducationalStage, LiteraryGenre, Student } from '../types';
import { STAGE_COLORS, GENRE_COLORS } from '../constants';

export const exportToExcel = (books: Book[], filenamePrefix: string = "Biblioteca_Escolar") => {
  const data = books.map(book => ({
    "Título": book.title,
    "Autor": book.author,
    "Edad Estimada": book.age,
    "Etapa Educativa": book.stage,
    "Color Etiqueta (Fondo)": STAGE_COLORS[book.stage]?.label || 'Desconocido',
    "Género": book.genre,
    "Color Punto (Género)": GENRE_COLORS[book.genre]?.label || 'Desconocido',
    "Columna": book.column ? `Columna ${book.column}` : 'N/A',
    "Balda": book.shelf ? `Balda ${book.shelf}` : 'N/A',
    "Sinopsis": book.synopsis || '',
    "Fecha Añadido": new Date(book.addedAt).toLocaleDateString() + ' ' + new Date(book.addedAt).toLocaleTimeString(),
    "ID Sistema": book.id // Useful for deduplication on import
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Auto-width for columns
  const maxWidth = data.length > 0 ? data.reduce((w, r) => Math.max(w, r["Título"]?.length || 0), 10) : 20;
  worksheet["!cols"] = [
    { wch: maxWidth }, // Title
    { wch: 20 }, // Author
    { wch: 10 }, // Age
    { wch: 30 }, // Stage
    { wch: 20 }, // Stage Color
    { wch: 25 }, // Genre
    { wch: 20 }, // Genre Color
    { wch: 15 }, // Columna
    { wch: 15 }, // Balda
    { wch: 50 }, // Sinopsis
    { wch: 20 }, // Date
    { wch: 15 }  // ID
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Biblioteca");

  // Create a timestamp for "Well Classified" naming
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  XLSX.writeFile(workbook, `${filenamePrefix}_${dateStr}_${timeStr}.xlsx`);
};

export const importFromExcel = async (file: File): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const parsedBooks: Book[] = jsonData.map((row: any) => {
          // Helper to extract number from string like "Columna 5"
          const extractNumber = (val: string | number) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
              const matches = val.match(/\d+/);
              return matches ? parseInt(matches[0]) : undefined;
            }
            return undefined;
          };

          // Try to match Stage string to Enum, fallback to input if not found (safer)
          const stageVal = Object.values(EducationalStage).find(s => s === row["Etapa Educativa"]) || row["Etapa Educativa"] as EducationalStage;
          const genreVal = Object.values(LiteraryGenre).find(g => g === row["Género"]) || row["Género"] as LiteraryGenre;

          return {
            id: row["ID Sistema"] || Math.random().toString(36).substr(2, 9),
            title: row["Título"] || "Sin Título",
            author: row["Autor"] || "Desconocido",
            age: parseInt(row["Edad Estimada"]) || 0,
            stage: stageVal,
            genre: genreVal,
            column: extractNumber(row["Columna"]),
            shelf: extractNumber(row["Balda"]),
            synopsis: row["Sinopsis"] || "",
            addedAt: row["Fecha Añadido"] ? new Date(row["Fecha Añadido"]).toISOString() : new Date().toISOString()
          };
        });

        resolve(parsedBooks);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const importStudentsFromExcel = async (file: File): Promise<Student[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const parsedStudents: Student[] = jsonData.map((row: any) => {
          // Map flexible headers
          const name = row["Nombre"] || row["Alumno"] || row["Estudiante"] || "Sin Nombre";
          const course = row["Curso"] || row["Clase"] || row["Grupo"] || "Sin Asignar";

          return {
            id: Math.random().toString(36).substr(2, 9),
            name: String(name).trim(),
            course: String(course).trim(),
            registeredAt: new Date().toISOString()
          };
        }).filter(s => s.name !== "Sin Nombre"); // Basic filter

        resolve(parsedStudents);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const downloadStudentTemplate = () => {
  const data = [
    { "Nombre": "Ej: Juan Pérez García", "Curso": "1º ESO A" },
    { "Nombre": "Ej: María López", "Curso": "4º Primaria" },
    { "Nombre": "Ej: Carlos Ruiz", "Curso": "Infantil 5 años" }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Alumnos");
  
  XLSX.writeFile(workbook, "Plantilla_Importar_Alumnos.xlsx");
};
