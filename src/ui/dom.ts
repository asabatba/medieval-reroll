export const esc = (t: unknown): string => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

export const KIND_LABEL: Record<string, string> = { birth: "Birth", plague: "Pestilence", famine: "Famine", grief: "Loss", fortune: "Fortune", marriage: "Marriage", child: "Birth of a child", war: "War", revolt: "Revolt", hardship: "Hardship", death: "Obiit", life: "" };
