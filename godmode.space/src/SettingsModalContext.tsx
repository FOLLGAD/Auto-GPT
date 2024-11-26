import { createContext } from "react";
import { ISettings } from "./Agent";

const SettingsModalContext = createContext<{
  setSettings: (settings: ISettings) => void;
  settings: ISettings;
  setShowSettings: (show: boolean) => void;
  sessionLoading: boolean;
  setSessionLoading: (loading: boolean) => void;
}>({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setSettings: () => {},
  settings: {} as ISettings,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setShowSettings: () => {},
  sessionLoading: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setSessionLoading: () => {},
});

export default SettingsModalContext;
