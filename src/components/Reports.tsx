import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Category, Transaction } from '../types';
import { Download, Printer, Percent, PiggyBank, ArrowDownLeft, ArrowUpRight, BarChart2, CalendarDays } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ReportsProps {
  userId: string;
  darkMode: boolean;
  transactionsVersion: number;
  currencySymbol: string;
}

export function Reports({ userId, darkMode, transactionsVersion, currencySymbol }: ReportsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Selected Report Month
  const [selectedMonth, setSelectedMonth] = useState('');

  // List of distinct months in transactions
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  const loadData = () => {
    const list = dbService.getTransactions(userId);
    setTransactions(list);
    const cats = dbService.getCategories(userId);
    setCategories(cats);

    // Compute distinct months from existing transactions (format YYYY-MM)
    const months = Array.from(
      new Set(list.map((tx) => tx.transactionDate.substring(0, 7)))
    ).sort((a, b) => b.localeCompare(a)); // Sort descending

    setAvailableMonths(months);

    // Default to current month or latest available month
    const currentStr = new Date().toISOString().substring(0, 7);
    if (months.includes(currentStr)) {
      setSelectedMonth(currentStr);
    } else if (months.length > 0) {
      setSelectedMonth(months[0]);
    } else {
      setSelectedMonth(currentStr);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, transactionsVersion]);

  // Aggregate stats for selected month
  const monthlyTxs = transactions.filter((tx) => tx.transactionDate.startsWith(selectedMonth));

  const totalIncome = monthlyTxs
    .filter((tx) => tx.transactionType === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = monthlyTxs
    .filter((tx) => tx.transactionType === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netProfit = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Breakdown categories
  const expenseBreakdown = categories
    .filter((c) => c.type === 'expense')
    .map((c) => {
      const sum = monthlyTxs
        .filter((tx) => tx.categoryId === c.id && tx.transactionType === 'expense')
        .reduce((s, tx) => s + tx.amount, 0);
      const pct = totalExpense > 0 ? (sum / totalExpense) * 100 : 0;
      return { category: c, amount: sum, percentage: pct };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const incomeBreakdown = categories
    .filter((c) => c.type === 'income')
    .map((c) => {
      const sum = monthlyTxs
        .filter((tx) => tx.categoryId === c.id && tx.transactionType === 'income')
        .reduce((s, tx) => s + tx.amount, 0);
      const pct = totalIncome > 0 ? (sum / totalIncome) * 100 : 0;
      return { category: c, amount: sum, percentage: pct };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Trigger Native PDF generation with jsPDF robust client-side backup
  const handlePrintPDF = () => {
    // 1. Trigger the standard browser print dialog first
    try {
      window.print();
    } catch (e) {
      console.warn("Standard print dialog blocked or unsupported in current container view:", e);
    }

    // 2. Build and download a pristine, professional PDF directly using jsPDF
    // This serves as the ultimate fail-safe for iframe environments.
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Custom helper to render text with perfect vector representation of the Naira symbol ₦
    const drawTextSafe = (txt: string, x: number, y: number, options?: { align?: 'left' | 'right' | 'center' }) => {
      const align = options?.align || 'left';
      
      if (!txt.includes('₦')) {
        doc.text(txt, x, y, options);
        return;
      }

      // To preserve layout, we replace all "₦" with "N" in the string to draw the text first
      const displayTxt = txt.replace(/₦/g, 'N');
      doc.text(displayTxt, x, y, options);

      // Now, let's find all occurrences of '₦' and draw double strike lines over their corresponding 'N's
      const fontSize = doc.getFontSize(); 
      const fontSizeInMm = fontSize * 0.352778; 
      const capHeight = fontSizeInMm * 0.65; 
      
      const nWidth = doc.getTextWidth('N');
      const lineThickness = fontSizeInMm * 0.05; 

      let startX = x;
      if (align === 'right') {
        const totalWidth = doc.getTextWidth(displayTxt);
        startX = x - totalWidth;
      } else if (align === 'center') {
        const totalWidth = doc.getTextWidth(displayTxt);
        startX = x - (totalWidth / 2);
      }

      let currentIdx = -1;
      while ((currentIdx = txt.indexOf('₦', currentIdx + 1)) !== -1) {
        const prefix = displayTxt.substring(0, currentIdx);
        const prefixWidth = doc.getTextWidth(prefix);
        const letterX = startX + prefixWidth;

        const yLine1 = y - (capHeight * 0.38);
        const yLine2 = y - (capHeight * 0.58);
        
        const originalDrawColor = doc.getDrawColor();
        const originalLineWidth = doc.getLineWidth();

        // Dynamically match text color
        let r = 31, g = 41, b = 55;
        const internalColor = (doc as any).internal?.textColor;
        if (internalColor) {
          if (typeof internalColor.r === 'number') {
            r = internalColor.r;
            g = internalColor.g;
            b = internalColor.b;
          } else if (typeof internalColor.g === 'number') {
            r = internalColor.g;
            g = internalColor.g;
            b = internalColor.g;
          } else {
            const colorStr = internalColor.toString();
            const parts = colorStr.split(' ');
            if (parts.length >= 3) {
              r = Math.round(parseFloat(parts[0]) * 255) || 31;
              g = Math.round(parseFloat(parts[1]) * 255) || 41;
              b = Math.round(parseFloat(parts[2]) * 255) || 55;
            }
          }
        }
        doc.setDrawColor(r, g, b);

        doc.setLineWidth(lineThickness);
        const lineStartX = letterX - (nWidth * 0.04);
        const lineEndX = letterX + nWidth + (nWidth * 0.04);
        
        doc.line(lineStartX, yLine1, lineEndX, yLine1);
        doc.line(lineStartX, yLine2, lineEndX, yLine2);

        doc.setLineWidth(originalLineWidth);
        doc.setDrawColor(originalDrawColor);
      }
    };

    // Outer margin boundaries (A4 size is 210 x 297 mm)
    const margin = 14;
    const pageHeight = 297;

    // Header Background Accent Bar
    doc.setFillColor(79, 70, 229); // Royal Indigo Accent
    doc.rect(0, 0, 210, 8, 'F');

    // Main App logo and title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(31, 41, 55); // Slate gray-800
    doc.text("Kallon FinanceTracker", margin, 24);

    // Subtitle & period descriptors
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Slate gray-500
    doc.text(`Financial Ledger Report - Period: ${formatFriendlyMonth(selectedMonth)}`, margin, 31);
    doc.text(`Generated securely on: ${new Date().toLocaleDateString()}`, margin, 36);

    // Decorative horizontal separator
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.setLineWidth(0.5);
    doc.line(margin, 41, 210 - margin, 41);

    // Create 4 summary card blocks side-by-side
    // Width allocation: A4 usable width is 182mm (210 - 28)
    // 4 cards of 42.5mm width with 4mm gaps
    const cardWidth = 42.5;
    const cardGap = 4;
    const cardHeight = 26;
    const cardY = 47;

    // Background card fills
    doc.setFillColor(249, 250, 251); // gray-50
    doc.setDrawColor(229, 231, 235); // gray-200
    
    // Draw 4 cards
    for (let i = 0; i < 4; i++) {
      const cardX = margin + i * (cardWidth + cardGap);
      doc.rect(cardX, cardY, cardWidth, cardHeight, "FD");
    }

    // Populate Cards Data

    // Card 1: Total Income
    let currentX = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Total Income", currentX + 4, cardY + 6);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(16, 124, 65); // Deep green
    drawTextSafe(`${currencySymbol}${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, currentX + 4, cardY + 14);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(`${monthlyTxs.filter(t => t.transactionType === 'income').length} credit flows`, currentX + 4, cardY + 21);

    // Card 2: Total Expenses
    currentX = margin + 1 * (cardWidth + cardGap);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Total Expenses", currentX + 4, cardY + 6);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38); // Red
    drawTextSafe(`${currencySymbol}${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, currentX + 4, cardY + 14);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(`${monthlyTxs.filter(t => t.transactionType === 'expense').length} debit items`, currentX + 4, cardY + 21);

    // Card 3: Net Balance
    currentX = margin + 2 * (cardWidth + cardGap);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Net Balance", currentX + 4, cardY + 6);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    if (netProfit >= 0) {
      doc.setTextColor(79, 70, 229); // Indigo
    } else {
      doc.setTextColor(220, 38, 38); // Red
    }
    const balSign = netProfit < 0 ? '-' : '';
    drawTextSafe(`${balSign}${currencySymbol}${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, currentX + 4, cardY + 14);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(netProfit >= 0 ? "Surplus Margin" : "Deficit Active", currentX + 4, cardY + 21);

    // Card 4: Savings Rate
    currentX = margin + 3 * (cardWidth + cardGap);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Savings Rate", currentX + 4, cardY + 6);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120); // Gray #ABABAB equivalents (120, 120, 120)
    doc.text(`${savingsRate.toFixed(1)}%`, currentX + 4, cardY + 14);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text(savingsRate >= 20 ? "Optimal (>=20%)" : "Caution (<20%)", currentX + 4, cardY + 21);

    // Categorical breakdown lists
    // Two columns side-by-side
    const colWidth = 86;
    const colGap = 10;
    const bodyStartY = 86;

    // LEFT COLUMN: Expenses Categorical Flow
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text("Expenses Categorical Flow", margin, bodyStartY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(156, 163, 175);
    drawTextSafe(`Total Expense: ${currencySymbol}${totalExpense.toFixed(2)}`, margin, bodyStartY + 5);

    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(1);
    doc.line(margin, bodyStartY + 8, margin + colWidth, bodyStartY + 8);

    let expenseY = bodyStartY + 15;
    expenseBreakdown.forEach((item) => {
      if (expenseY > 260) return; // safeguard page boundaries

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(item.category.name, margin, expenseY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      const textVal = `${currencySymbol}${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${item.percentage.toFixed(1)}%)`;
      drawTextSafe(textVal, margin + colWidth, expenseY, { align: 'right' });

      // Draw custom visual indicator bar
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, expenseY + 2.5, colWidth, 2, "F");
      
      doc.setFillColor(239, 68, 68); // Soft Red scale
      const fillWidth = Math.max(1, (item.percentage / 100) * colWidth);
      doc.rect(margin, expenseY + 2.5, fillWidth, 2, "F");

      expenseY += 13;
    });

    if (expenseBreakdown.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text("No expense transactions in this period.", margin, bodyStartY + 15);
    }

    // RIGHT COLUMN: Income Resource Allocation
    const rightColX = margin + colWidth + colGap;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text("Income Resource Allocation", rightColX, bodyStartY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(156, 163, 175);
    drawTextSafe(`Total Income: ${currencySymbol}${totalIncome.toFixed(2)}`, rightColX, bodyStartY + 5);

    doc.setDrawColor(243, 244, 246);
    doc.line(rightColX, bodyStartY + 8, rightColX + colWidth, bodyStartY + 8);

    let incomeY = bodyStartY + 15;
    incomeBreakdown.forEach((item) => {
      if (incomeY > 260) return;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(item.category.name, rightColX, incomeY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      const textVal = `${currencySymbol}${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${item.percentage.toFixed(1)}%)`;
      drawTextSafe(textVal, rightColX + colWidth, incomeY, { align: 'right' });

      // Draw custom visual indicator bar
      doc.setFillColor(243, 244, 246);
      doc.rect(rightColX, incomeY + 2.5, colWidth, 2, "F");
      
      doc.setFillColor(16, 185, 129); // Emerald Green scale
      const fillWidth = Math.max(1, (item.percentage / 100) * colWidth);
      doc.rect(rightColX, incomeY + 2.5, fillWidth, 2, "F");

      incomeY += 13;
    });

    if (incomeBreakdown.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text("No income transactions in this period.", rightColX, bodyStartY + 15);
    }

    // High quality signature footer block
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 16, 210 - margin, pageHeight - 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("Kallon FinanceTracker - Secure Premium Ledger System", margin, pageHeight - 10);
    doc.text("Page 1 of 1", 210 - margin, pageHeight - 10, { align: "right" });

    // Save actual PDF file to browser
    doc.save(`Kallon_Ledger_Report_${selectedMonth || 'Period'}.pdf`);
  };

  const handleExportCSV = () => {
    const rawData = [
      { Section: 'EXPORTS METRICS SUMMARY', Metric: 'Total Income', Value: `${currencySymbol}${totalIncome.toFixed(2)}` },
      { Section: 'EXPORTS METRICS SUMMARY', Metric: 'Total Expenses', Value: `${currencySymbol}${totalExpense.toFixed(2)}` },
      { Section: 'EXPORTS METRICS SUMMARY', Metric: 'Net Profit', Value: `${currencySymbol}${netProfit.toFixed(2)}` },
      { Section: 'EXPORTS METRICS SUMMARY', Metric: 'Savings Rate', Value: `${savingsRate.toFixed(1)}%` },
      ...incomeBreakdown.map((i) => ({
        Section: 'INCOME BREAKDOWN',
        Metric: i.category.name,
        Value: `${currencySymbol}${i.amount.toFixed(2)} (${i.percentage.toFixed(1)}%)`,
      })),
      ...expenseBreakdown.map((e) => ({
         Section: 'EXPENSE BREAKDOWN',
         Metric: e.category.name,
         Value: `${currencySymbol}${e.amount.toFixed(2)} (${e.percentage.toFixed(1)}%)`,
      })),
    ];
    dbService.exportToCSV(rawData, `Kallon_Report_${selectedMonth}`);
  };

  const handleExportExcel = () => {
    const rawData = [
       { Section: 'SUMMARY', Item: 'Total Income', Amount: totalIncome },
       { Section: 'SUMMARY', Item: 'Total Expenses', Amount: totalExpense },
       { Section: 'SUMMARY', Item: 'Net Balance', Amount: netProfit },
       { Section: 'SUMMARY', Item: 'Savings Rate (%)', Amount: savingsRate },
       ...incomeBreakdown.map((i) => ({
         Section: 'INCOME SOURCE',
         Item: i.category.name,
         Amount: i.amount,
       })),
       ...expenseBreakdown.map((e) => ({
         Section: 'EXPENSE STREAM',
         Item: e.category.name,
         Amount: e.amount,
       })),
    ];
    dbService.exportToExcelPlaceholder(rawData, `Kallon_Report_${selectedMonth}`);
  };

  const formatFriendlyMonth = (mString: string) => {
    if (!mString) return 'Current';
    const [year, month] = mString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Printable Report Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Export ledger summaries, balance metrics, and category trends per period.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month selective tool */}
          <div className="flex items-center gap-1.5 rounded-xl border px-3 py-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
            <CalendarDays className="h-4.5 w-4.5 text-neutral-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs bg-transparent outline-none font-semibold cursor-pointer text-neutral-900 dark:text-white"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatFriendlyMonth(m)}
                </option>
              ))}
              {availableMonths.length === 0 && (
                <option value={new Date().toISOString().substring(0, 7)}>
                  {formatFriendlyMonth(new Date().toISOString().substring(0, 7))}
                </option>
              )}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-semibold hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-xs transition ${
              darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          
          <button
            onClick={handleExportExcel}
            className={`flex items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-semibold hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-xs transition ${
              darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" />
            Excel
          </button>

          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER BLOCK */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold font-display">Kallon FinanceTracker - Ledger Report</h1>
        <p className="text-sm text-neutral-500 mt-1">Period: {formatFriendlyMonth(selectedMonth)}</p>
        <p className="text-xs text-neutral-400 mt-0.5">Generated securely on {new Date().toLocaleDateString()}</p>
      </div>

      {/* MONTHLY SUMMARY METRICS */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Income */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400">Total Income</span>
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/20 p-2 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <h2 className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {currencySymbol}{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-[10px] text-neutral-400 mt-1 font-mono">{monthlyTxs.filter(t => t.transactionType === 'income').length} credit flows</p>
        </div>

        {/* Total Expense */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400">Total Expenses</span>
            <div className="rounded-full bg-rose-50 dark:bg-rose-950/20 p-2 text-rose-600 dark:text-rose-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <h2 className="font-mono text-xl font-bold text-red-600 dark:text-red-400">
            {currencySymbol}{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-[10px] text-neutral-400 mt-1 font-mono">{monthlyTxs.filter(t => t.transactionType === 'expense').length} debit items</p>
        </div>

        {/* Net Balance */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400">Net Balance</span>
            <div className={`rounded-full p-2 ${
              netProfit >= 0 ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400' : 'bg-rose-50 text-rose-500'
            }`}>
              <BarChart2 className="h-4 w-4" />
            </div>
          </div>
          <h2 className={`font-mono text-xl font-bold ${netProfit >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-rose-600'}`}>
            {netProfit < 0 ? '-' : ''}{currencySymbol}{Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <span className={`inline-block mt-1 text-[10px] font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {netProfit >= 0 ? 'Surplus Margin' : 'Deficit Active'}
          </span>
        </div>

        {/* Savings Rate */}
        <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400">Savings Rate</span>
            <div className="rounded-full bg-amber-50 dark:bg-amber-950/20 p-2 text-amber-500">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <h2 className="font-mono text-xl font-bold text-[#ABABAB]">
            {savingsRate.toFixed(1)}%
          </h2>
          <div className="mt-1 flex items-center gap-1">
            <PiggyBank className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] text-emerald-500 font-semibold">
              {savingsRate >= 20 ? 'Optimal (>= 20%)' : 'Caution (< 20%)'}
            </span>
          </div>
        </div>
      </div>

      {/* CORE BREAKDOWNS LISTS */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Expenses list */}
        <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <h3 className="font-bold border-b pb-3 border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-black dark:text-neutral-200 text-sm font-semibold">
              <ArrowDownLeft className="h-4 w-4 text-rose-500" />
              Expenses Categorical Flow
            </span>
            <span className="font-mono text-xs text-neutral-400">
              Total: {currencySymbol}{totalExpense.toFixed(2)}
            </span>
          </h3>

          <div className="space-y-4 pt-4">
            {expenseBreakdown.map((item) => (
              <div key={item.category.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-neutral-700 dark:text-neutral-300">{item.category.name}</span>
                  <div className="space-x-2 font-mono">
                    <span>{currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className="text-neutral-400">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>

                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {expenseBreakdown.length === 0 && (
              <p className="py-8 text-center text-xs text-neutral-400">
                No expense transactions logged for this period.
              </p>
            )}
          </div>
        </div>

        {/* Income list */}
        <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <h3 className="font-bold border-b pb-3 border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-black dark:text-neutral-200 text-sm font-semibold">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              Income Resource Allocation
            </span>
            <span className="font-mono text-xs text-neutral-400">
              Total: {currencySymbol}{totalIncome.toFixed(2)}
            </span>
          </h3>

          <div className="space-y-4 pt-4">
            {incomeBreakdown.map((item) => (
              <div key={item.category.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-neutral-700 dark:text-neutral-300">{item.category.name}</span>
                  <div className="space-x-2 font-mono">
                    <span>{currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className="text-neutral-400">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>

                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {incomeBreakdown.length === 0 && (
              <p className="py-8 text-center text-xs text-neutral-400">
                No income transactions logged for this period.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
