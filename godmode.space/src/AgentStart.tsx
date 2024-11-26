import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Heading,
  Text,
  Box,
  Button,
  Input,
  List,
  ListItem,
  Container,
  FormLabel,
  InputGroup,
  SkeletonText,
  Tag,
  VStack,
  Collapse,
  useToast,
  Link as Clink,
  Card,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import { IAgent } from "./Agent";
import { v4 as uuidv4 } from "uuid";
import { URL } from "./constants";
import { useAuthState } from "react-firebase-hooks/auth";
import { godmode_auth } from "./firebase";
import SettingsModalContext from "./SettingsModalContext";
import Link from "next/link";

export const Logo = ({ redirect = false }) => (
  <Heading
    mt={6}
    mb={4}
    textAlign="center"
    color="white"
    fontWeight={700}
    fontSize={18}
    letterSpacing="0.33em"
  >
    {redirect ? (
      <Link title="Godmode" href="/">
        GODMODE{" "}
        <Text as="span" fontSize={32} verticalAlign="middle">
          ⚡️
        </Text>{" "}
        <Text as="span">AI</Text>
      </Link>
    ) : (
      <a title="Godmode" href="#">
        GODMODE{" "}
        <Text as="span" fontSize={32} verticalAlign="middle">
          ⚡️
        </Text>{" "}
        <Text as="span">AI</Text>
      </a>
    )}
  </Heading>
);

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const LinearListItem = ({ children }: { children: React.ReactNode }) => (
  <ListItem alignItems="center" display="flex">
    <Box
      display="inline-block"
      bg="gray.400"
      w="1.2rem"
      h="1.2rem"
      borderRadius="full"
      borderWidth="1px"
      borderColor="gray.700"
      mr={[2, 2, 4]}
      background="rgba(217, 217, 217, 0.2)"
      border="1.25px solid #FFFFFF"
      flexShrink={0}
    />
    <Text display="inline-flex" alignItems="center" flexGrow={1}>
      {children}
    </Text>
  </ListItem>
);

export const AgentStart = ({ setAgent }: { setAgent: (a: IAgent) => void }) => {
  // Name, description: string, goals: string[]
  const [agentName, setAgentName] = React.useState("GodmodeGPT");
  const [agentDescription, setAgentDescription] = React.useState("");
  const [agentGoals, _setAgentGoals] = React.useState<string[]>([""]);
  const setAgentGoals = useCallback(
    (goals: string[] | ((prevGoals: string[]) => string[])) => {
      if (typeof goals === "function") {
        const g = goals(agentGoals);
        goals = g;
      }
      _setAgentGoals(
        [...goals.filter((g) => g.trim().length > 0), ""].slice(0, 5)
      );
    },
    [agentGoals]
  );

  const callAgent = React.useCallback(
    (event: Event) => {
      if (!agentName || !agentDescription || agentGoals.length < 1) {
        event.preventDefault();
        return;
      }
      setAgent({
        name: agentName,
        description: agentDescription,
        goals: agentGoals.filter((g) => g.trim().length > 0),
        id: uuidv4(),
        assistantReply: "",
        thoughts: null,
        command: "###start###",
        args: "",
        output: [],
        tasks: [],
      });
    },
    [agentName, agentDescription, agentGoals, setAgent]
  );

  const debouncedDescription = useDebounce(agentDescription, 500);

  const [exampleSubgoals, setExampleSubgoals] = React.useState<string[] | null>(
    null
  );

  const [showSubgoals, setShowSubgoals] = React.useState(false);

  const [user] = useAuthState(godmode_auth);
  user?.getIdToken(true);

  const { settings, setShowSettings } = useContext(SettingsModalContext);
  const toast = useToast();

  useEffect(() => {
    if (!showSubgoals || !debouncedDescription) return;
    try {
      (async () => {
        try {
          const data = await fetch(URL + "-goal-subgoals", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(user
                ? { Authorization: `Bearer ${await user.getIdToken(true)}` }
                : {}),
            },
            body: JSON.stringify({
              ...(settings.openAIKey ? { openai_key: settings.openAIKey } : {}),
              goal: debouncedDescription,
            }),
          }).then(async (r) => {
            if (r.status >= 200 && r.status < 400) return r.json();
            else {
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
          setExampleSubgoals(
            data.subgoals
              .split("\n")
              .map((a: string) => a.trim().replace(/^\d+\.\s*/, ""))
              .filter((a: string) => a.length > 0)
          );
        } catch (e) {
          if (e instanceof Error) {
            console.error(e);
            toast({
              title: "Error",
              description: e.message,
              status: "error",
              variant: "subtle",
              duration: 5000,
              isClosable: true,
            });
          }
        }
      })();
    } catch (e) {
      /* empty */
    }
  }, [
    debouncedDescription,
    setShowSettings,
    settings.openAIKey,
    showSubgoals,
    toast,
    user,
  ]);

  const [closedAbout, setClosedAbout] = useState("");

  useEffect(() => {
    const isClosed = localStorage.getItem("closedAbout") === "true";
    if (isClosed) setClosedAbout("true");
  }, []);

  useEffect(() => {
    localStorage.setItem("closedAbout", closedAbout);
  }, [closedAbout]);

  return (
    <Container p={4} maxW="container.md">
      <Logo />
      <FormLabel hidden>
        Name
        <Input
          required
          placeholder="GodGPT"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
        />
      </FormLabel>
      <FormLabel mt={12} px={[0, 10]}>
        <InputGroup
          background="linear-gradient(268.17deg, #0C0B20 6.09%, #2D2A3D 82.17%)"
          borderRadius={10}
        >
          <Input
            shadow="rgba(0, 0, 0, 0.1) 0px 0px 0px 1px, rgba(0, 0, 0, 0.2) 0px 5px 10px 0px, rgba(0, 0, 0, 0.4) 0px 15px 40px 0px"
            bg="whiteAlpha.50"
            size="lg"
            px={6}
            py={6}
            borderRadius={10}
            required
            placeholder="What do you want to do?"
            value={agentDescription}
            style={{
              border: "1px solid #75758B",
              boxShadow: "0px 4px 20px #33313A",
              borderRadius: "10px",
            }}
            _focus={{
              background: "#2E2A3D",
            }}
            _hover={{
              background: "#2E2A3D",
            }}
            onChange={(e) => setAgentDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setShowSubgoals(true);
                (e.target as any).blur();
              }
            }}
          />
        </InputGroup>
      </FormLabel>
      <Container p={4} px={[0, 8]}>
        <Box>
          <Collapse in={!showSubgoals} animateOpacity>
            <Text
              mb={4}
              mt={8}
              textAlign="center"
              fontWeight={500}
              fontSize="xs"
              color="whiteAlpha.900"
              textTransform="uppercase"
            >
              Examples
            </Text>
            <Box
              color="gray.500"
              fontSize="sm"
              display="flex"
              justifyContent="center"
            >
              <VStack textAlign="left" spacing={13} alignItems="flex-start">
                <Tag
                  fontWeight={300}
                  color="whiteAlpha.600"
                  bg="#423C562E"
                  p={[2, 5]}
                  px={[3, 8]}
                  size="sm"
                  w="full"
                >
                  In which market should I first launch my vegan protein bars?
                </Tag>
                <Tag
                  fontWeight={300}
                  color="whiteAlpha.600"
                  bg="#423C562E"
                  p={[2, 5]}
                  px={[3, 8]}
                  size="sm"
                  w="full"
                >
                  Write me a resignation letter to my boss at SAP
                </Tag>
                <Tag
                  fontWeight={300}
                  color="whiteAlpha.600"
                  bg="#423C562E"
                  p={[2, 5]}
                  px={[3, 8]}
                  size="sm"
                  w="full"
                >
                  Explore the possibility there existed an advanced pre-ice age
                  civilization
                </Tag>
              </VStack>
            </Box>
          </Collapse>
        </Box>
      </Container>
      <Container p={4} px={[0, 0, 8]} hidden={!showSubgoals}>
        <Box hidden={agentDescription.length === 0}>
          <Collapse in={showSubgoals} animateOpacity>
            {exampleSubgoals ? (
              <List w="full" spacing={4} pr={2} pt={1}>
                {agentGoals.map((goal, i) => (
                  <Box key={i}>
                    <LinearListItem>
                      <Text
                        outline={0}
                        borderBottom="2px solid transparent"
                        _focus={{
                          borderBottomColor: "#75758B",
                        }}
                        boxSizing="border-box"
                        contentEditable
                        w="full"
                        onBlur={(e) => {
                          setAgentGoals((a) =>
                            [...a].map((g, j) =>
                              i === j ? e.target.innerText : g
                            )
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setAgentGoals((a) => [
                              ...a.slice(0, i + 1).filter((a) => !!a),
                              "",
                              ...a.slice(i + 1).filter((a) => !!a),
                            ]);
                            (e.target as any).blur();
                            e.preventDefault();
                          }
                        }}
                      >
                        {goal}
                      </Text>
                    </LinearListItem>
                  </Box>
                ))}
                {exampleSubgoals.map((s, i) => (
                  <LinearListItem key={i}>
                    <Text
                      display="inline-block"
                      fontStyle="italic"
                      color="whiteAlpha.500"
                      flexGrow={1}
                      onClick={() => {
                        if (agentGoals.filter((a) => !!a).length >= 5) return;
                        setAgentGoals((a) => [...a, s]);
                        setExampleSubgoals(
                          (a) => a?.filter((a) => a !== s) ?? null
                        );
                      }}
                    >
                      Suggested: {s}
                    </Text>
                    <Button
                      ml={4}
                      size="sm"
                      flexShrink={0}
                      display={["none", null, "inline-block"]}
                      hidden={agentGoals.filter((a) => !!a).length >= 5}
                      onClick={() => {
                        setAgentGoals((a) => [...a, s]);
                        setExampleSubgoals(
                          (a) => a?.filter((a) => a !== s) ?? null
                        );
                      }}
                    >
                      + Add
                    </Button>
                  </LinearListItem>
                ))}
              </List>
            ) : (
              <SkeletonText mt="4" noOfLines={5} spacing="4" />
            )}
          </Collapse>
        </Box>
      </Container>
      <Box display="flex" justifyContent="center" mt={12}>
        <Button
          colorScheme="purple"
          color="white"
          hidden={showSubgoals}
          borderRadius={8}
          bg="#6C70C2"
          size="xl"
          p={3.5}
          px={7}
          isDisabled={!agentDescription}
          onClick={() => setShowSubgoals(true)}
          fontWeight={300}
          textTransform="uppercase"
        >
          Launch
        </Button>

        <Button
          colorScheme="purple"
          color="white"
          hidden={!showSubgoals}
          borderRadius={8}
          bg="#6C70C2"
          size="xl"
          p={3.5}
          px={7}
          isDisabled={
            !agentDescription || agentGoals.filter((a) => !!a).length < 1
          }
          onClick={(e) => callAgent(e as any)}
          fontWeight={300}
          textTransform="uppercase"
        >
          Launch
        </Button>
      </Box>
      <Accordion
        mt={16}
        allowToggle
        defaultIndex={closedAbout === "true" ? -1 : 0}
        onChange={(expandedIndex) => {
          setClosedAbout(expandedIndex === 0 ? "" : "true");
        }}
        index={closedAbout === "true" ? -1 : 0}
      >
        <AccordionItem border="none">
          <h2>
            <AccordionButton px={8} as={Box}>
              <Button
                fontSize={15}
                color="GrayText"
                variant="ghost"
                width="full"
              >
                <Box as="span" flex="1" textAlign="left">
                  About
                </Box>
                <AccordionIcon />
              </Button>
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Card
              borderRadius={10}
              mb={4}
              padding={8}
              width="full"
              bg="#151328"
            >
              <Box fontSize="sm" color="GrayText">
                <Text>
                  Godmode is a web platform to access the automation powers of
                  autoGPT and babyAGI. AI agents are still in their infancy, but
                  they are quickly growing in capabilities, and we hope that
                  Godmode will enable more people to tap into autonomous AI
                  agents even in this early stage.
                </Text>
                <Text mt={4}>
                  Godmode is inspired by Auto-GPT and BabyAGI, and supports
                  GPT-3.5 & GPT-4.
                </Text>
                <Text mt={4}>
                  Godmode is a project by{" "}
                  <Clink
                    color="blue.300"
                    href="https://twitter.com/emilahlback"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @emilahlback
                  </Clink>
                  ,{" "}
                  <Clink
                    color="blue.300"
                    href="https://twitter.com/da_fant"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @da_fant
                  </Clink>{" "}
                  and{" "}
                  <Clink
                    color="blue.300"
                    href="https://twitter.com/_Lonis_"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @_Lonis_
                  </Clink>
                  .
                </Text>
              </Box>
            </Card>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Container>
  );
};
