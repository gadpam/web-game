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
}) => {
  const [showTreeMap, setShowTreeMap] = useState(false);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Компактная приборная полоса вкладок 5 файлов полигона */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '5px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {(Object.keys(worldPolygonFiles) as PolygonFileId[]).map((fileId) => {
            const spec = worldPolygonFiles[fileId];
            const active = state.selectedPolygonFile === fileId;
            return (
              <button
                key={fileId}
                type="button"
                onClick={() => handleSelectFile(fileId)}
                className={`instrument-btn mono ${active ? 'btn-action' : ''}`}
                style={{ padding: '5px 10px', fontSize: '13px' }}
              >
                <span>{fileId}</span>
                <span
                  style={{
                    fontSize: '11.5px',
                    color: active ? 'var(--color-action)' : 'var(--text-caption)',
                  }}
                >
                  ·Б{spec.battleNumber}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowTreeMap((prev) => !prev)}
            className={`instrument-btn ${showTreeMap ? 'btn-warning' : ''}`}
            style={{ padding: '5px 9px', fontSize: '12px' }}
            title="Показать / скрыть схему дерева 5 модулей по Документу 06, п. 7"
          >
            Дерево 5 файлов {showTreeMap ? '▴' : '▾'}
          </button>
        </div>

        <span
          className="mono"
          style={{
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
          }}
        >
          {currentPolygonSpec.subtitle}
        </span>
      </div>

      {/* Сворачиваемая схема дерева из 5 файлов по Документу 06, п. 7 */}
      {showTreeMap && (
        <div
          className="material-armor gesture-card-drop"
          style={{
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: '13px',
                fontWeight: 900,
                color: 'var(--color-warning)',
              }}
            >
              {treeSpec.rootTitle} (Документ 06, п. 7)
            </span>
            <span
              className="mono"
              style={{ fontSize: '12px', color: 'var(--text-caption)' }}
            >
              Модулей: 5 · Слотов патчей: 4 (клавиши 1–4)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '5px',
            }}
          >
            {treeSpec.nodes.map((node) => {
              const isSelected = state.selectedPolygonFile === node.fileId;
              const isSlotActive = state.battles[
                state.currentBattleNumber
              ].activeSlots.includes(node.battleNumber);
              return (
                <button
                  key={node.fileId}
                  type="button"
                  onClick={() => handleSelectFile(node.fileId, node.keyLine)}
                  className="instrument-btn mono"
                  style={{
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    padding: '5px 8px',
                    fontSize: '12.5px',
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
                  <span
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span style={{ color: 'var(--text-caption)' }}>
                      {node.branchPrefix}
                    </span>
                    <strong
                      style={{
                        color: isSelected
                          ? 'var(--color-action)'
                          : 'var(--text-main)',
                      }}
                    >
                      {node.fileId}
                    </strong>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                      }}
                    >
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
