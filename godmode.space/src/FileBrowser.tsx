import React, { useCallback, useEffect, useState } from "react";
import { IAgentInfo } from "./Agent";
import {
  Box,
  Button,
  Code,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { CopyIcon, DownloadIcon } from "@chakra-ui/icons";
import { URL as API_URL } from "./constants";

const useFiles = (
  agent: IAgentInfo
): { files: string[]; loading: boolean; refetch: () => void } => {
  // fetch `URL/files` which returns a list of links to files
  const [files, setFiles] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refetch = React.useCallback(() => {
    fetch(`${API_URL}/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id: agent.id }),
    })
      .then((res) => res.json())
      .then((files: string[]) => {
        setFiles(files);
        setLoading(false);
      });
  }, [agent.id]);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  return { files, loading, refetch };
};

const FileList = ({ files }: { files: string[] }) => {
  const [modalMessage, setModalMessage] = useState<{
    name: string;
    content: string;
  } | null>(null);

  const getFileName = (file: string) => file.slice(file.lastIndexOf("/") + 1);

  const showFile = useCallback((file: string) => {
    fetch(file)
      .then((res) => res.text())
      .then((a) => setModalMessage({ name: getFileName(file), content: a }));
  }, []);

  const downloadFile = useCallback((file: string) => {
    fetch(file)
      .then((res) => res.text())
      .then((a) => {
        const element = document.createElement("a");
        const f = new Blob([a], { type: "text/plain" });
        element.href = URL.createObjectURL(f);
        element.download = getFileName(file);
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
      });
  }, []);

  return (
    <Box>
      {files?.length ? (
        files.map((file, i) => (
          <Box key={i} display="flex">
            <Button
              wordBreak="break-word"
              variant="link"
              flexShrink={1}
              whiteSpace="normal"
              onClick={() => showFile(file)}
              textAlign="left"
              size="sm"
              fontWeight="normal"
            >
              {getFileName(file)}{" "}
            </Button>
            <Box flexGrow={1} />
            <Button
              onClick={() => downloadFile(file)}
              variant="ghost"
              size={["md", null, "xs"]}
              flex={0}
            >
              <DownloadIcon />
            </Button>
          </Box>
        ))
      ) : (
        <Text color="GrayText">No files yet</Text>
      )}
      <Modal
        isOpen={!!modalMessage}
        onClose={() => setModalMessage(null)}
        size="2xl"
      >
        <ModalOverlay />
        <ModalContent bg="#151328">
          <ModalHeader>{modalMessage && modalMessage.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody position="relative">
            <Code whiteSpace="pre-wrap" bg="#151328" w="full">
              {modalMessage?.content ? (
                modalMessage.content
              ) : (
                <Text color="GrayText">This file is empty</Text>
              )}
            </Code>
            <Tooltip label="Copy to clipboard" bg="whiteAlpha.700">
              <Button
                onClick={() =>
                  navigator.clipboard.writeText(modalMessage?.content ?? "")
                }
                colorScheme="whiteAlpha"
                color="whiteAlpha.800"
                size="sm"
                position="absolute"
                right={2}
                top={2}
                _hover={{ bg: "whiteAlpha.300" }}
                variant="ghost"
              >
                <CopyIcon />
              </Button>
            </Tooltip>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => setModalMessage(null)}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export const FileBrowser = ({
  agent,
  loading: agentLoading,
}: {
  agent: IAgentInfo;
  loading: boolean;
}) => {
  const { files, refetch } = useFiles(agent);

  const loadFiles = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    loadFiles();
  }, [agent.id, agentLoading]);

  return (
    <>
      <Box pos="relative">
        <Heading
          color="gray.300"
          mb={2}
          size="xs"
          textTransform="uppercase"
          flexGrow={1}
        >
          Files
        </Heading>
      </Box>
      <Box>
        <FileList files={files} />
      </Box>
    </>
  );
};
