import React, { useState } from 'react';
import { getPolygonTreeNodes, getWorldPolygonFiles } from '../game/worldPolygons';
import { GameAction } from '../game/reducer';
import { PolygonFileId, SessionState } from '../types/game';

interface PolygonFileTreeBarProps {
  state: SessionState;
  dispatch: (action: GameAction) => void;
  compact?: boolean;
}

export const PolygonFileTreeBar: React.FC<PolygonFileTreeBarProps> = ({
  state,
  dispatch,
  compact = false,
}) => {
  const [showTreeMap, setShowTreeMap] = useState(!compact);
  const worldPolygonFiles = getWorldPolygonFiles(state.world);
  const treeSpec = getPolygonTreeNodes(state.world);
  const currentPolygonSpec = worldPolygonFiles[state.selectedPolygonFile];

  const handleSelectFile = (fileId: PolygonFileId, keyLine?: number) => {
    dispatch({ type: 'SELECT_POLYGON_FILE', file: fileId });
    if (keyLine) {
      dispatch({ type: 'SELECT_LINE', line: keyLine });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Строка быстрого переключения 5 файлов + тумблер дерева ТЗ п. 7 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(Object.keys(worldPolygonFiles) as PolygonFileId[]).map((fileId) => {
            const spec = worldPolygonFiles[fileId];
            const active = state.selectedPolygonFile === fileId;
            return (
              <button
                key={fileId}
                type="button"
                onClick={() => handleSelectFile(fileId)}
                className={`instrument-btn mono ${active ? 'btn-action' : ''}`}
                style={{ fontSize: '14px' }}
              >
                <span>{fileId}</span>
                <span
                  style={{
                    fontSize: '13px',
                    color: active ? 'var(--text-main)' : 'var(--text-caption)',
                  }}
                >
                  [Бой {spec.battleNumber}]
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowTreeMap((prev) => !prev)}
            className={`instrument-btn ${showTreeMap ? 'btn-warning' : ''}`}
            style={{ fontSize: '13px' }}
            title="Показать / скрыть схему дерева модулей по Документу 06, п. 7"
          >
            {showTreeMap ? 'Скрыть дерево модулей' : 'Дерево полигона (5 файлов)'}
          </button>
        </div>

        <span
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          {currentPolygonSpec.subtitle}
        </span>
      </div>

      {/* Схема дерева из 5 файлов по Документу 06, п. 7 */}
      {showTreeMap && (
        <div
          className="material-armor"
          style={{
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '2px',
            }}
          >
            <span className="mono" style={{ fontSize: '15px', fontWeight: 900, color: 'var(--color-warning)' }}>
              {treeSpec.rootTitle} (Документ 06, п. 7 · клик открывает модуль и уязвимую строку)
            </span>
            <span className="mono" style={{ fontSize: '13px', color: 'var(--text-caption)' }}>
              Модулей: 5 · Слотов патчей: 4 (клавиши 1–4)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '6px',
            }}
          >
            {treeSpec.nodes.map((node) => {
              const isSelected = state.selectedPolygonFile === node.fileId;
              const isSlotActive = state.battles[state.currentBattleNumber].activeSlots.includes(
                node.battleNumber
              );
              return (
                <button
                  key={node.fileId}
                  type="button"
                  onClick={() => handleSelectFile(node.fileId, node.keyLine)}
                  className="instrument-btn mono"
                  style={{
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    padding: '6px 10px',
                    borderColor: isSelected
                      ? 'var(--color-action)'
                      : isSlotActive
                      ? 'var(--color-stable)'
                      : 'var(--border-metal)',
                    background: isSelected
                      ? 'rgba(79, 195, 247, 0.14)'
                      : 'rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--text-caption)' }}>{node.branchPrefix}</span>
                    <strong style={{ color: isSelected ? 'var(--color-action)' : 'var(--text-main)' }}>
                      {node.fileId}
                    </strong>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {node.shortDesc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
