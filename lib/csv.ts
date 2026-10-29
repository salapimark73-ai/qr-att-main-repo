import { Share } from 'react-native';

type Cell = string | number | null | undefined;

// Turns rows into CSV text (quotes/commas/newlines are escaped).
export function toCSV(rows: Cell[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const v = cell == null ? '' : String(cell);
          return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(',')
    )
    .join('\n');
}

// Opens the phone's share sheet (save to Drive, email, WhatsApp, etc.).
export async function shareCSV(title: string, rows: Cell[][]): Promise<void> {
  try {
    await Share.share({ title, message: toCSV(rows) });
  } catch {
    // user dismissed the share sheet
  }
}
