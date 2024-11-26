import * as React from "react";
import { AgentRunning } from "./AgentRunning";
import { AgentStart } from "./AgentStart";
import {
  Box,
  Button,
  GridItem,
  Spinner,
  Text,
  Alert,
  AlertIcon,
  CloseButton,
} from "@chakra-ui/react";
import SettingsModalContext from "./SettingsModalContext";
import { SessionList } from "./SessionList";
import { useEffect, useState } from "react";

export interface IAgentInfo {
  name: string;
  description: string;
  goals: string[];
  id: string;
}

export interface IAgent extends IAgentInfo {
  command: string;
  args: string;
  assistantReply: string;
  thoughts: {
    thoughts: string;
    reasoning: string;
    plan: string;
    criticism: string;
    speak: string;
    relevant_goal: string;
  } | null;
  output: { role: string; content: string }[];
  tasks: {
    task_name: string;
    command_name: string;
    arguments: string;
    result: string;
    relevant_goal: string;
  }[];
}

export interface ISettings {
  openAIKey: string | null;
  mustSetKey: boolean;
  gptModel: string;
}

export function useLocalState<T extends string>(key: string, defaultValue: T) {
  const [reset, setReset] = React.useState(0);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const value = React.useMemo<T>(() => {
    if (!mounted) return defaultValue;
    const savedValue = localStorage.getItem(key) as T;
    return savedValue ?? defaultValue;
  }, [key, reset, defaultValue]);

  const setValue = React.useCallback(
    (newValue: T) => {
      localStorage.setItem(key, newValue);
      setReset((prev) => prev + 1);
    },
    [key]
  );

  return [value, setValue] as const;
}

export const Agent = () => {
  const [agent, setAgent] = React.useState<IAgent | null>(null);
  const { sessionLoading } = React.useContext(SettingsModalContext);

  const [dismissedDataset, setDismissedDataset] = useState("");

  useEffect(() => {
    const isClosed = localStorage.getItem("dismissdataset") === "true";
    if (isClosed) setDismissedDataset("true");
  }, []);

  useEffect(() => {
    localStorage.setItem("dismissdataset", dismissedDataset);
  }, [dismissedDataset]);

  return (
    <>
      <SessionList agent={agent} setAgent={setAgent} />

      <GridItem h="100vh" gridTemplate="200px" pos="relative">
        <Box
          h="100vh"
          overflowY="auto"
          flex={1}
          pb={32}
          display="flex"
          flexDirection="column"
        >
          {sessionLoading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              h="full"
            >
              <Box textAlign="center">
                <Spinner size="xl" />
                <Text mt={4} color="whiteAlpha.700">
                  Loading...
                </Text>
              </Box>
            </Box>
          ) : agent ? (
            <AgentRunning key={agent.id} agent={agent} setAgent={setAgent} />
          ) : (
            <AgentStart setAgent={setAgent} />
          )}
        </Box>

        {!dismissedDataset && (
          <Alert
            status="info"
            variant="solid"
            colorScheme="purple"
            bg="#6C70C2"
            position="absolute"
            bottom={0}
          >
            <AlertIcon />
            <Box flex={1}>
              <Text fontSize="sm">
                Looking to automate repetitive business processes? Sign up for
                Godmode v2
              </Text>
            </Box>

            <Button
              as="a"
              href="https://docs.google.com/forms/d/e/1FAIpQLSdfKYSOEifsbKsfx365zZ0TuZpE9ovLUcAwpGY3NFNRg6l25w/viewform?usp=sf_link"
              target="_blank"
              rel="noopener noreferrer"
              colorScheme="whiteAlpha"
              bg="#ffffff99"
              _hover={{ bg: "#ffffffcc" }}
              mr={2}
              size="sm"
            >
              Sign Up
            </Button>
            <CloseButton onClick={() => setDismissedDataset("true")} />
          </Alert>
        )}
      </GridItem>
    </>
  );
};
