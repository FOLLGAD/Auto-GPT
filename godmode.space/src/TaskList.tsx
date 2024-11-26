import React from "react";
import { CheckCircleIcon, RepeatIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Heading,
  ListItem,
  Text,
  UnorderedList,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Code,
} from "@chakra-ui/react";

export const TaskList = ({
  goals,
  currGoal,
  loading,
}: {
  goals: { goal: string; tasks: { task_name: string; result: string }[] }[];
  currGoal: number | null;
  loading: boolean;
}) => {
  const [modalMessage, setModalMessage] = React.useState(null as string | null);

  return (
    <>
      <Modal
        isOpen={!!modalMessage}
        onClose={() => setModalMessage(null)}
        size="2xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Task result</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Code whiteSpace="pre-wrap" w="full">
              {modalMessage}
            </Code>
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
      <Heading color="gray.300" mb={2} size="xs" textTransform="uppercase">
        Tasks
      </Heading>
      {goals.map((g, gi) => (
        <Box key={gi}>
          <Text fontSize="sm">
            <Box
              display="inline-block"
              w="0.8rem"
              h="0.8rem"
              borderRadius="full"
              borderWidth="1px"
              mr={2}
              border="1.25px solid #FFFFFF"
              background={gi === currGoal ? "green.400" : "gray.400"}
              borderColor={gi === currGoal ? "green.200" : "gray.200"}
              flexShrink={0}
            />
            {g.goal}
          </Text>
          <UnorderedList
            listStyleType="none"
            pl={4}
            color="gray.400"
            ml={0}
            mb={2}
            spacing={2}
          >
            {g.tasks.map((t, i, a) => (
              <ListItem key={i} fontSize="sm">
                <Text>
                  {i === a.length - 1 && currGoal === gi ? (
                    <RepeatIcon
                      animation={loading ? "spin 1s linear infinite" : "none"}
                      color="gray.300"
                      mr={1}
                    />
                  ) : (
                    <CheckCircleIcon color="green.400" mr={1} />
                  )}
                  <Text as="span" mr={1}>
                    {t.task_name}
                  </Text>
                  {!!t.result && (
                    <Button
                      display="inline-block"
                      size="xs"
                      py={0}
                      px={1.5}
                      onClick={() => setModalMessage(t.result)}
                      fontWeight="normal"
                    >
                      View result
                    </Button>
                  )}
                </Text>
                <Text>
                  {i === a.length - 1 && currGoal === gi && !loading && (
                    <Button size="xs" disabled mb={1}>
                      Waiting for approval
                    </Button>
                  )}
                </Text>
              </ListItem>
            ))}
          </UnorderedList>
        </Box>
      ))}
    </>
  );
};
