import * as React from "react";

// boolean hook that turns itself off after 5 minutes
export const useAutoApprove = () => {
  const [autoApprove, setAutoApprove] = React.useState(false);
  const [timer, setTimer] = React.useState(0);

  React.useEffect(() => {
    if (autoApprove) {
      const interval = setInterval(() => {
        setTimer(timer + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [autoApprove, timer]);

  React.useEffect(() => {
    if (!autoApprove) {
      setTimer(0);
    }
  }, [autoApprove]);

  React.useEffect(() => {
    if (timer >= 600) {
      setAutoApprove(false);
    }
  }, [autoApprove, timer]);

  return [autoApprove, setAutoApprove] as const;
};
export const tryJson = (str: string) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};

export interface GodmodeSession {
  ai_name: string;
  ai_role: string;
  agent_id: string;
  created: string;
}

export const isSessionArchived = (session: GodmodeSession) => {
  const date = new Date(session.created);
  const now = new Date();
  return (
    date.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000 ||
    date.getTime() < new Date("2024-01-29").getTime()
  );
};
