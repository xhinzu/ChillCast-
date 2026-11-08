'use client';

import { useState, useEffect } from 'react';
import {
  getSettings,
  updateSettings,
  resetSection,
  resetAllSettings,
  subscribeSettings,
  exportSettings,
  importSettings,
  type AppSettings,
} from './settings-store';

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() => getSettings());

  useEffect(() => {
    // Initial sync
    setSettingsState(getSettings());
    // Subscribe to updates
    return subscribeSettings((newSettings) => {
      setSettingsState(newSettings);
    });
  }, []);

  return {
    settings,
    updateSettings,
    resetSection,
    resetAllSettings,
    exportSettings,
    importSettings,
  };
}
