import { metadata } from "eligius";
import type { ValidationAcceptor, ValidationChecks } from "langium";
import type { EligiusServices } from "./eligius-module.js";
import { isOperation, type EligiusAstType, type NamedArgument, type Operation } from "./generated/ast.js";

const operationNames = Object.keys(metadata).filter(
  (x) =>
    x !== "forEach" &&
    x !== "endForEach" &&
    x !== "when" &&
    x !== "endWhen" &&
    x !== "otherwise"
);

export function createChecks(validator: EligiusValidator) {
  const checks: ValidationChecks<EligiusAstType> = {
    Operation: validator.checkOperation,
    NamedArgument: validator.checkNamedArgument,
  };
  return checks;
}

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: EligiusServices) {
  const registry = services.validation.ValidationRegistry;
  const validator = services.validation.EligiusValidator;
  const checks = createChecks(validator);
  registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class EligiusValidator {

  checkOperation(operation: Operation, accept: ValidationAcceptor): void {
    if (!operationNames.includes(operation.systemName)) {
      accept("error", "Unknown operation name.", {
        node: operation,
        property: "systemName",
      });
    } else {
      const operationMetadataFunc = (metadata as any)[operation.systemName];
      if (operationMetadataFunc) {
        const operationMetadata = operationMetadataFunc();
        const currentLen = operation.arguments.length;
        const expectedLen = getRequiredParameterCount(operationMetadata);
        if (currentLen !== expectedLen) {
          accept(
            "error",
            `Expected number of required arguments for this operation is ${expectedLen}.`,
            {
              node: operation,
              property: "systemName",
            }
          );
        }
      }
    }
  }

  checkNamedArgument(argument: NamedArgument, accept: ValidationAcceptor): void {
    const operation = argument.$container;
    if (isOperation(operation)) {
      const opSysName = operation.systemName;
      const operationMetadataFunc = (metadata as any)[opSysName];
      if (operationMetadataFunc) {
        const operationMetadata = operationMetadataFunc();

        if (!Object.values(operationMetadata.properties ?? {}).length) {
          accept("error", "This operation does not take any parameters", {
            node: argument,
            property: "value",
          });
        } else if (
          !operationMetadata.properties?.[argument.name]
        ) {
          accept(
            "error",
            `Unknown named operation parameter. Known parameters: ${Object.keys(
              operationMetadata.properties
            ).join(", ")}`,
            {
              node: argument,
              property: "name",
            }
          );
        }
      }
    }
  }
}

function getRequiredParameterCount(operationMetadata: any) {
  return Object.values(operationMetadata.properties ?? {})
    .filter((x) => typeof x === "object")
    .filter((x: any) => "required" in x && x.required === true).length;
}
