// Lets A2UI components (rendered inside the stream) trigger a follow-up
// message — e.g. clicking a proactive chip sends a new query into the chat.

import { createContext, useContext } from "react";

export interface ChatActions {
  send: (query: string) => void;
}

export const ChatActionsContext = createContext<ChatActions>({ send: () => {} });
export const useChatActions = () => useContext(ChatActionsContext);
