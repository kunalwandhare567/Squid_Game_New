import { useState } from 'react';
import { generatePlayerId } from '../utils/ruleEngine';

export function usePlayerSession() {
  const [pid] = useState(() => {
    try {
      let stored = localStorage.getItem('squid_pid') || sessionStorage.getItem('squid_pid');
      if (stored) {
        localStorage.setItem('squid_pid', stored);
        sessionStorage.setItem('squid_pid', stored);
        return stored;
      }
      const newId = generatePlayerId();
      localStorage.setItem('squid_pid', newId);
      sessionStorage.setItem('squid_pid', newId);
      return newId;
    } catch (e) {
      return generatePlayerId();
    }
  });

  return { pid };
}
