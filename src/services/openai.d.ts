export type GenerateAvatarResponseOptions = {
  model?: string;
  signal?: AbortSignal;
};

export function generateAvatarResponse(
  userTranscript: string,
  options?: GenerateAvatarResponseOptions,
): Promise<string>;
