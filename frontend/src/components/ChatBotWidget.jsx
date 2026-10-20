import React, { useEffect } from 'react';
import ChatBot from './ChatBot';

/**
 * ChatBotWidget - a thin wrapper that renders the ChatBot component as a floating widget.
 * It receives a `sessionId` prop (the chat session linked to the enquiry) and passes it
 * as the initial session ID to the ChatBot component. The widget forces the chat UI to
 * be opened immediately (`forceOpen=true`).
 */
export default function ChatBotWidget({ sessionId }) {
  // No internal state; simply render ChatBot with the provided session ID.
  return <ChatBot forceOpen={true} fullPage={false} initialSessionId={sessionId} />;
}
