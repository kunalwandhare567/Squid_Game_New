import { useState } from 'react';
import { generatePlayerId } from '../utils/ruleEngine';

export function usePlayerSession() {
  const [pid] = useState(() => {
    try {
      const stored = sessionStorage.getItem('squid_pid');
      if (stored) return stored;
      const newId = generatePlayerId();
      sessionStorage.setItem('squid_pid', newId);
      return newId;
    } catch (e) {
      return generatePlayerId();
    }
  });

  return { pid };
}
