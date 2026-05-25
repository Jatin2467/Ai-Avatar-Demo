const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";

function generateDemoResponse(userTranscript) {
  const message = userTranscript.trim();
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("price") || lowerMessage.includes("cost")) {
    return "For demo pricing, I would position this as a flexible avatar assistant package. The exact cost depends on voice quality, AI model usage, and how deeply it connects with your product.";
  }

  if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return "Hello. I am your AI avatar demo assistant. You can speak or type a question, and I will answer out loud while the avatar reacts.";
  }

  if (lowerMessage.includes("what can you do") || lowerMessage.includes("features")) {
    return "I can listen through the microphone, read typed questions, generate a short answer, and speak it back using the browser voice. With an OpenAI key, my replies become fully AI generated.";
  }

  return `I heard: "${message}". In demo mode, I can give a short sample reply and speak it back. Add an OpenAI API key to make this answer fully intelligent and dynamic.`;
}

function getOutputText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const textParts = response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" || content.type === "text")
    .map((content) => content.text)
    .filter(Boolean);

  return textParts?.join("\n").trim() ?? "";
}

export async function generateAvatarResponse(userTranscript, options = {}) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    return generateDemoResponse(userTranscript);
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model ?? import.meta.env.VITE_OPENAI_MODEL ?? DEFAULT_MODEL,
      instructions:
        "You are a premium AI avatar assistant in a startup demo. Reply naturally, clearly, and conversationally. Keep responses under 90 words.",
      input: userTranscript,
      max_output_tokens: 220,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message ?? "OpenAI request failed. Please try again.";
    throw new Error(message);
  }

  const outputText = getOutputText(data);

  if (!outputText) {
    throw new Error("OpenAI returned an empty response.");
  }

  return outputText;
}
