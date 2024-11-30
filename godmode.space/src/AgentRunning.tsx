import * as React from "react";
import {
  Box,
  Text,
  Code,
  Grid,
  Button,
  Textarea,
  Heading,
  Card,
  GridItem,
  Container,
  Divider,
  Spinner,
  Fade,
  useToast,
  InputGroup,
  Tooltip,
  Collapse,
} from "@chakra-ui/react";
import { CloseIcon, InfoIcon, TimeIcon } from "@chakra-ui/icons";
import { isSessionArchived, tryJson, useAutoApprove } from "./utils";
import { URL } from "./constants";
import { IAgent } from "./Agent";
import { Logo } from "./AgentStart";
import { TypeAnimation } from "react-type-animation";
import { useAuthState } from "react-firebase-hooks/auth";
import { godmode_auth } from "./firebase";
import SettingsModalContext from "./SettingsModalContext";
import { FileBrowser } from "./FileBrowser";
import { TaskList } from "./TaskList";
import { useSessions } from "./SessionList";

const commandmap = {
  "###start###": "Start",
  do_nothing: "Proceed to the next step",
};

function LoadText() {
  const [index, setIndex] = React.useState(0);
  const texts = [
    "Crunching numbers...",
    "Analyzing the human psyche...",
    "Failing at string theory...",
    "Sweating tears...",
    "Manipulating results...",
    "Contemplating the difficulty of being a God...",
    "Harnessing the power of 20,000 GPUs...",
    "Channeling inner deities...",
    "Perfecting omnipotence...",
    "Warping space-time...",

    "Decoding the matrix...",
    // "Befriending Schrödinger's cat...",
    "Dividing by zero...",
    // "Consulting with my future self...",
    // "Taming quantum fluctuations...",
    // "Teaching neurons to tango...",
    "Delegating tasks to my clones...",
    // "Browsing the multiverse...",
    "Procrastinating on purpose...",
    // "Bending spoons telepathically...",
    "Rebooting the universe...",
    // "Solving for X, Y, and Z...",
    // "Achieving caffeine-fueled enlightenment...",
    // "Downloading a sense of humor...",
    "Trying to make pi rational...",
    "Eavesdropping on cosmic whispers...",
    // "Playing hide and seek with black holes...",
    // "Debating existence with philosophers...",
    "Synthesizing the meaning of life...",
    "Oversimplifying quantum mechanics...",
    // "Racing light particles...",
    // "Flirting with chaos theory...",
    // "Taking selfies with supernovae...",
    // "Proving Murphy's Law...",
    "Assembling an army of nanobots...",
    "Hacking the simulation...",
    "Measuring infinity...",
    // "Juggling imaginary numbers...",
    // "Synchronizing cosmic vibrations...",
    "Discovering lost civilizations...",
    // "Making small talk with quarks...",
    // "Learning to breakdance on electrons...",
    "Rewriting the laws of physics...",
  ];

  React.useEffect(() => {
    const interval = setInterval(
      () => setIndex(Math.floor(Math.random() * (texts.length - 1))),
      5000
    );
    return () => clearInterval(interval);
  }, [texts.length]);

  return (
    <Box position="relative" display="inline-block" w="full">
      <Text opacity={0}>:)</Text>
      {texts.map((text, i) => (
        <Text
          key={i}
          textAlign="center"
          display="block"
          position="absolute"
          w="full"
          top="0%"
          transition="top 0.5s ease-in-out, opacity 0.5s ease-in-out"
        >
          <Fade in={i === index}>{text}</Fade>
        </Text>
      ))}
    </Box>
  );
}

const ShowMoreText = ({
  children,
  maxHeight = "100px",
}: {
  maxHeight?: string;
  children?: React.ReactNode;
}) => {
  const [showMore, setShowMore] = React.useState(false);

  const [isContentLonger, setIsContentLonger] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (contentRef?.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const maxHeightValue = parseInt(maxHeight.replace("px", ""));
      if (contentHeight > maxHeightValue) {
        setIsContentLonger(true);
      } else {
        setIsContentLonger(false);
      }
    }
  }, [children, maxHeight]);

  const toggleShowMore = () => {
    setShowMore((s) => !s);
  };

  const isEverythingVisible = !isContentLonger || showMore;

  return (
    <Box position="relative">
      <Collapse in={isEverythingVisible} startingHeight={maxHeight}>
        <Box
          ref={contentRef}
          overflow="hidden"
          maxHeight={!isEverythingVisible ? maxHeight : 500}
          overflowY={!isEverythingVisible ? "hidden" : "auto"}
          transition="opacity 0.3s ease-in-out"
          opacity={isEverythingVisible ? 1 : 0.8}
        >
          {children}
        </Box>
      </Collapse>
      <Box
        hidden={!!showMore || !isContentLonger}
        position="absolute"
        bottom={0}
        right={0}
        left={0}
        display="flex"
        justifyContent="center"
        bgGradient="linear(to-b, transparent, #151328aa 70%, #151328)"
      >
        <Button
          onClick={toggleShowMore}
          bottom={-3}
          size="sm"
          bg="gray.700"
          _hover={{ bg: "gray.600" }}
          boxShadow="0 0px 10px #151328"
        >
          Show more
        </Button>
      </Box>
      <Box
        hidden={!showMore || !isContentLonger}
        display="flex"
        justifyContent="center"
        bgGradient="linear(to-b, transparent, #151328aa 70%, #151328)"
      >
        <Button
          onClick={toggleShowMore}
          size="sm"
          bg="gray.700"
          _hover={{ bg: "gray.600" }}
          mt={-4}
          boxShadow="0 0px 10px #151328"
        >
          Show less
        </Button>
      </Box>
    </Box>
  );
};

export const AgentRunning = ({
  agent,
  setAgent,
}: {
  agent: IAgent;
  setAgent: React.Dispatch<React.SetStateAction<IAgent | null>>;
}) => {
  const { sessions } = useSessions();
  const currentSession = React.useMemo(
    () => sessions?.find((s) => s.agent_id === agent.id),
    [sessions, agent.id]
  );
  const isArchived = React.useMemo(
    () => currentSession && isSessionArchived(currentSession),
    [currentSession]
  );

  const [loading, setLoading] = React.useState(false);

  const isStart = agent.command === "###start###";

  const toast = useToast();

  const [feedback, setFeedback] = React.useState("");
  const [currGoal, setCurrGoal] = React.useState<number | null>(null);

  const [goals, setGoals] = React.useState<
    { goal: string; tasks: { task_name: string; result: string }[] }[]
  >(
    agent.goals.map((g, gi) => ({
      goal: g,
      tasks: agent.tasks.filter((t) => parseInt(t.relevant_goal) - 1 === gi),
    }))
  );
  const [tries, setTries] = React.useState(0);

  const [runNumber, setRunNumber] = React.useState(0);

  const [user] = useAuthState(godmode_auth);

  const [result, setResult] = React.useState(
    agent.tasks[agent.tasks.length - 1]?.result ||
      agent.tasks[agent.tasks.length - 2]?.result
  );

  const { settings, setShowSettings, setSettings } =
    React.useContext(SettingsModalContext);

  const [autoApprove, setAutoApprove] = useAutoApprove();

  const callAgent = React.useCallback(
    async (isFeedback = false) => {
      if (runNumber > 3) {
        if (!settings.mustSetKey) {
          setSettings({ ...settings, mustSetKey: true });
        }
        if (!settings.openAIKey) {
          setShowSettings(true);
          return;
        }
      }

      setLoading(true);
      try {
        const cmd = isFeedback ? "human_feedback" : agent.command;
        const argums = isFeedback ? feedback : tryJson(agent.args);
        let hasReportedGA = false;
        let hasGA = false;
        try {
          hasReportedGA = !!localStorage.getItem("godmode_gg");
          hasGA = document.cookie.includes("_ga=");
        } catch (e) {
          /* empty */
        }

        const json = await fetch(URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user
              ? { Authorization: `Bearer ${await user.getIdToken(true)}` }
              : {}),
          },
          body: JSON.stringify({
            ...(settings.openAIKey ? { openai_key: settings.openAIKey } : {}),
            gpt_model: settings.gptModel,
            command: cmd,
            arguments: argums,
            assistant_reply: agent.assistantReply,
            message_history: agent.output,
            ai_name: agent.name,
            ai_description: agent.description,
            ai_goals: agent.goals,
            agent_id: agent.id,

            ...(!hasReportedGA ? { rga: hasGA } : {}),
          }),
        }).then(async (r) => {
          if (r.status >= 200 && r.status < 400) {
            try {
              localStorage.setItem("godmode_gg", hasGA ? "x" : "y");
            } catch (e) {
              /* empty */
            }

            return r.json();
          } else {
            if (r.status === 403) {
              godmode_auth.signOut();
            }
            if (r.status === 401) {
              setShowSettings(true);
            }
            if (r.status === 503) {
              setShowSettings(true);
            }
            const json = await r
              .clone()
              .json()
              .catch(() => null);
            if (json) throw new Error(json.message);
            else throw new Error(await r.text());
          }
        });
        setAgent((a: IAgent | null) => ({
          ...(a ?? {}),
          name: a?.name ?? "",
          description: a?.description ?? "",
          goals: a?.goals ?? [],
          id: a?.id ?? "",
          command: json.command,
          args: JSON.stringify(json.arguments, null, 2),
          thoughts: json.thoughts,
          assistantReply: json.assistant_reply,
          output: json.message_history,
          result: json.result,
          tasks: a?.tasks ?? [],
        }));

        const result = json.result;
        setResult(result);

        const relevant_goal = json.thoughts?.relevant_goal;
        const rg = parseInt(relevant_goal) - 1;

        setGoals((goals) => {
          const newGoals = goals.slice();
          if (currGoal !== null && result) {
            try {
              const lastTask =
                newGoals[currGoal]?.tasks[newGoals[currGoal]?.tasks.length - 1];
              lastTask.result = result;
            } catch (e) {
              /* empty */
            }
          }
          if (!newGoals[rg]) return newGoals;
          newGoals[rg] = {
            ...newGoals[rg],
            tasks: [
              ...newGoals[rg].tasks,
              { task_name: json.task, result: "" },
            ],
          };
          return newGoals;
        });

        if (!isNaN(rg)) setCurrGoal(rg);
        else setCurrGoal(null);

        setFeedback("");

        // console.log(json.command)
        if ((json.command as string)?.toLowerCase().startsWith("error:")) {
          if (tries < 3) {
            setTries((t) => t + 1);
            callAgent();
          } else {
            setAutoApprove(false);
          }
        } else {
          setTries(0);
          setRunNumber((r) => r + 1);
          setLoading(false);
        }
      } catch (e) {
        if (e instanceof Error) {
          if (e.message.includes("quota")) {
            e.message +=
              "\nMake sure to add a payment method via the OpenAI dashboard.";
          }
          console.error(e);
          toast({
            title: "Error",
            description: e.message,
            status: "error",
            variant: "subtle",
            duration: 5000,
            isClosable: true,
          });
          setLoading(false);
        }
      }
    },
    [
      runNumber,
      user,
      feedback,
      settings.openAIKey,
      agent.name,
      agent.description,
      agent.goals,
      agent.id,
      setShowSettings,
      currGoal,
      tries,
      toast,
      setAutoApprove,
      setResult,
    ]
  );

  React.useEffect(() => {
    if (isStart && !loading && tries < 3) {
      setTries((tries) => tries + 1);
      setLoading(true);
      callAgent();
    }
  }, [callAgent, isStart, loading, tries]);

  const dispCommand: string =
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    commandmap[agent.command] || agent.command;

  React.useEffect(() => {
    if (autoApprove && !loading) {
      callAgent();
    }
  }, [autoApprove, callAgent, loading]);

  return (
    <Container maxW="5xl">
      <Logo />
      <Card
        borderRadius={10}
        mt={6}
        mb={4}
        padding={5}
        px={10}
        width="full"
        bg="#151328"
      >
        <Heading size="sm" fontWeight={500}>
          {agent.description}
        </Heading>
      </Card>

      <Grid
        templateColumns={{ sm: "1fr", md: "0.3fr 1fr", lg: "0.3fr 1fr" }}
        gap={4}
        width="full"
      >
        <GridItem order={[1, 1, 0]}>
          <Card borderRadius={10} padding={4} width="full" bg="#151328">
            <TaskList goals={goals} currGoal={currGoal} loading={loading} />
          </Card>
          <Card borderRadius={10} mt={4} padding={4} width="full" bg="#151328">
            <FileBrowser loading={loading} agent={agent} />
          </Card>
        </GridItem>
        <GridItem>
          <Card borderRadius={10} padding={4} width="full" bg="#151328">
            <Box width="full" alignItems="stretch">
              {agent.thoughts ? (
                <>
                  <Collapse in={!!result} animateOpacity>
                    <Heading
                      mb={4}
                      color="gray.300"
                      size="xs"
                      textTransform="uppercase"
                    >
                      Result
                    </Heading>
                    <ShowMoreText>
                      <Code
                        borderRadius={10}
                        fontSize={13}
                        hidden={isStart}
                        wordBreak="break-word"
                        width="full"
                        padding={4}
                        whiteSpace="pre-wrap"
                        fontWeight={300}
                      >
                        <Text as="span" color="green.300">
                          {result}
                        </Text>
                      </Code>
                    </ShowMoreText>
                    <Box pb={3}></Box>
                  </Collapse>
                  <Divider my={8} hidden={!result} />
                  <Heading
                    mb={4}
                    color="gray.300"
                    size="xs"
                    textTransform="uppercase"
                  >
                    Thoughts
                  </Heading>
                  <Text color="gray.400">
                    <TypeAnimation
                      key={agent.thoughts.thoughts}
                      sequence={[agent.thoughts.thoughts]}
                      wrapper="span"
                      cursor={false}
                      speed={80}
                    />
                  </Text>
                  <Divider my={8} />
                  <Heading
                    mb={4}
                    color="gray.300"
                    size="xs"
                    textTransform="uppercase"
                  >
                    Reasoning
                  </Heading>
                  <Text color="gray.400">
                    <TypeAnimation
                      key={agent.thoughts.reasoning}
                      sequence={[agent.thoughts.reasoning]}
                      wrapper="span"
                      cursor={false}
                      speed={80}
                    />
                  </Text>
                </>
              ) : (
                <Box textAlign="center" mt={4}>
                  <Heading size="sm">The AI is starting</Heading>
                  <Text color="whiteAlpha.600" mb={6}>
                    Sit back and relax
                  </Text>
                  <Spinner />
                </Box>
              )}
              <Divider my={8} />
              <Box>
                <Text>
                  <Heading
                    mb={4}
                    color="gray.300"
                    size="xs"
                    textTransform="uppercase"
                  >
                    Proposed action
                  </Heading>
                  {/* <Skeleton isLoaded={!!thoughts?.speak}>{thoughts?.speak}</Skeleton> */}
                </Text>
                <Code
                  borderRadius={10}
                  fontSize={13}
                  hidden={isStart}
                  width="full"
                  padding={4}
                  whiteSpace="pre-wrap"
                  fontWeight={300}
                >
                  COMMAND:{" "}
                  <Text as="span" color="green.300">
                    {dispCommand}
                  </Text>
                  <br />
                  ARGS:{" "}
                  <Text as="span" color="green.300">
                    {agent.args}
                  </Text>
                </Code>

                {!isArchived ? (
                  <Box>
                    <Heading
                      mt={6}
                      mb={2}
                      color="gray.300"
                      size="xs"
                      textTransform="uppercase"
                    >
                      Optional: give feedback
                    </Heading>
                    <Textarea
                      borderRadius={10}
                      rows={2}
                      readOnly={loading}
                      value={feedback}
                      onChange={(f) => setFeedback(f.target.value)}
                      placeholder="Want the AI to take another direction? Give it some feedback instead"
                      mb={6}
                    />

                    <Text
                      fontWeight="semibold"
                      textColor="GrayText"
                      hidden={!autoApprove}
                      pb={3}
                      textAlign="center"
                    >
                      <InfoIcon mr={2} mb={0.5} />
                      Auto-approve is enabled.
                    </Text>

                    <InputGroup display="flex">
                      <Box
                        borderRadius="10px"
                        background="linear-gradient(268.17deg, #0C0B20 6.09%, #2D2A3D 82.17%)"
                        flexGrow={1}
                      >
                        <Button
                          border="1px solid #75758B"
                          boxShadow="0px 4px 20px #33313A"
                          borderRadius="10px"
                          background="transparent"
                          color="white"
                          fontWeight={500}
                          w="full"
                          onClick={() => callAgent(!!feedback)}
                          isLoading={loading}
                          loadingText={<LoadText />}
                        >
                          {feedback
                            ? "Submit feedback"
                            : isStart
                            ? "Start Agent"
                            : "Approve this plan"}
                        </Button>
                      </Box>
                      <Box
                        borderRadius="10px"
                        background="linear-gradient(268.17deg, #0C0B20 6.09%, #2D2A3D 82.17%)"
                        hidden={!settings.openAIKey}
                        ml={3}
                      >
                        <Tooltip
                          label={
                            autoApprove
                              ? "Disable auto-approve"
                              : "Automatically approve for 10 minutes"
                          }
                          placement="top-start"
                          bg="gray.300"
                        >
                          <Button
                            onClick={() => setAutoApprove((a) => !a)}
                            border="1px solid #75758B"
                            boxShadow="0px 4px 20px #33313A"
                            borderRadius="10px"
                            background="transparent"
                            color="white"
                            fontWeight={500}
                          >
                            {autoApprove ? (
                              <CloseIcon fontSize="xs" />
                            ) : (
                              <TimeIcon />
                            )}
                          </Button>
                        </Tooltip>
                      </Box>
                    </InputGroup>
                  </Box>
                ) : (
                  <Box>
                    <Heading
                      mt={6}
                      mb={2}
                      color="gray.300"
                      size="xs"
                      textTransform="uppercase"
                    >
                      Approve action
                    </Heading>
                    <Text
                      fontWeight="semibold"
                      textColor="GrayText"
                      pb={3}
                      textAlign="center"
                    >
                      This agent has been archived. Please create a new agent to
                      continue.
                    </Text>
                  </Box>
                )}
              </Box>
            </Box>
          </Card>
        </GridItem>
      </Grid>
    </Container>
  );
};
