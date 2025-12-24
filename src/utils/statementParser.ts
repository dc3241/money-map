import type { Transaction, RecurringExpense, RecurringIncome } from '../types';
import { formatDateKey } from './dateUtils';
import { getOccurrencesInMonth } from './recurrenceUtils';
import { parse, differenceInDays } from 'date-fns';

// Dynamic import for pdfjs-dist to work with Vite
let pdfjsLib: any = null;

// Load and configure PDF.js
async function loadPdfJs() {
  if (!pdfjsLib) {
    try {
      // Use Function constructor to create a truly dynamic import that Vite cannot statically analyze
      // This prevents Vite's import analysis from trying to resolve it at build time
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      // Call the dynamic import with the module name - Vite cannot analyze this
      const pdfjsModule = await dynamicImport('pdfjs-dist');
      // pdfjs-dist exports as a namespace, so we use the module directly
      pdfjsLib = pdfjsModule;
      // Configure PDF.js worker for browser
      if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      }
    } catch (error) {
      throw error;
    }
  }
  return pdfjsLib;
}

export interface StatementTransaction {
  date: string; // YYYY-MM-DD
  amount: number; // Positive for income, negative for expense
  description: string;
  type?: 'income' | 'spending'; // Can be inferred from amount
}

export interface ImportResult {
  added: number;
  skipped: number;
  errors: string[];
  skippedTransactions: StatementTransaction[];
}

/**
 * Parse CSV bank statement
 */
export function parseCSVStatement(csvText: string): StatementTransaction[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  const transactions: StatementTransaction[] = [];
  
  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes('date') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handles quoted fields)
    const columns = parseCSVLine(line);
    
    if (columns.length >= 3) {
      try {
        const date = parseDate(columns[0]);
        const amount = parseFloat(columns[1].replace(/[^0-9.-]/g, ''));
        const description = columns[2]?.trim() || '';
        
        if (date && !isNaN(amount) && description) {
          transactions.push({
            date: formatDateKey(date),
            amount: Math.abs(amount),
            description: normalizeDescription(description),
            type: amount >= 0 ? 'income' : 'spending',
          });
        }
      } catch (error) {
        console.error(`Error parsing line ${i + 1}:`, error);
      }
    }
  }
  
  return transactions;
}

/**
 * Parse PDF bank statement
 * Extracts text and attempts to find transaction patterns
 */
export async function parsePDFStatement(file: File): Promise<StatementTransaction[]> {
  try {
    const pdfjs = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const transactions: StatementTransaction[] = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items into lines
      const lines: string[] = [];
      let currentLine = '';
      let lastY = 0;
      
      // Group text items by their Y position to form lines
      interface TextItem {
        str: string;
        transform: number[];
        hasEOL?: boolean;
      }
      
      const textItems: TextItem[] = textContent.items as TextItem[];
      
      // Sort items by Y position (top to bottom)
      const sortedItems = textItems
        .filter(item => item.str && item.str.trim())
        .sort((a, b) => {
          const aY = a.transform?.[5] || 0;
          const bY = b.transform?.[5] || 0;
          return bY - aY; // Higher Y first (top to bottom)
        });
      
      for (let i = 0; i < sortedItems.length; i++) {
        const item = sortedItems[i];
        const currentY = item.transform?.[5] || 0;
        const yDiff = Math.abs(currentY - lastY);
        
        // If Y position changed significantly, start a new line
        if (i > 0 && yDiff > 5) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = item.str || '';
        } else {
          // Same line, append with space
          currentLine += (currentLine ? ' ' : '') + (item.str || '');
        }
        
        lastY = currentY;
        
        // Check for explicit line breaks
        if (item.hasEOL && currentLine.trim()) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
      }
      
      // Add remaining line
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      
      // Parse transactions from lines
      const pageTransactions = extractTransactionsFromText(lines);
      transactions.push(...pageTransactions);
    }
    
    return transactions;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract transactions from text lines using pattern matching
 * This handles common bank statement formats
 */
function extractTransactionsFromText(lines: string[]): StatementTransaction[] {
  const transactions: StatementTransaction[] = [];
  
  // Date patterns (various formats)
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g, // MM/DD/YYYY or DD/MM/YYYY
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,  // YYYY/MM/DD or YYYY-MM-DD
  ];
  
  // Amount patterns (with optional currency symbols and +/-)
  const amountPattern = /([\+\-]?[\$]?[\d,]+\.\d{2})/g;
  
  for (const line of lines) {
    // Skip header/footer lines
    if (isHeaderOrFooter(line)) continue;
    
    // Skip lines that are too short (likely not transactions)
    if (line.length < 10) continue;
    
    // Try to find date and amount in the line
    let foundDate: Date | null = null;
    let foundAmount: number | null = null;
    let description = '';
    
    // Find date - try all patterns
    for (const pattern of datePatterns) {
      const dateMatch = line.match(pattern);
      if (dateMatch && dateMatch.length > 0) {
        // Try the first date found
        foundDate = parseDate(dateMatch[0]);
        if (foundDate) break;
      }
    }
    
    // Find amount - look for numbers that look like money
    const amountMatches = line.match(amountPattern);
    if (amountMatches && amountMatches.length > 0) {
      // Take the last amount (usually the transaction amount, not running balance)
      // But also consider the first if there's only one
      const amountStr = (amountMatches.length > 1 ? amountMatches[amountMatches.length - 1] : amountMatches[0])
        .replace(/[\$,]/g, '')
        .trim();
      foundAmount = parseFloat(amountStr);
      
      // If no explicit sign, check context keywords
      const lowerLine = line.toLowerCase();
      if (foundAmount > 0) {
        if (lowerLine.includes('debit') || lowerLine.includes('withdrawal') || lowerLine.includes('payment')) {
          foundAmount = -Math.abs(foundAmount);
        } else if (lowerLine.includes('credit') || lowerLine.includes('deposit') || lowerLine.includes('income')) {
          foundAmount = Math.abs(foundAmount);
        }
      }
    }
    
    // If we found both date and amount, extract description
    if (foundDate && foundAmount !== null && !isNaN(foundAmount)) {
      // Remove date and amount from line to get description
      description = line
        .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '') // Remove dates (MM/DD/YYYY)
        .replace(/\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g, '') // Remove dates (YYYY-MM-DD)
        .replace(/[\+\-]?[\$]?[\d,]+\.\d{2}/g, '') // Remove amounts
        .replace(/\s+/g, ' ')
        .trim();
      
      // Skip if description is too short (likely not a transaction)
      if (description.length < 3) continue;
      
      // Determine transaction type
      const amount = Math.abs(foundAmount);
      const type: 'income' | 'spending' = foundAmount >= 0 ? 'income' : 'spending';
      
      transactions.push({
        date: formatDateKey(foundDate),
        amount,
        description: description, // Don't normalize here - normalize during matching
        type,
      });
    }
  }
  
  return transactions;
}

/**
 * Check if a line is likely a header or footer
 */
function isHeaderOrFooter(line: string): boolean {
  const lowerLine = line.toLowerCase();
  const headerKeywords = [
    'date', 'description', 'amount', 'balance', 'transaction',
    'statement', 'account', 'page', 'from', 'to', 'account number'
  ];
  const footerKeywords = [
    'page', 'total', 'ending balance', 'continued', 'summary'
  ];
  
  // Check if line contains multiple header keywords
  const headerMatches = headerKeywords.filter(kw => lowerLine.includes(kw)).length;
  if (headerMatches >= 2) return true;
  
  // Check footer patterns
  if (footerKeywords.some(kw => lowerLine.includes(kw)) && line.length < 80) {
    return true;
  }
  
  // Check if line looks like a page number or date range
  if (/^page\s+\d+/i.test(line) || /^\d+\s+of\s+\d+/i.test(line)) {
    return true;
  }
  
  // Check if line is just numbers and separators (likely a separator line)
  if (/^[\d\s\-\.,]+$/.test(line) && line.length > 20) {
    return true;
  }
  
  return false;
}

/**
 * Normalize description for better matching
 */
function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date | null {
  const formats = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy/MM/dd', 'MM-dd-yyyy', 'dd-MM-yyyy'];
  for (const format of formats) {
    try {
      const parsed = parse(dateStr.trim(), format, new Date());
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Check if statement transaction matches an existing transaction
 * @param statementTx The transaction from the statement
 * @param existingTransactionsWithDates Array of transactions with their dates
 * @param dateWindow Number of days to consider for matching (default: 2)
 */
export function matchesExistingTransaction(
  statementTx: StatementTransaction,
  existingTransactionsWithDates: Array<{ transaction: Transaction; date: string }>,
  dateWindow: number = 2
): boolean {
  const statementDate = parse(statementTx.date, 'yyyy-MM-dd', new Date());
  const normalizedDesc = normalizeDescription(statementTx.description);
  
  return existingTransactionsWithDates.some(({ transaction: existing, date: existingDateStr }) => {
    const existingDate = parse(existingDateStr, 'yyyy-MM-dd', new Date());
    const daysDiff = Math.abs(differenceInDays(statementDate, existingDate));
    
    // Check date window
    if (daysDiff > dateWindow) return false;
    
    // Check amount (with small tolerance)
    const amountDiff = Math.abs(statementTx.amount - existing.amount);
    if (amountDiff > 0.01) return false;
    
    // Check description similarity
    const existingDesc = normalizeDescription(existing.description);
    const similarity = calculateSimilarity(normalizedDesc, existingDesc);
    
    // Consider it a match if similarity is high (>80%)
    return similarity > 0.8;
  });
}

/**
 * Check if statement transaction matches a recurring pattern
 */
export function matchesRecurringPattern(
  statementTx: StatementTransaction,
  recurringItems: (RecurringExpense | RecurringIncome)[],
  dateWindow: number = 2
): { matched: boolean; recurringId?: string } {
  const statementDate = parse(statementTx.date, 'yyyy-MM-dd', new Date());
  const normalizedDesc = normalizeDescription(statementTx.description);
  const year = statementDate.getFullYear();
  const month = statementDate.getMonth() + 1;
  
  for (const item of recurringItems) {
    if (!item.isActive) continue;
    
    // Check if amount matches (with tolerance)
    const amountDiff = Math.abs(statementTx.amount - item.amount);
    if (amountDiff > 0.01) continue;
    
    // Check description similarity
    const itemDesc = normalizeDescription(item.description);
    const similarity = calculateSimilarity(normalizedDesc, itemDesc);
    if (similarity < 0.7) continue; // Lower threshold for recurring items
    
    // Check if date matches the recurring pattern
    const occurrences = getOccurrencesInMonth(
      item.pattern,
      year,
      month,
      item.startDate,
      item.endDate
    );
    
    const matchesDate = occurrences.some(occurrence => {
      const daysDiff = Math.abs(differenceInDays(statementDate, occurrence));
      return daysDiff <= dateWindow;
    });
    
    if (matchesDate) {
      return { matched: true, recurringId: item.id };
    }
  }
  
  return { matched: false };
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

