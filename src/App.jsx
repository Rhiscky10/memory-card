import React, { useEffect, useMemo, useRef, useState } from "react";
import './App.css';

/* MEMORY GAME
 - 4x4 default (8 pairs)
 - flip two cards, match => stays revealed
 - moves counter, timer, best stored in localStorage
*/

const EMOJIS = ["🐶","🐱","🦊","🐼","🦁","🐸","🐵","🦄","🐷","🐨","🐯","🐰"];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairCount = 8) {
  const chosen = EMOJIS.slice(0, pairCount);
  const doubled = chosen.flatMap((e, i) => [
    { id: `${e}-${i}-a`, emoji: e },
    { id: `${e}-${i}-b`, emoji: e }
  ]);
  return shuffle(doubled);
}

function formatTime(s) {
  const m = Math.floor(s/60).toString().padStart(2,"0");
  const sec = (s%60).toString().padStart(2,"0");
  return `${m}:${sec}`;
}

export default function App() {
  const [gridSize, setGridSize] = useState(4);
  const pairs = (gridSize*gridSize)/2;
  const [deck, setDeck] = useState(() => buildDeck(pairs));
  const [flipped, setFlipped] = useState([]); // ids
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const checkingRef = useRef(false);

  const bestKey = `memory_best_${gridSize}x${gridSize}`;
  const best = useMemo(() => {
    const raw = localStorage.getItem(bestKey);
    return raw ? JSON.parse(raw) : null;
  }, [bestKey, moves, seconds]);

  useEffect(() => {
    let t;
    if (running) t = setInterval(() => setSeconds(s=>s+1), 1000);
    return ()=> clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (matched.size === deck.length && deck.length>0) {
      setRunning(false);
      // maybe update best
      const record = localStorage.getItem(bestKey);
      const result = { seconds, moves, date: new Date().toISOString() };
      if (!record) localStorage.setItem(bestKey, JSON.stringify(result));
      else {
        const r = JSON.parse(record);
        if (seconds < r.seconds || (seconds === r.seconds && moves < r.moves)) {
          localStorage.setItem(bestKey, JSON.stringify(result));
        }
      }
    }
  }, [matched, deck, bestKey, seconds, moves]);

  useEffect(() => {
    // rebuild deck when gridSize changes
    setDeck(buildDeck(pairs));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setSeconds(0);
    setRunning(false);
  }, [gridSize]);

  function restart() {
    setDeck(buildDeck(pairs));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setSeconds(0);
    setRunning(false);
  }

  function flip(id) {
    if (checkingRef.current) return;
    if (flipped.includes(id) || matched.has(id)) return;
    if (!running) setRunning(true);

    const next = [...flipped, id];
    setFlipped(next);

    if (next.length === 2) {
      setMoves(m=>m+1);
      checkingRef.current = true;
      setTimeout(() => {
        const [a,b] = next;
        const cardA = deck.find(c=>c.id===a);
        const cardB = deck.find(c=>c.id===b);
        if (cardA && cardB && cardA.emoji === cardB.emoji) {
          setMatched(prev => new Set([...Array.from(prev), a, b]));
        }
        setFlipped([]);
        checkingRef.current = false;
      }, 700);
    }
  }

  return (
    <div className="mem-root">
      <header><h1>Memory Match</h1></header>

      <div className="mem-controls">
        <label>
          Grid:
          <select value={gridSize} onChange={e=>setGridSize(Number(e.target.value))}>
            <option value={4}>4×4</option>
            <option value={6}>6×6</option>
          </select>
        </label>
        <button onClick={restart}>New Game</button>
        <div className="mem-stats">
          <div>Moves: <strong>{moves}</strong></div>
          <div>Time: <strong>{formatTime(seconds)}</strong></div>
          <div>Pairs left: <strong>{(deck.length - matched.size)/2}</strong></div>
        </div>
        <div className="mem-best">
          Best: {best ? `${formatTime(best.seconds)} • ${best.moves} moves` : "—"}
        </div>
      </div>

      <main className={`mem-board size-${gridSize}`}>
        {deck.map(card => {
          const isFlipped = flipped.includes(card.id) || matched.has(card.id);
          const isMatched = matched.has(card.id);
          return (
            <button
              key={card.id}
              className={`mem-card ${isFlipped ? "flipped":""} ${isMatched ? "matched":""}`}
              onClick={()=>flip(card.id)}
              disabled={isMatched}
            >
              <div className="inner">
                <div className="front">?</div>
                <div className="back">{card.emoji}</div>
              </div>
            </button>
          );
        })}
      </main>

      <footer className="mem-footer">Press New Game to reshuffle • Built with React</footer>
    </div>
  );
}
