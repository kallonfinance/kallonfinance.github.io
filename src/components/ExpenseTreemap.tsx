import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { LayoutGrid, Info } from 'lucide-react';

interface ExpenseItem {
  name: string;
  amount: number;
}

interface ExpenseTreemapProps {
  expenses: ExpenseItem[];
  currencySymbol: string;
  darkMode: boolean;
}

const CATEGORY_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#84cc16', // Lime
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#a855f7', // Purple
  '#14b8a6', // Teal
];

export function ExpenseTreemap({ expenses, currencySymbol, darkMode }: ExpenseTreemapProps) {
  const [hoveredNode, setHoveredNode] = useState<{ name: string; amount: number; percentage: number } | null>(null);

  const isEmpty = expenses.length === 0;

  // Compute final dataset
  const data = useMemo(() => {
    return {
      name: 'root',
      children: expenses,
    };
  }, [expenses]);

  const totalExpenseSum = useMemo(() => {
    return data.children.reduce((sum, item) => sum + item.amount, 0);
  }, [data]);

  // Generate D3 Treemap layout metrics
  const leaves = useMemo(() => {
    if (isEmpty) return [];
    
    const rootNode = d3.hierarchy(data)
      .sum((d: any) => d.amount)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Define coordinate dimensions for the responsive high-res viewbox
    const layoutWidth = 600;
    const layoutHeight = 250;

    const treemapLayout = d3.treemap<any>()
      .size([layoutWidth, layoutHeight])
      .paddingOuter(2)
      .paddingInner(6) // Gap spacing for modern bento look
      .round(true);

    treemapLayout(rootNode);
    return rootNode.leaves();
  }, [data, isEmpty]);

  // Color selection helper
  const getColor = (index: number) => {
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  };

  if (isEmpty) {
    return (
      <div className={`rounded-2xl border p-6 flex flex-col justify-between transition-card min-h-[360px] ${
        darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
      }`} id="expense-treemap-card">
        
        {/* Header Panel */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <LayoutGrid className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold tracking-tight">Spending Density Treemap</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-normal">
              Hierarchical tile map representing area size based on expense amount.
            </p>
          </div>
        </div>

        {/* Empty State Layout */}
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3.5 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-850/60 shadow-xs">
            <LayoutGrid className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
          </div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">No Expense Data Recorded Yet</p>
          <p className="text-xs text-neutral-400 max-w-[280px] mt-1 leading-relaxed">
            Once you add expense transactions, this interactive treemap will compile your spending pattern density.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-6 flex flex-col justify-between transition-card ${
      darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
    }`} id="expense-treemap-card">
      
      {/* Header Panel */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <LayoutGrid className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-semibold tracking-tight">Spending Density Treemap</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-1 leading-normal">
            Hierarchical tile map representing area size based on expense amount.
          </p>
        </div>

        {/* Dynamic Heads-Up Hover Display */}
        <div className="h-10 flex items-center">
          {hoveredNode ? (
            <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-100 dark:border-neutral-800 text-xs animate-fade-in">
              <span className="font-bold text-neutral-800 dark:text-neutral-200">{hoveredNode.name}</span>
              <div className="h-3.5 w-[1px] bg-neutral-200 dark:bg-neutral-800" />
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {currencySymbol}{hoveredNode.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-neutral-400 font-mono text-[10px]">
                ({hoveredNode.percentage.toFixed(1)}%)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
              <Info className="h-3.5 w-3.5" />
              <span>Hover over tiles to display precise density stats.</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full">
        <svg
          viewBox="0 0 600 250"
          className="w-full h-auto rounded-xl overflow-hidden focus:outline-none"
          id="d3-treemap-canvas"
        >
          {leaves.map((d: any, index: number) => {
            const nodeWidth = d.x1 - d.x0;
            const nodeHeight = d.y1 - d.y0;
            const categoryName = d.data.name;
            const amount = d.data.amount;
            const percentage = totalExpenseSum > 0 ? (amount / totalExpenseSum) * 100 : 0;
            
            const color = getColor(index);
            const bgFill = darkMode ? `${color}18` : `${color}0C`; // soft desaturated backgrounds
            const borderStroke = color;
            const textFill = darkMode ? '#f3f4f6' : '#111827';
            const detailTextFill = darkMode ? '#9ca3af' : '#4b5563';

            // Decides text rendering density
            const showTitle = nodeWidth > 60 && nodeHeight > 35;
            const showDetail = nodeWidth > 80 && nodeHeight > 55;

            return (
              <g
                key={categoryName}
                transform={`translate(${d.x0}, ${d.y0})`}
                onMouseEnter={() => setHoveredNode({ name: categoryName, amount, percentage })}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer group select-none"
              >
                {/* Visual Tile */}
                <rect
                  width={nodeWidth}
                  height={nodeHeight}
                  fill={bgFill}
                  stroke={borderStroke}
                  strokeWidth={1.5}
                  rx={6}
                  className="transition-all duration-200 group-hover:fill-opacity-30"
                  style={{
                    fillOpacity: darkMode ? 0.7 : 0.6,
                  }}
                />

                {/* Left vertical accent bar inside the card */}
                {nodeWidth > 15 && nodeHeight > 25 && (
                  <rect
                    x={2}
                    y={2}
                    width={3.5}
                    height={Math.max(nodeHeight - 4, 1)}
                    fill={color}
                    rx={2}
                    className="opacity-80"
                  />
                )}

                {/* Category Label */}
                {showTitle && (
                  <text
                    x={12}
                    y={22}
                    fill={textFill}
                    className="text-[11px] font-extrabold fill-current antialiased tracking-tight"
                    style={{
                      textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                    }}
                  >
                    {categoryName.length > Math.floor(nodeWidth / 6.5)
                      ? `${categoryName.substring(0, Math.floor(nodeWidth / 6.5) - 2)}..`
                      : categoryName}
                  </text>
                )}

                {/* Amount / Percentage Label */}
                {showDetail && (
                  <text
                    x={12}
                    y={38}
                    fill={detailTextFill}
                    className="text-[10px] font-mono tracking-tight font-semibold"
                  >
                    {currencySymbol}{amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                )}

                {/* Mini density percentage (only for larger cells) */}
                {nodeWidth > 95 && nodeHeight > 75 && (
                  <text
                    x={12}
                    y={52}
                    fill={color}
                    className="text-[9px] font-mono font-bold tracking-wide"
                  >
                    {percentage.toFixed(1)}% density
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer statistics bar */}
      <div className="mt-4 border-t pt-4 border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-1">
          <span>Categories with outflow density:</span>
          <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
            {expenses.length}
          </span>
        </div>
        <div>
          <span>Treemap value scope:</span>
          <span className="font-mono font-bold text-black dark:text-neutral-200 ml-1">
            {currencySymbol}{totalExpenseSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
