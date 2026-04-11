import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameViewProps } from '@gamehub/core';
import { useT } from '@gamehub/i18n';
import type { YahtzeeState } from './types';
import { SCHOOL_CATEGORIES, FIGURE_CATEGORIES, PLAYER_COLORS, CATEGORY_I18N_KEYS } from './categories';
import {
  calcSchoolSum,
  calcFigureSum,
  calcTotal,
  countFilled,
  isSchoolComplete,
  isAllComplete,
  getInitials,
} from './scoring';
import { SchoolInput } from './components/SchoolInput';
import { FigureInput } from './components/FigureInput';
import './yahtzee.css';

export function HostView({
  gameId,
  players: propPlayers,
  gameState,
  onAction,
}: GameViewProps) {
  const t = useT();
  const state = gameState as YahtzeeState | null;
  const propValues = state?.values ?? {};
  const currentRound = state?.currentRound ?? 0;
  const totalRounds = state?.totalRounds ?? 1;
  const rounds = state?.rounds ?? [];
  const multiRound = totalRounds > 1;
  const gameComplete = isAllComplete(propValues, propPlayers.length);
  const isLastRound = currentRound >= totalRounds - 1;
  const roundFinished = rounds.length > currentRound; // round was frozen

  const isLocal = sessionStorage.getItem('gamehub_local') === 'true';
  const [adminMode, setAdminMode] = useState(isLocal);
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set());
  // Local display order — maps visual column index to player index
  const [displayOrder, setDisplayOrder] = useState<number[]>([]);
  // Local values reordered to match displayOrder
  const [dragCol, setDragCol] = useState<number | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);

  // Keep display order in sync with players
  useEffect(() => {
    setDisplayOrder((prev) => {
      if (prev.length === propPlayers.length) return prev;
      // New players added — extend order
      const existing = new Set(prev);
      const newOrder = [...prev];
      for (let i = 0; i < propPlayers.length; i++) {
        if (!existing.has(i)) newOrder.push(i);
      }
      // Remove players that no longer exist
      return newOrder.filter((idx) => idx < propPlayers.length);
    });
  }, [propPlayers.length]);

  // Ordered players and values
  const players = displayOrder.map((idx) => propPlayers[idx]).filter(Boolean);
  const values = propValues;

  // Flash animation on remote updates
  const handleScoreChange = useCallback(
    (category: string, playerIndex: number) => {
      const key = `${category}-${playerIndex}`;
      setFlashCells((prev) => new Set(prev).add(key));
      setTimeout(() => {
        setFlashCells((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 600);
    },
    [],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === 'score:changed') {
        handleScoreChange(detail.category, detail.playerIndex);
      }
    };
    window.addEventListener('gamehub:patch', handler);
    return () => window.removeEventListener('gamehub:patch', handler);
  }, [handleScoreChange]);

  // --- Sticky header ---
  useEffect(() => {
    const thead = theadRef.current;
    const stickyEl = stickyRef.current;
    if (!thead || !stickyEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          stickyEl.style.display = entry.isIntersecting ? 'none' : 'block';
        }
      },
      { threshold: 0 },
    );
    observer.observe(thead);

    return () => observer.disconnect();
  }, [players.length]);

  // Sync sticky header widths
  useEffect(() => {
    const syncWidths = () => {
      const table = tableRef.current;
      const stickyEl = stickyRef.current;
      if (!table || !stickyEl) return;
      const origCells = table.querySelectorAll('thead th');
      const stickyCells = stickyEl.querySelectorAll('th');
      if (origCells.length !== stickyCells.length) return;
      const stickyTable = stickyEl.querySelector('table');
      if (stickyTable) stickyTable.style.width = table.offsetWidth + 'px';
      origCells.forEach((cell, i) => {
        const w = cell.getBoundingClientRect().width + 'px';
        (stickyCells[i] as HTMLElement).style.width = w;
        (stickyCells[i] as HTMLElement).style.minWidth = w;
        (stickyCells[i] as HTMLElement).style.maxWidth = w;
      });
    };
    syncWidths();
    window.addEventListener('resize', syncWidths);
    return () => window.removeEventListener('resize', syncWidths);
  }, [players.length, displayOrder]);

  // Sync scroll between sticky and table
  const onTableScroll = () => {
    if (stickyRef.current && tableWrapRef.current) {
      stickyRef.current.scrollLeft = tableWrapRef.current.scrollLeft;
    }
  };

  // --- Swap columns ---
  const swapColumns = (a: number, b: number) => {
    setDisplayOrder((prev) => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  };

  // --- Drag handlers ---
  const onDragStart = (visualIdx: number) => {
    setDragCol(visualIdx);
  };
  const onDragEnd = () => {
    setDragCol(null);
  };
  const onDragOver = (e: React.DragEvent, visualIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDrop = (e: React.DragEvent, visualIdx: number) => {
    e.preventDefault();
    if (dragCol !== null && dragCol !== visualIdx) {
      swapColumns(dragCol, visualIdx);
    }
    setDragCol(null);
  };

  // --- Actions ---
  const handleCellChange = (
    category: string,
    playerIndex: number,
    value: string,
  ) => {
    onAction('score:update', { category, playerIndex, value });
  };

  const handleReset = () => {
    if (confirm(t('yahtzee.confirmReset'))) {
      onAction('game:reset', {});
    }
  };

  const handleNewGame = () => {
    if (confirm(t('yahtzee.confirmEnd'))) {
      sessionStorage.removeItem('gamehub_gameId');
      sessionStorage.removeItem('gamehub_token');
      window.location.href = '/';
    }
  };

  // --- Render helpers ---
  const renderCategoryRow = (
    category: string,
    section: 'school' | 'figure',
  ) => {
    const catLabel = t(CATEGORY_I18N_KEYS[category]) || category;
    const shortName = catLabel.replace(/\s*\(\d+\)$/, '');
    const allFilled = players.every((p) => {
      const raw = values[category]?.[p.index];
      return raw !== undefined && raw !== null && raw.toString().trim() !== '';
    });

    return (
      <tr
        key={category}
        className={`${section}-row${allFilled ? ' row-complete' : ''}`}
      >
        <td>
          {catLabel}
          <span className="player-badges">
            {players.map((p) => {
              const raw = values[category]?.[p.index];
              const filled =
                raw !== undefined && raw !== null && raw.toString().trim() !== '';
              return (
                <span
                  key={p.index}
                  className={`player-badge${filled ? ' done' : ' pending'}`}
                  title={p.name}
                >
                  {filled ? '✓' : ''}
                </span>
              );
            })}
          </span>
        </td>
        {players.map((p, visualIdx) => {
          const raw = values[category]?.[p.index] ?? '';
          const cellKey = `${category}-${p.index}`;
          const isFlash = flashCells.has(cellKey);
          const readOnly = !adminMode;
          const color = PLAYER_COLORS[p.index % PLAYER_COLORS.length];
          const filled = raw.trim() !== '';

          return (
            <td
              key={p.index}
              style={{ background: color.light }}
            >
              {section === 'school' ? (
                <SchoolInput
                  value={raw}
                  readOnly={readOnly}
                  placeholder={shortName}
                  flash={isFlash}
                  filledColor={filled ? color.bg : undefined}
                  onChange={(v) => handleCellChange(category, p.index, v)}
                />
              ) : (
                <FigureInput
                  value={raw}
                  readOnly={readOnly}
                  placeholder={shortName}
                  flash={isFlash}
                  filledColor={filled ? color.bg : undefined}
                  onChange={(v) => handleCellChange(category, p.index, v)}
                />
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        {multiRound && (
          <span style={{ fontWeight: 700, fontSize: '1rem', padding: '10px 12px' }}>
            {t('yahtzee.round', { current: currentRound + 1, total: totalRounds })}
          </span>
        )}
        <button onClick={() => window.open(`/game/${gameId}`, '_blank')}>
          QR Code
        </button>
        <button onClick={() => setAdminMode(!adminMode)}>
          {t('yahtzee.adminMode', { state: t(adminMode ? 'yahtzee.adminOn' : 'yahtzee.adminOff') })}
        </button>
        <button onClick={handleReset}>
          {t('yahtzee.resetFields')}
        </button>
        {gameComplete && !roundFinished && (
          multiRound ? (
            isLastRound ? (
              <button
                style={{ background: '#22c55e', color: '#fff', fontWeight: 700 }}
                onClick={() => {
                  onAction('next-round', {});
                  onAction('finish-game', {});
                }}
              >
                {t('yahtzee.endGame')}
              </button>
            ) : (
              <button
                style={{ background: '#2563eb', color: '#fff', fontWeight: 700 }}
                onClick={() => onAction('next-round', {})}
              >
                {t('yahtzee.nextRound')}
              </button>
            )
          ) : (
            <button
              style={{ background: '#22c55e', color: '#fff', fontWeight: 700 }}
              onClick={() => {
                onAction('next-round', {});
                onAction('finish-game', {});
              }}
            >
              {t('yahtzee.endGame')}
            </button>
          )
        )}
        <button className="danger" onClick={handleNewGame}>
          {t('common.newGame')}
        </button>
      </div>

      {/* Sticky header */}
      <div
        ref={stickyRef}
        style={{ position: 'sticky', top: 0, zIndex: 3, display: 'none', overflow: 'hidden' }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f9fafb', boxShadow: '0 2px 4px rgba(0,0,0,.15)' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #e5e7eb', padding: '8px 10px', textAlign: 'center', fontSize: '1rem', fontWeight: 600, background: '#f9fafb' }}></th>
              {players.map((p) => (
                <th
                  key={p.index}
                  style={{ border: '1px solid #e5e7eb', padding: '8px 10px', textAlign: 'center', fontSize: '1rem', fontWeight: 600, background: '#f9fafb' }}
                >
                  <span className={`th-status ${p.connected ? 'on' : 'off'}`} />
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Score table */}
      <div className="yahtzee-table" ref={tableWrapRef} onScroll={onTableScroll}>
        <table ref={tableRef} style={{ '--player-count': players.length } as React.CSSProperties}>
          <thead ref={theadRef}>
            <tr>
              <th></th>
              {players.map((p, visualIdx) => {
                const color = PLAYER_COLORS[p.index % PLAYER_COLORS.length];
                const isDragOver = dragCol !== null && dragCol !== visualIdx;
                return (
                  <th
                    key={p.index}
                    className="player-th"
                    style={{
                      borderBottom: `3px solid ${color.bg}`,
                      background: color.light,
                    }}
                    draggable
                    onDragStart={() => onDragStart(visualIdx)}
                    onDragEnd={onDragEnd}
                    onDragOver={(e) => onDragOver(e, visualIdx)}
                    onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove('drag-over')}
                    onDrop={(e) => {
                      (e.currentTarget as HTMLElement).classList.remove('drag-over');
                      onDrop(e, visualIdx);
                    }}
                    onDragEnter={(e) => (e.currentTarget as HTMLElement).classList.add('drag-over')}
                  >
                    <span className={`th-status ${p.connected ? 'on' : 'off'}`} />
                    {p.name}
                    <div className="move-arrows">
                      <button
                        className="move-btn"
                        disabled={visualIdx === 0}
                        onClick={(e) => { e.stopPropagation(); swapColumns(visualIdx, visualIdx - 1); }}
                      >
                        ◀
                      </button>
                      <button
                        className="move-btn"
                        disabled={visualIdx === players.length - 1}
                        onClick={(e) => { e.stopPropagation(); swapColumns(visualIdx, visualIdx + 1); }}
                      >
                        ▶
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* School section */}
            <tr className="section-header">
              <td colSpan={players.length + 1}>{t('yahtzee.school')}</td>
            </tr>
            {SCHOOL_CATEGORIES.map((cat) => renderCategoryRow(cat, 'school'))}
            {(() => {
              const gameComplete = isAllComplete(values, propPlayers.length);
              return (
                <>
                  <tr className="sum-row">
                    <td>{t('yahtzee.schoolSum')}</td>
                    {players.map((p) => {
                      const filled = countFilled(SCHOOL_CATEGORIES, values, p.index);
                      const color = PLAYER_COLORS[p.index % PLAYER_COLORS.length];
                      if (!gameComplete) {
                        return (
                          <td key={p.index} style={{ background: color.light }}>
                            {filled}/6
                          </td>
                        );
                      }
                      const val = calcSchoolSum(values, p.index);
                      return (
                        <td key={p.index} style={{ background: color.light }}>
                          {val !== null ? val : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Figure section */}
                  <tr className="section-header">
                    <td colSpan={players.length + 1}>{t('yahtzee.figures')}</td>
                  </tr>
                  {FIGURE_CATEGORIES.map((cat) => renderCategoryRow(cat, 'figure'))}
                  <tr className="sum-row">
                    <td>{t('yahtzee.figureSum')}</td>
                    {players.map((p) => {
                      const filled = countFilled(FIGURE_CATEGORIES, values, p.index);
                      const color = PLAYER_COLORS[p.index % PLAYER_COLORS.length];
                      if (!gameComplete) {
                        return (
                          <td key={p.index} style={{ background: color.light }}>
                            {filled}/11
                          </td>
                        );
                      }
                      const val = calcFigureSum(values, p.index);
                      return (
                        <td key={p.index} style={{ background: color.light }}>
                          {val !== null ? val : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Total */}
                  <tr className="total-row">
                    <td>{t('yahtzee.total')}</td>
                    {players.map((p) => {
                      const color = PLAYER_COLORS[p.index % PLAYER_COLORS.length];
                      if (!gameComplete) {
                        const schoolFilled = countFilled(SCHOOL_CATEGORIES, values, p.index);
                        const figureFilled = countFilled(FIGURE_CATEGORIES, values, p.index);
                        return (
                          <td key={p.index} style={{ background: color.light }}>
                            {schoolFilled + figureFilled}/17
                          </td>
                        );
                      }
                      const val = calcTotal(values, p.index);
                      return (
                        <td key={p.index} style={{ background: color.light }}>
                          {val !== null ? val : '—'}
                        </td>
                      );
                    })}
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
