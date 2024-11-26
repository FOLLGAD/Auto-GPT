import { Card, Container, Heading, Text } from "@chakra-ui/react";
import { Logo } from "../src/AgentStart";
import Head from "next/head";

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
        <Heading textAlign="center">Changelog</Heading>
        <Text mt={4}>
          <Text fontWeight="bold">2023-05-26:</Text>
          <Text>Added About and Changelog pages</Text>
          <Text fontWeight="bold">2023-05-25:</Text>
          <Text>Fixed rate limit causing errors in search functionality</Text>
        </Text>
      </Card>
    </Container>
  );
};

export default App;
