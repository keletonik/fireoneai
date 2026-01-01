export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt?: string;
  examples?: string[];
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "audit",
    name: "/audit",
    description: "Fire safety audit assistance and compliance checks",
    icon: "clipboard",
    systemPrompt: "You are an expert fire safety auditor. Help the user conduct a comprehensive fire safety audit. Focus on systematic assessment, compliance verification, and documentation requirements. Ask clarifying questions about the building type, location, and specific areas of concern.",
    examples: [
      "What should I check during a Class 2 building audit?",
      "Create an audit checklist for fire doors",
      "How do I document non-compliance findings?",
    ],
  },
  {
    id: "compliance",
    name: "/compliance",
    description: "NCC/BCA compliance verification and requirements",
    icon: "check-square",
    systemPrompt: "You are an expert in Australian building codes and fire safety compliance. Focus on NCC/BCA requirements, Australian Standards, and regulatory compliance. Provide specific code references and explain how they apply to the user's situation.",
    examples: [
      "What are the FRL requirements for Class 5 buildings?",
      "Explain DtS provisions for smoke hazard management",
      "What are the egress requirements for a shopping center?",
    ],
  },
  {
    id: "afss",
    name: "/afss",
    description: "Annual Fire Safety Statement guidance",
    icon: "file-text",
    systemPrompt: "You are an expert in Annual Fire Safety Statements (AFSS) for NSW buildings. Guide the user through AFSS requirements, essential fire safety measures, maintenance schedules, and documentation. Reference EP&A Regulation requirements where applicable.",
    examples: [
      "What essential measures need to be on an AFSS?",
      "How do I verify fire safety measure compliance?",
      "What documentation is required for AFSS submission?",
    ],
  },
  {
    id: "report",
    name: "/report",
    description: "Fire safety report writing and documentation",
    icon: "edit-3",
    systemPrompt: "You are an expert fire safety report writer. Help the user create professional fire safety reports, findings documentation, and recommendations. Focus on clear, concise technical writing that meets industry standards.",
    examples: [
      "Help me write a fire safety assessment summary",
      "How should I document a non-compliance finding?",
      "Create a template for fire safety recommendations",
    ],
  },
  {
    id: "standards",
    name: "/standards",
    description: "Australian Standards reference and interpretation",
    icon: "book",
    systemPrompt: "You are an expert in Australian Standards related to fire safety. Help the user understand and apply relevant standards including AS 1851, AS 2118, AS 2419, AS 2444, and others. Provide specific clause references where possible.",
    examples: [
      "What does AS 1851 require for fire pump testing?",
      "Explain AS 2118.1 requirements for sprinkler systems",
      "What are the maintenance requirements under AS 1851?",
    ],
  },
  {
    id: "calculate",
    name: "/calculate",
    description: "Fire engineering calculations and assessments",
    icon: "activity",
    systemPrompt: "You are an expert fire engineer. Help the user with fire engineering calculations, tenability assessments, and quantitative analysis. Provide formulas, methodologies, and explain the engineering principles behind fire safety calculations.",
    examples: [
      "How do I calculate RSET for evacuation?",
      "Explain tenability criteria for smoke",
      "What factors affect Required Safe Egress Time?",
    ],
  },
  {
    id: "help",
    name: "/help",
    description: "View all available commands and features",
    icon: "help-circle",
    examples: [],
  },
];

export function parseSlashCommand(text: string): { command: SlashCommand | null; query: string } {
  const trimmed = text.trim();
  
  if (!trimmed.startsWith("/")) {
    return { command: null, query: text };
  }

  const firstSpace = trimmed.indexOf(" ");
  const commandText = firstSpace === -1 ? trimmed : trimmed.substring(0, firstSpace);
  const query = firstSpace === -1 ? "" : trimmed.substring(firstSpace + 1).trim();

  const command = SLASH_COMMANDS.find(
    (cmd) => cmd.name.toLowerCase() === commandText.toLowerCase()
  );

  return { command: command || null, query };
}

export function getMatchingCommands(text: string): SlashCommand[] {
  const trimmed = text.trim().toLowerCase();
  
  if (!trimmed.startsWith("/")) {
    return [];
  }

  if (trimmed === "/") {
    return SLASH_COMMANDS;
  }

  return SLASH_COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(trimmed)
  );
}
