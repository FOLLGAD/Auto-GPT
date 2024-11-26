import {
  useAuthState,
  useSignInWithTwitter,
  useSignOut,
  useSignInWithGithub,
} from "react-firebase-hooks/auth";

import { godmode_auth } from "./firebase";
import {
  Box,
  Button,
  Card,
  Divider,
  Input,
  InputGroup,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  Tooltip,
  VStack,
  useToast,
} from "@chakra-ui/react";
import React, { useCallback, useEffect, useState } from "react";
import SettingsModalContext from "./SettingsModalContext";
import { ISettings } from "./Agent";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithRedirect,
  signInWithPopup,
} from "firebase/auth";
import { CheckIcon } from "@chakra-ui/icons";

function isEmbeddedBrowser() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // Detect Twitter in-app browser
  if (/Twitter/i.test(userAgent)) {
    return true;
  }

  // Detect other embedded browsers (WebView)
  if (/WebView/i.test(userAgent)) {
    return true;
  }

  // Add other specific checks for embedded browsers if needed
  // ...

  return false;
}

export const useAuthIsOK = () => {
  const { settings } = React.useContext(SettingsModalContext);

  const [user, loading] = useAuthState(godmode_auth);

  const authIsOk = user?.email ? user.emailVerified : !!user;

  return !loading && (authIsOk || settings.openAIKey);
};

export default function LoginModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [user] = useAuthState(godmode_auth);

  const signInWithGoogle = useCallback(async () => {
    if (isEmbeddedBrowser()) {
      await signInWithRedirect(godmode_auth, new GoogleAuthProvider());
    } else {
      await signInWithPopup(godmode_auth, new GoogleAuthProvider());
    }
  }, []);

  useEffect(() => {
    getRedirectResult(godmode_auth);
  }, []);

  const [signInTw] = useSignInWithTwitter(godmode_auth);
  const [signOut] = useSignOut(godmode_auth);
  const [signInWithGithub] = useSignInWithGithub(godmode_auth);

  const { setSettings, settings } = React.useContext(SettingsModalContext);
  const [tempSettings, setTempSettings] = useState<ISettings>(settings);

  useEffect(() => {
    setTempSettings((s) => ({
      ...s,
      openAIKey: localStorage.getItem("openAIKey") || null,
    }));
  }, []);

  const updateSettings = useCallback(() => {
    tempSettings.openAIKey ||= null;

    const newSettings = { ...settings, ...tempSettings };
    setSettings(newSettings);

    if (tempSettings.openAIKey)
      localStorage.setItem("openAIKey", tempSettings.openAIKey || "");
    else localStorage.removeItem("openAIKey");
  }, [setSettings, settings, tempSettings]);

  const finish = useCallback(() => {
    updateSettings();
    onClose();
  }, [onClose, updateSettings]);

  useEffect(() => {
    if (!tempSettings.openAIKey && tempSettings.gptModel !== "gpt-3.5-turbo")
      setTempSettings({
        ...tempSettings,
        gptModel: "gpt-3.5-turbo",
      });
  }, [tempSettings]);

  const toasts = useToast();

  const checkKey = useCallback(async () => {
    if (!tempSettings.openAIKey) return;
    setKeyChecked(1);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + tempSettings.openAIKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: 'say "yes"',
          },
        ],
        model: tempSettings.gptModel,
        max_tokens: 3,
      }),
    });
    if (res.status === 200) {
      setKeyChecked(2);
    } else {
      const msg = (await res.json()).error.message as string;
      if (msg.includes("gpt-4")) {
        setTempSettings({
          ...tempSettings,
          gptModel: "gpt-3.5-turbo",
        });
      } else {
        toasts({
          title: "Key check failed",
          description: msg,
          status: "error",
          variant: "subtle",
          duration: 5000,
          isClosable: true,
        });
      }

      setKeyChecked(0);
    }
  }, [toasts, tempSettings, setTempSettings]);

  const [keyChecked, setKeyChecked] = useState(0);
  useEffect(() => {
    setKeyChecked(0);
  }, [tempSettings.openAIKey, tempSettings.gptModel]);

  return (
    <Modal isOpen={isOpen} onClose={finish}>
      <ModalOverlay />
      <ModalContent bg="#151328">
        <ModalHeader>Authenticate</ModalHeader>
        <ModalBody>
          <Box>
            <Text hidden={!!user}>
              To continue and save your sessions, please login:
            </Text>
            <VStack mt={4} hidden={!!user}>
              <Button onClick={() => signInWithGoogle()}>
                Sign in with Google
              </Button>
              <Button onClick={() => signInWithGithub()}>
                Sign in with Github
              </Button>
              <Button onClick={() => signInTw()}>Sign in with Twitter</Button>
            </VStack>
            <VStack mt={4} hidden={!user}>
              <Text>Great! You're logged in.</Text>
              <Button onClick={() => signOut()}>Sign out</Button>
            </VStack>

            <Divider my={8} />
          </Box>

          <Text>
            {settings.mustSetKey
              ? "Due to very high use, please provide your own OpenAI key to continue:"
              : "Alternatively, provide your own OpenAI key:"}
          </Text>
          <Text fontSize="xs" color="whiteAlpha.600">
            <Link
              textDecor="underline"
              _hover={{
                color: "whiteAlpha.800",
              }}
              href="https://platform.openai.com/account/api-keys"
              target="_blank"
            >
              Get your OpenAI key here
            </Link>
            . Make sure to enable billing{" "}
            <Link
              textDecor="underline"
              _hover={{
                color: "whiteAlpha.800",
              }}
              href="https://platform.openai.com/account/billing/payment-methods"
              target="_blank"
            >
              here
            </Link>
            .
          </Text>
          <VStack mt={2}>
            <InputGroup>
              <Input
                placeholder="OpenAI Key"
                isRequired={settings.mustSetKey}
                value={tempSettings.openAIKey || ""}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    openAIKey: e.target.value,
                  })
                }
              />
            </InputGroup>
            <Tooltip
              isDisabled={!!tempSettings.openAIKey}
              label="Supply your own OpenAI key to change model"
            >
              <Select
                disabled={!tempSettings.openAIKey}
                value={tempSettings.gptModel}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, gptModel: e.target.value })
                }
              >
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                <option value="gpt-4">gpt-4</option>
              </Select>
            </Tooltip>
            <Button
              isLoading={keyChecked === 1}
              loadingText="Checking..."
              onClick={checkKey}
              colorScheme={keyChecked === 2 ? "green" : "gray"}
              hidden={!tempSettings.openAIKey}
            >
              {keyChecked === 0 ? (
                "Verify API key"
              ) : (
                <>
                  <CheckIcon color="green" mr={2} /> You're good!
                </>
              )}
            </Button>
            <Text
              hidden={tempSettings.gptModel !== "gpt-4"}
              color="whiteAlpha.700"
            >
              Warning: the GPT-4 model is expensive. Keep track of your usage
              and{" "}
              <Link
                color="blue.300"
                href="https://platform.openai.com/account/billing/limits"
                target="_blank"
              >
                set limits
              </Link>{" "}
              to avoid unexpected charges.
            </Text>
          </VStack>

          <Card
            mt={4}
            fontSize="sm"
            px={3}
            textAlign="center"
            py={3}
            bg="whiteAlpha.50"
            color="whiteAlpha.800"
          >
            <Text fontSize="xs">DM us for feedback or questions!</Text>
            <Text>
              <Link
                _hover={{ color: "twitter.500" }}
                textDecor="underline"
                href="https://twitter.com/da_fant"
                target="_blank"
              >
                @da_fant
              </Link>
            </Text>
            <Text>
              <Link
                _hover={{ color: "twitter.500" }}
                textDecor="underline"
                href="https://twitter.com/_Lonis_"
                target="_blank"
              >
                @_Lonis_
              </Link>
            </Text>
            <Text>
              <Link
                _hover={{ color: "twitter.500" }}
                textDecor="underline"
                href="https://twitter.com/emilahlback"
                target="_blank"
              >
                @emilahlback
              </Link>
            </Text>
          </Card>
        </ModalBody>
        <Divider w="full" mt={2} />
        <ModalFooter pt={3}>
          <Button colorScheme="blue" mr={3} onClick={finish}>
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
