import React, { useMemo, useEffect, useState } from 'react';
import ConfettiCanvas from '../Shared/ConfettiCanvas';
import { useAudio } from '../../context/AudioContext';
import { rankPlayers } from '../../utils/ruleEngine';
import {
  Trophy, Medal, Award, Flame, CheckCircle2, RotateCcw,
  Sparkles, ChevronDown, ChevronUp, Users, Crown, Shield
} from 'lucide-react';

export default function PlayerEnd({ me, players = {}, totalRounds = 10, pid }) {
  const audio = useAudio();
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);

  // Canonical ranking from game engine
  const rankedList = useMemo(() => rankPlayers(players), [players]);
  const myIndex = rankedList.findIndex(p => p.id === (me?.id || pid));
  const myRank = myIndex >= 0 ? myIndex + 1 : 1;
  const totalPlayers = rankedList.length || 1;

  const isFirst  = myRank === 1;
  const isSecond = myRank === 2;
  const isThird  = myRank === 3;
  const isTop3   = myRank <= 3;
  const isSurvivor = Boolean(me?.alive !== false);

  const strikeCount = Number(me?.consecutiveWrong ?? me?.consecutive_wrong ?? 0);
  const finalScore  = Number(me?.score || 0);
  const estimatedCorrect = Math.min(totalRounds, Math.max(0, Math.round(finalScore / 2)));

  // Sound cue on finale reveal
  useEffect(() => {
    if (isFirst) {
      audio?.sfxWin?.();
      audio?.say?.(`Congratulations! You are the champion of the IAE Squid Game with ${finalScore} points!`);
    } else if (isTop3) {
      audio?.sfxCorrect?.();
      audio?.say?.(`Great job! You finished in ${myRank === 2 ? 'second' : 'third'} place with ${finalScore} points.`);
    } else {
      audio?.say?.(`Game complete. You finished rank ${myRank} of ${totalPlayers} players.`);
    }
  }, [isFirst, isTop3, myRank, finalScore, totalPlayers, audio]);

  // Tier configuration for UI styling & motivational messaging
  const tierConfig = useMemo(() => {
    if (isFirst) {
      return {
        themeClass: 'tier-gold',
        accentColor: '#ffd257',
        headerBadge: '🏆 CHAMPION!',
        headerSub: 'YOU DID IT!',
        hexClass: 'hex-gold',
        msgTitle: 'Brilliant!',
        msgSub: 'You are the IAE Champion!',
        msgBody: 'Sharp mind. Strong moves. A true survivor.',
      };
    }
    if (isSecond) {
      return {
        themeClass: 'tier-silver',
        accentColor: '#3aa0ff',
        headerBadge: '🥈 2ND PLACE',
        headerSub: 'EXCELLENT PERFORMANCE!',
        hexClass: 'hex-silver',
        msgTitle: 'Amazing effort!',
        msgSub: 'You showed great knowledge and determination!',
        msgBody: 'One step from the top. An incredible run!',
      };
    }
    if (isThird) {
      return {
        themeClass: 'tier-bronze',
        accentColor: '#f7b733',
        headerBadge: '🥉 3RD PLACE',
        headerSub: 'WELL PLAYED!',
        hexClass: 'hex-bronze',
        msgTitle: 'Great job!',
        msgSub: 'You fought hard and secured a top 3 spot!',
        msgBody: 'Three places on the podium. One unforgettable performance.',
      };
    }
    if (myRank <= 5) {
      return {
        themeClass: 'tier-purple',
        accentColor: '#c084fc',
        headerBadge: 'YOU FINISHED',
        headerSub: 'SO CLOSE!',
        hexClass: 'hex-purple',
        msgTitle: 'So close!',
        msgSub: 'Great effort! Keep learning, keep growing, and come back stronger!',
        msgBody: 'You were right there near the top podium!',
      };
    }
    return {
      themeClass: 'tier-cyan',
      accentColor: '#38bdf8',
      headerBadge: 'YOU FINISHED',
      headerSub: 'WELL PLAYED!',
      hexClass: 'hex-cyan',
      msgTitle: 'Nice try!',
      msgSub: "It's not the end, it's a step forward.",
      msgBody: 'Learn, improve, and challenge again!',
    };
  }, [isFirst, isSecond, isThird, myRank]);

  return (
    <div className={`player-scorecard-arena ${tierConfig.themeClass}`}>
      {isFirst && <ConfettiCanvas active={true} />}

      {/* Atmospheric Ambient Watermarks */}
      <div className="player-ambient-bg" aria-hidden="true">
        <span className="ambient-sym sym-circle">○</span>
        <span className="ambient-sym sym-triangle">△</span>
        <span className="ambient-sym sym-square">□</span>
      </div>

      <div className="scorecard-container">
        {/* ── 1. HEADER ── */}
        <header className="scorecard-header">
          <div className="brand-logo-title">IAE SQUID GAME</div>
          <div className="brand-sub-title">AI • AUTOMATION • INTELLIGENCE</div>
        </header>

        {/* ── 2. HERO RANK & TITLE ── */}
        <section className="scorecard-hero">
          <h2 className="scorecard-hero-title">{tierConfig.headerBadge}</h2>
          <div className="scorecard-hero-sub">
            {isTop3 ? tierConfig.headerSub : `#${myRank} OF ${totalPlayers} PLAYERS`}
          </div>

          {/* ── 3. HEXAGONAL AVATAR BADGE ── */}
          <div className="scorecard-avatar-section">
            <div className={`scorecard-hex-frame ${tierConfig.hexClass}`}>
              {isFirst && (
                <div className="hex-crown-badge">
                  <Crown size={22} color="#ffd257" fill="#ffd257" />
                </div>
              )}
              <div className="hex-avatar-inner">
                <span className="hex-avatar-emoji">{me?.emoji || '👤'}</span>
              </div>
              <div className="hex-rank-pill">
                #{myRank}
              </div>
            </div>
          </div>

          {/* ── 4. PLAYER NAME ── */}
          <h1 className="scorecard-player-name">{me?.name || 'Player'}</h1>

          {/* ── 5. FINAL SCORE PILL ── */}
          <div className="scorecard-score-chip" style={{ '--accent': tierConfig.accentColor }}>
            <span className="score-value">{finalScore}</span>
            <span className="score-unit">PTS</span>
          </div>
        </section>

        {/* ── 6. PERSONALIZED MESSAGE CARD ── */}
        <section className="scorecard-message-card">
          <h3 className="msg-card-title">{tierConfig.msgTitle}</h3>
          <p className="msg-card-sub">{tierConfig.msgSub}</p>
          <p className="msg-card-body">{tierConfig.msgBody}</p>
        </section>

        {/* ── 7. PERFORMANCE STATS (3-COL) ── */}
        <section className="scorecard-stats-grid" aria-label="Performance summary">
          <div className="stat-metric-card">
            <span className="stat-icon">🎮</span>
            <div className="stat-val">{totalRounds}</div>
            <div className="stat-lbl">ROUNDS</div>
          </div>

          <div className="stat-metric-card">
            <span className="stat-icon">✓</span>
            <div className="stat-val">{estimatedCorrect}</div>
            <div className="stat-lbl">CORRECT</div>
          </div>

          <div className="stat-metric-card">
            <span className="stat-icon">🔥</span>
            <div className="stat-val">{strikeCount}</div>
            <div className="stat-lbl">STRIKES</div>
          </div>
        </section>

        {/* ── 8. COMPACT FINAL LEADERBOARD ── */}
        <section className="scorecard-leaderboard-section">
          <div className="leaderboard-header-row" onClick={() => setShowFullLeaderboard(v => !v)}>
            <div className="lb-title-wrap">
              <Users size={16} color={tierConfig.accentColor} />
              <span>FINAL LEADERBOARD</span>
            </div>
            <button className="lb-toggle-btn" aria-label="Toggle full leaderboard">
              {showFullLeaderboard ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          <div className="scorecard-leaderboard-list">
            {(showFullLeaderboard ? rankedList : rankedList.slice(0, 5)).map((p, idx) => {
              const rankNum = idx + 1;
              const isCurrent = p.id === (me?.id || pid);
              const medalEmoji = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : `#${rankNum}`;

              return (
                <div
                  key={p.id}
                  className={`scorecard-lb-row ${isCurrent ? 'is-current-player' : ''} ${rankNum <= 3 ? `top-${rankNum}` : ''}`}
                >
                  <div className="lb-rank-col">{medalEmoji}</div>
                  <div className="lb-avatar-col">{p.emoji || '👤'}</div>
                  <div className="lb-name-col">
                    <span className="lb-name-txt">{p.name}</span>
                    {isCurrent && <span className="lb-you-tag">YOU</span>}
                  </div>
                  <div className="lb-score-col">
                    <strong>{p.score || 0}</strong> pts
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

