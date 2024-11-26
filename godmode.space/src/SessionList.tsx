import React from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Card,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Grid,
  GridItem,
  List,
  ListItem,
  Text,
  useBreakpoint,
} from "@chakra-ui/react";
import { URL as API_URL } from "./constants";
import { godmode_auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  AddIcon,
  HamburgerIcon,
  QuestionIcon,
  SettingsIcon,
} from "@chakra-ui/icons";
import { IAgent } from "./Agent";
import { tryJson, isSessionArchived, GodmodeSession } from "./utils";
import SettingsModalContext from "./SettingsModalContext";
import { FaCheck, FaTimes, FaTrashAlt } from "react-icons/fa";
import Link from "next/link";

export const useSessions = (): {
  sessions: GodmodeSession[];
  loading: boolean;
  refetch: () => void;
} => {
  // fetch `URL/files` which returns a list of links to files
  const [sessions, setSessions] = React.useState<GodmodeSession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [user] = useAuthState(godmode_auth);

  const refetch = React.useCallback(async () => {
    await fetch(`${API_URL}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user
          ? { Authorization: `Bearer ${await user.getIdToken(true)}` }
          : {}),
      },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((sessions: { sessions: GodmodeSession[] }) => {
        const sorted = sessions.sessions
          ?.slice()
          .sort(
            (a, b) =>
              new Date(b.created).getTime() - new Date(a.created).getTime()
          );
        setSessions(sorted);
        setLoading(false);
      });
  }, [user]);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  return { sessions, loading, refetch };
};

const Sessions = ({
  agent,
  setAgent,
}: {
  agent: IAgent | null;
  setAgent: React.Dispatch<React.SetStateAction<IAgent | null>>;
}) => {
  const { sessions, refetch } = useSessions();

  const [user] = useAuthState(godmode_auth);
  const { setSessionLoading, sessionLoading } =
    React.useContext(SettingsModalContext);

  const [deleting, setDeleting] = React.useState(false);

  const getSession = React.useCallback(
    async (agent_id: string) => {
      setDeleting(false);
      if (sessionLoading || agent?.id === agent_id) return;
      setSessionLoading(true);
      await fetch(`${API_URL}/sessions/${agent_id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(user
            ? { Authorization: `Bearer ${await user.getIdToken(true)}` }
            : {}),
        },
      })
        .then((res) => res.json())
        .then((data) => {
          const agent = data.session;

          setAgent({
            output: tryJson(agent.full_message_history),
            args: JSON.stringify(agent.arguments, null, 2),
            command: agent.command_name,
            assistantReply: agent.assistant_reply,
            thoughts: tryJson(agent.thoughts),
            tasks: tryJson(agent.tasks),
            description: agent.ai_role,
            name: agent.ai_name,
            goals: agent.ai_goals,
            id: agent.agent_id,
          });
        })
        .finally(() => setSessionLoading(false));
    },
    [setAgent, user, sessionLoading]
  );

  const deleteSession = React.useCallback(
    async (agent_id: string) => {
      if (agent?.id === agent_id) setAgent(null);
      setDeleting(false);
      await fetch(`${API_URL}/sessions/${agent_id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(user
            ? { Authorization: `Bearer ${await user.getIdToken(true)}` }
            : {}),
        },
      }).then(() => refetch());
    },
    [user, agent, setAgent]
  );

  const freshSessions = React.useMemo(
    () => sessions?.filter((session) => !isSessionArchived(session)),
    [sessions, isSessionArchived]
  );
  const archivedSessions = React.useMemo(
    () => sessions?.filter((session) => isSessionArchived(session)),
    [sessions, isSessionArchived]
  );

  const renderFn = (session: GodmodeSession) => (
    <ListItem key={session.agent_id} w="full">
      <Button
        px={4}
        whiteSpace="normal"
        variant="ghost"
        isActive={session.agent_id === agent?.id}
        textColor={isSessionArchived(session) ? "gray.500" : "whiteAlpha.900"}
        w="full"
        h={14}
        py={2}
        size="sm"
        onClick={() => getSession(session.agent_id)}
      >
        <Text
          fontWeight="normal"
          textAlign="left"
          noOfLines={2}
          wordBreak="break-word"
          w="full"
        >
          {session.ai_role || "Unnamed Agent"}
        </Text>
        {session.agent_id === agent?.id &&
          (deleting ? (
            <>
              <Button
                onClick={async (e) => {
                  e.stopPropagation();
                  setDeleting(false);
                  deleteSession(session.agent_id);
                }}
                variant="link"
                color="whiteAlpha.400"
                _hover={{
                  color: "whiteAlpha.800",
                }}
                size="sm"
                px={1.5}
                minW="auto"
              >
                <FaCheck color="inherit" />
              </Button>
              <Button
                onClick={async (e) => {
                  e.stopPropagation();
                  setDeleting(false);
                }}
                variant="link"
                color="whiteAlpha.400"
                _hover={{
                  color: "whiteAlpha.800",
                }}
                minW="auto"
                size="sm"
                px={1.5}
              >
                <FaTimes color="inherit" />
              </Button>
            </>
          ) : (
            <Button
              onClick={async (e) => {
                e.stopPropagation();
                setDeleting(true);
              }}
              variant="link"
              color="whiteAlpha.400"
              _hover={{
                color: "whiteAlpha.800",
              }}
              size="sm"
              minW="auto"
              px={1.5}
            >
              <FaTrashAlt color="inherit" />
            </Button>
          ))}
      </Button>
    </ListItem>
  );

  return (
    <List spacing={1}>
      {!user && (
        <Text pt={6} color="whiteAlpha.600" textAlign="center">
          Login to save your sessions.
        </Text>
      )}
      {freshSessions?.map(renderFn)}
      {/* Expandable archived sessions */}
      <Accordion
        allowToggle
        defaultIndex={archivedSessions?.length ? [0] : undefined}
        hidden={!archivedSessions?.length}
      >
        <AccordionItem border="none">
          <AccordionButton
            px={4}
            whiteSpace="normal"
            textColor="gray.500"
            w="full"
            py={2}
          >
            <Text fontWeight="normal" textAlign="left">
              Archived sessions
            </Text>
            <AccordionIcon ml={2} />
          </AccordionButton>
          <AccordionPanel px={0}>
            {archivedSessions?.map(renderFn)}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </List>
  );
};

// eslint-disable-next-line no-empty-pattern
export const SessionList = ({
  agent,
  setAgent,
}: {
  agent: IAgent | null;
  setAgent: React.Dispatch<React.SetStateAction<IAgent | null>>;
}) => {
  const [show, setShow] = React.useState(false);

  const { setShowSettings } = React.useContext(SettingsModalContext);

  const bk = useBreakpoint();
  const sess = (
    <Card
      h="full"
      borderRadius={0}
      width="full"
      bg="#151328"
      display="flex"
      flexDir="column"
    >
      <Box flexGrow={1} overflowY="auto" px={1}>
        <Button
          size="sm"
          py={4}
          h={10}
          onClick={() => setAgent(null)}
          fontWeight="normal"
          w="full"
          mb={1}
          mt={1}
          variant="outline"
        >
          <AddIcon color="whiteAlpha.500" mr={2} /> New session
        </Button>
        <Sessions agent={agent} setAgent={setAgent} />
      </Box>

      <Box pb={2}>
        <Text
          fontWeight="bold"
          textAlign="center"
          fontSize="xs"
          color="GrayText"
        >
          Twitter
        </Text>
      </Box>

      <Box
        px={1}
        display="flex"
        flexWrap="wrap"
        flexDirection="column"
        mb={4}
        gap={0}
      >
        <Button
          fontWeight="normal"
          as="a"
          href="https://twitter.com/da_fant"
          target="_blank"
          rel="noopener noreferrer"
          colorScheme="purple"
          variant="link"
          color="blue.300"
          size="sm"
          mb={1}
          fontSize="small"
          flexGrow={1}
          p={1}
        >
          <Box>@da_fant</Box>
        </Button>
        <Button
          fontWeight="normal"
          as="a"
          href="https://twitter.com/emilahlback"
          target="_blank"
          rel="noopener noreferrer"
          colorScheme="purple"
          variant="link"
          color="blue.300"
          size="sm"
          mb={1}
          fontSize="small"
          flexGrow={1}
          p={1}
        >
          <Box>@emilahlback</Box>
        </Button>
        <Button
          fontWeight="normal"
          as="a"
          href="https://twitter.com/_Lonis_"
          target="_blank"
          rel="noopener noreferrer"
          colorScheme="purple"
          variant="link"
          color="blue.300"
          size="sm"
          mb={1}
          fontSize="small"
          flexGrow={1}
          p={1}
        >
          <Box>@_Lonis_</Box>
        </Button>
      </Box>
      <Grid gridColumnGap={1} p={1} pt={0}>
        <GridItem>
          <Link href="/about">
            <Button
              w="full"
              fontWeight="normal"
              colorScheme="gray"
              bg="gray.600"
              size="sm"
            >
              <QuestionIcon />
              <Box ml={2}>About</Box>
            </Button>
          </Link>
        </GridItem>
      </Grid>
      <Box>
        <Button
          fontWeight="normal"
          w="full"
          colorScheme="gray"
          bg="gray.600"
          onClick={() => setShowSettings(true)}
        >
          <SettingsIcon />
          <Box ml={2}>Settings</Box>
        </Button>
      </Box>
    </Card>
  );
  return (
    <GridItem overflowY="auto" h="100vh" gridTemplate="200px">
      <Button
        onClick={() => setShow(true)}
        display={["block", "block", "block", "none"]}
        position="fixed"
        left={2}
        top={2}
        zIndex={1}
      >
        <HamburgerIcon />
      </Button>
      {bk !== "sm" && bk !== "base" && bk !== "md" ? (
        sess
      ) : (
        <Drawer onClose={() => setShow(false)} isOpen={show} placement="left">
          <DrawerOverlay />
          <DrawerContent>
            <DrawerBody p={0} bg="#151328">
              {sess}
            </DrawerBody>
            <DrawerCloseButton size="lg" />
          </DrawerContent>
        </Drawer>
      )}
    </GridItem>
  );
};
