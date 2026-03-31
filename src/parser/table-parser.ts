export interface Table {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export function extractTables(text: string): Table[] {
  const tables: Table[] = [];
  const lines = text.split('\n');
  
  let currentTable: Table | null = null;
  let inTable = false;
  let rowCount = 0;

  for (const line of lines) {
    if (/^\|[\s\-\|]+\|$/.test(line.trim())) {
      inTable = true;
      currentTable = { headers: [], rows: [] };
      continue;
    }

    if (inTable && line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      
      if (rowCount === 0 && currentTable) {
        currentTable.headers = cells;
      } else if (currentTable && cells.length > 0) {
        currentTable.rows.push(cells);
      }
      rowCount++;
    } else if (inTable && currentTable) {
      if (currentTable.rows.length > 0) {
        tables.push(currentTable);
      }
      inTable = false;
      currentTable = null;
      rowCount = 0;
    }
  }

  if (currentTable && currentTable.rows.length > 0) {
    tables.push(currentTable);
  }

  return tables;
}

export function tablesToMarkdown(tables: Table[]): string {
  return tables.map(table => {
    const md: string[] = [];
    
    md.push(`| ${table.headers.join(' | ')} |`);
    md.push(`| ${table.headers.map(() => '---').join(' | ')} |`);
    
    for (const row of table.rows) {
      md.push(`| ${row.join(' | ')} |`);
    }
    
    return md.join('\n');
  }).join('\n\n');
}