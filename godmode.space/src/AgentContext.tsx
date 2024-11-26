import React from "react";
import { IAgentInfo } from "./Agent";

export const AgentContext = React.createContext<{
  agent: IAgentInfo | null;
  setAgent: React.Dispatch<React.SetStateAction<IAgentInfo | null>>;
}>({
  agent: null,
  setAgent: () => null,
});
