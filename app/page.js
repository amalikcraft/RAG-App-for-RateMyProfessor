'use client'

import { Box, Button, Stack, TextField } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you?"
    }
  ]);

  const [message, setMessage] = useState('');
  const messageContainerRef = useRef(null);

  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "..." } // Placeholder for the assistant's response
    ]);

    setMessage(''); // Clear input field after sending

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let result = '';
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }

        const text = decoder.decode(value || new Uint8Array(), { stream: true });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });

        return reader.read().then(processText);
      });
    });
  };

  // Auto-scroll to the bottom when a new message is added
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#f7f8fa"
      p={2}
    >
      <Stack
        direction="column"
        width={{ xs: "90%", sm: "70%", md: "50%", lg: "40%" }}
        height="80%"
        border="1px solid #ddd"
        borderRadius={4}
        boxShadow="0px 4px 12px rgba(0, 0, 0, 0.1)"
        p={2}
        spacing={3}
        bgcolor="white"
      >
        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          overflow="auto"
          ref={messageContainerRef}
          sx={{ paddingRight: '8px', maxHeight: '70vh' }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={message.role === "assistant" ? "flex-start" : "flex-end"}
            >
              <Box
                bgcolor={message.role === "assistant" ? "#1976d2" : "#4caf50"}
                color="white"
                borderRadius={6}
                p={2}
                m={2}
                maxWidth="75%"
                boxShadow="0px 4px 8px rgba(0, 0, 0, 0.1)"
                fontSize="14px"
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Type your message..."
            variant="outlined"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
            autoFocus
          />
          <Button variant="contained" color="primary" onClick={sendMessage}>Send</Button>
        </Stack>
      </Stack>
    </Box>
  );
}

