/**
 * Formats a number into Zambian Kwacha (ZMW / K)
 * Example: 148000 -> "K 148,000.00"
 */
export function formatZMW(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'K 0.00';
  }
  return `K ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats ISO date or timestamp into clean display format
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not recorded';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats timestamp with time in Africa/Lusaka context (UTC+2)
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return dateString;
  }
}

/**
 * Generates and downloads a CSV file on the client
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const sanitize = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(sanitize).join(','),
    ...rows.map((row) => row.map(sanitize).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses raw CSV string into rows with support for quoted strings
 */
export function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const row: string[] = [];
    let insideQuotes = false;
    let field = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    row.push(field.trim());
    return row;
  });
}
