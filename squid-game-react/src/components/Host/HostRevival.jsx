import React from 'react';
import DollSvg from '../Shared/DollSvg';

export default function HostRevival({ revivedIds, players, onNext }) {
  const revived = revivedIds.map(id => players[id]).filter(Boolean);

  return (
    <div className="center">
      <DollSvg phase="lobby" />
      <div className="banner">⭐ REVIVAL RESULTS</div>
      <h1>
        {revived.length > 0
          ? `${revived.length} player${revived.length > 1 ? 's' : ''} back in the game!`
          : 'No one made it back'}
      </h1>
      {revived.length > 0 && (
        <div className="revived-list">
          {revived.map(p => (
            <div key={p.name} className="revived-chip">
              <span>{p.emoji}</span> <span>{p.name}</span>
            </div>
          ))}
        </div>
      )}
      <p className="sub">
        {revived.length > 0
          ? 'They answered correctly AND fastest among the eliminated!'
          : 'Nobody answered correctly in the revival round. Game continues.'}
      </p>
      <button className="cta" onClick={onNext}>Continue →</button>
    </div>
  );
}
