import { metadata } from "eligius";
import type { AstNode, DocumentationProvider } from "langium";
import type { Operation } from "./generated/ast.js";

export class EligiusDocumentationProvider implements DocumentationProvider {
    getDocumentation(node: AstNode): string | undefined {
      if (isOperationNode(node)) {
        return getMetadataDescription(node.systemName);
      }
  
      return undefined;
    }
  }
  
  export function getMetadataDescription(name: string) {
    const operationMetadataFunc = (metadata as any)[name];
    if (operationMetadataFunc) {
      const operationMetadata = operationMetadataFunc();
      return operationMetadata.description as string;
    }
    return;
  }
  
  function isOperationNode(node: AstNode): node is Operation {
    return node.$type === "Operation";
  }
  