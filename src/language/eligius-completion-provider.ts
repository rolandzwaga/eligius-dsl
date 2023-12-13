import { findLeafNodeAtOffset, type CompletionProvider, type LangiumDocument, type MaybePromise, type CompletionProviderOptions, type LeafCstNode } from "langium";
import type { CancellationToken, CompletionParams } from "vscode-languageserver";
import { CompletionList } from "vscode-languageserver";
import { Operation } from "./generated/ast.js";
import { metadata } from "eligius";
import { getMetadataDescription } from "./eligius-documentation-provider.js";

const operationNames = Object.keys(metadata).filter(
    (x) =>
      x !== "forEach" &&
      x !== "endForEach" &&
      x !== "when" &&
      x !== "endWhen" &&
      x !== "otherwise"
  );
  
export class EligiusCompletionProvider implements CompletionProvider {
    getCompletion(
      document: LangiumDocument,
      params: CompletionParams,
      _cancelToken?: CancellationToken
    ): MaybePromise<CompletionList | undefined> {
      const cst = document.parseResult.value.$cstNode;
  
      if (!cst) {
        return;
      }
      const textDocument = document.textDocument;
      const offset = textDocument.offsetAt(params.position);

      console.log('cst', cst);

      const leaf = findLeafNodeAtOffset(cst, offset);
      if (!leaf) {
        return undefined;
      }
  
      if (leaf.tokenType.name === ")" && leaf.astNode.$type === "Operation") {
        return this.createOperationCompletion(leaf);
      } else if (leaf.astNode.$container?.$type === "Action") {
        return this.createActionCompletion();
      }
  
      return undefined;
    }
  
    private createOperationCompletion(leaf: LeafCstNode) {
      const fn = (metadata as any)[(leaf.astNode as Operation).systemName];
      const operationMetadata = fn();
      const entries: [string, any][] = Object.entries(
        operationMetadata.properties ?? {}
      );
      return CompletionList.create(
        entries.map(([name, value]) => ({
          label: name,
          insertText: `${name}=`,
          detail: typeof value === "string" ? value : value.type,
          kind: 5,
        }))
      );
    }
  
    private createActionCompletion() {
      return CompletionList.create(
        operationNames.map((x) => ({
          label: x,
          insertText: `${x}()`,
          detail: getMetadataDescription(x),
          kind: 2,
        }))
      );
    }
  
    /**
     * Contains the completion options for this completion provider.
     *
     * If multiple languages return different options, they are merged before being sent to the language client.
     */
    readonly completionOptions?: CompletionProviderOptions;
  }