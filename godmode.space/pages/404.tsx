import { Button, Card, Container, Text } from "@chakra-ui/react";
import Head from "next/head";
import { Logo } from "../src/AgentStart";
import Link from "next/link";

export default function Custom404() {
  return (
    <Container maxW="5xl">
      <Head>
        <title>404 – Godmode AI</title>
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
        alignItems="center"
      >
        <Text textAlign="center">404 - Not found</Text>
        <Link href="/">
          <Button
            colorScheme="purple"
            color="white"
            borderRadius={8}
            bg="#6C70C2"
            size="xl"
            p={3.5}
            mt={12}
            px={7}
            fontWeight={300}
            textTransform="uppercase"
          >
            Go home
          </Button>
        </Link>
      </Card>
    </Container>
  );
}
