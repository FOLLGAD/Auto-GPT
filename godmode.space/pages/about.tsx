import {
  Box,
  Button,
  Card,
  Container,
  Heading,
  Text,
  Link as Clink,
} from "@chakra-ui/react";
import { Logo } from "../src/AgentStart";
import Head from "next/head";
import Link from "next/link";

const App = () => {
  return (
    <Container maxW="5xl">
      <Head>
        <title>About – Godmode AI</title>
      </Head>
      <Logo redirect />
      <Card
        borderRadius={10}
        mt={6}
        mb={4}
        padding={5}
        px={10}
        width="full"
        bg="#151328"
      >
        <Heading textAlign="center">About</Heading>

        <Text>
          <Link href="/changelog" passHref>
            <Clink fontWeight="bold" color="blue.300">
              Changelog
            </Clink>
          </Link>
        </Text>

        <Text mt={4}>
          Godmode is a web platform to access the automation powers of autoGPT
          and babyAGI. AI agents are still in their infancy, but they are
          quickly growing in capabilities, and we hope that Godmode will enable
          more people to tap into autonomous AI agents even in this early stage.
        </Text>
        <Text mt={4}>
          Godmode is inspired by Auto-GPT and BabyAGI, and supports GPT-3.5 &
          GPT-4.
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
        <Box mt={4} textAlign="center">
          <Link href="/" passHref>
            <Button
              as="a"
              colorScheme="purple"
              color="white"
              borderRadius={8}
              bg="#6C70C2"
              size="xl"
              p={3.5}
              px={7}
              fontWeight={300}
              textTransform="uppercase"
            >
              Try it out
            </Button>
          </Link>
        </Box>
      </Card>
    </Container>
  );
};

export default App;
