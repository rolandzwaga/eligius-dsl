import type {
  DefaultSharedModuleContext,
  LangiumServices,
  LangiumSharedServices,
  Module,
  PartialLangiumServices,

} from "langium";
import {
  createDefaultModule,
  createDefaultSharedModule,
  inject,
} from "langium";
import {
  EligiusValidator,
  registerValidationChecks,
} from "./eligius-validator.js";
import {
  EligiusGeneratedModule,
  EligiusGeneratedSharedModule,
} from "./generated/module.js";
import { EligiusCompletionProvider } from "./eligius-completion-provider.js";
import { EligiusDocumentationProvider } from "./eligius-documentation-provider.js";


/**
 * Declaration of custom services - add your own service classes here.
 */
export type EligiusAddedServices = {
  validation: {
    EligiusValidator: EligiusValidator;
  };
};

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type EligiusServices = LangiumServices & EligiusAddedServices;

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const EligiusModule: Module<
  EligiusServices,
  PartialLangiumServices & EligiusAddedServices
> = {
  validation: {
    EligiusValidator: () => new EligiusValidator(),
  },
};

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createEligiusServices(context: DefaultSharedModuleContext): {
  shared: LangiumSharedServices;
  Eligius: EligiusServices;
} {
  const shared = inject(
    createDefaultSharedModule(context),
    EligiusGeneratedSharedModule
  );
  const Eligius = inject(
    createDefaultModule({ shared }),
    EligiusGeneratedModule,
    EligiusModule
  );
  Eligius.documentation.DocumentationProvider =
    new EligiusDocumentationProvider();
  Eligius.lsp.CompletionProvider = new EligiusCompletionProvider();
  shared.ServiceRegistry.register(Eligius);
  registerValidationChecks(Eligius);
  return { shared, Eligius };
}