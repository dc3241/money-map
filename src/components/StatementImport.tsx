import React, { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { parseCSVStatement, parsePDFStatement, type StatementTransaction, type ImportResult } from '../utils/statementParser';

const StatementImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const importStatements = useBudgetStore((state) => state.importStatements);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      let transactions: StatementTransaction[] = [];
      
      // Determine file type and parse accordingly
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'pdf') {
        transactions = await parsePDFStatement(file);
      } else if (fileExtension === 'csv') {
        const text = await file.text();
        transactions = parseCSVStatement(text);
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or PDF file.');
      }
      
      if (transactions.length === 0) {
        setResult({
          added: 0,
          skipped: 0,
          errors: [
            `No valid transactions found in the ${fileExtension?.toUpperCase()} file. ` +
            'Please check the file format. For PDFs, ensure the statement contains ' +
            'clearly formatted transaction data with dates and amounts.'
          ],
          skippedTransactions: [],
        });
        setIsProcessing(false);
        return;
      }
      
      const importResult = importStatements(transactions);
      setResult(importResult);
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult({
        added: 0,
        skipped: 0,
        errors: [`Failed to import: ${errorMessage}`],
        skippedTransactions: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    // Reset file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const fileType = file?.name.split('.').pop()?.toUpperCase() || 'CSV';

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Import Bank Statement</h2>
      <p className="text-sm text-gray-600 mb-6">
        Upload a CSV or PDF file with your bank transactions. Duplicate transactions will be automatically skipped.
      </p>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-700">
          Upload File (CSV or PDF)
        </label>
        <input
          id="file-input"
          type="file"
          accept=".csv,.pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100
            file:cursor-pointer
            border border-gray-300 rounded-lg p-2"
        />
        <div className="mt-2 text-xs text-gray-500">
          <p className="font-semibold mb-1">Supported Formats:</p>
          <div className="space-y-2">
            <div>
              <p><strong>CSV Format:</strong> Date, Amount, Description</p>
              <p className="ml-4 text-gray-400">Example: 2024-01-15, -50.00, Grocery Store</p>
            </div>
            <div>
              <p><strong>PDF Format:</strong> Bank statement with transaction tables</p>
              <p className="ml-4 text-gray-400">
                The PDF parser automatically extracts dates, amounts, and descriptions from your statement.
                Works best with text-based PDFs (not scanned images).
              </p>
            </div>
          </div>
          <p className="mt-2 text-gray-400">
            Supported date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={handleImport}
          disabled={!file || isProcessing}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg
            hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors font-medium shadow-sm hover:shadow-md"
        >
          {isProcessing ? 'Processing...' : 'Import Transactions'}
        </button>
        
        {file && (
          <button
            onClick={handleReset}
            disabled={isProcessing}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg
              hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {file && !result && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>File selected:</strong> {file.name} ({(file.size / 1024).toFixed(2)} KB) - {fileType} format
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-3 text-gray-800">Import Results:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span className="text-gray-700">
                <strong className="text-green-600">{result.added}</strong> transactions added
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 font-bold">⊘</span>
              <span className="text-gray-700">
                <strong className="text-yellow-600">{result.skipped}</strong> duplicates skipped
              </span>
            </div>
            {result.errors.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-bold">✗</span>
                <span className="text-gray-700">
                  <strong className="text-red-600">{result.errors.length}</strong> errors occurred
                </span>
              </div>
            )}
          </div>
          
          {result.errors.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <strong className="block mb-1">Errors:</strong>
              {result.errors.map((error, i) => (
                <div key={i} className="mb-1">{error}</div>
              ))}
            </div>
          )}

          {result.skippedTransactions.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">
                View skipped transactions ({result.skippedTransactions.length})
              </summary>
              <div className="mt-2 max-h-48 overflow-y-auto text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 px-2 py-1 text-left">Date</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Amount</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.skippedTransactions.slice(0, 20).map((tx, i) => (
                      <tr key={i} className="bg-white">
                        <td className="border border-gray-300 px-2 py-1">{tx.date}</td>
                        <td className="border border-gray-300 px-2 py-1">
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 truncate max-w-xs">
                          {tx.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.skippedTransactions.length > 20 && (
                  <p className="mt-2 text-gray-500 italic">
                    ... and {result.skippedTransactions.length - 20} more
                  </p>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default StatementImport;

