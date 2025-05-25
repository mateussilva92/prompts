// Import all classes
import { AutocompletePrompt } from "./autocomplete";
import { AutocompleteMultiselectPrompt } from "./autocompleteMultiselect";
import { ConfirmPrompt } from "./confirm";
import { DatePrompt } from "./date";
import { MultiselectPrompt } from "./multiselect";
import { NumberPrompt } from "./number";
import { SelectPrompt } from "./select";
import { TextPrompt } from "./text";
import { TogglePrompt } from "./toggle";

// Import all types
import type { AutocompletePromptOptions } from "./autocomplete";
import type { ConfirmPromptOptions } from "./confirm";
import type { DatePromptOptions } from "./date";
import type { MultiselectPromptOptions } from "./multiselect";
import type { NumberPromptOptions } from "./number";
import type { SelectPromptOptions } from "./select";
import type { TextPromptOptions } from "./text";
import type { TogglePromptOptions } from "./toggle";

// Export all prompt classes
export const prompts = {
  AutocompletePrompt,
  AutocompleteMultiselectPrompt,
  ConfirmPrompt,
  DatePrompt,
  MultiselectPrompt,
  NumberPrompt,
  SelectPrompt,
  TextPrompt,
  TogglePrompt,
};

// Export types for each prompt
export type {
  AutocompletePromptOptions,
  ConfirmPromptOptions,
  DatePromptOptions,
  MultiselectPromptOptions,
  NumberPromptOptions,
  SelectPromptOptions,
  TextPromptOptions,
  TogglePromptOptions,
};
