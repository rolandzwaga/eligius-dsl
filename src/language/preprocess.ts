
import type { AstNode } from "langium";

export function preprocessAstNodeObject<T extends AstNode>(node: T
): T {
  (node as any).$container = undefined;
  (node as any).$containerProperty = undefined;
  (node as any).$containerIndex = undefined;
  (node as any).$cstNode = undefined;
  (node as any).$document = undefined;

  Object.entries(node).forEach(([name, value]) => {
    if (typeof value === "object") {
      (node as any)[name] = preprocessAstNodeObject(value);
    } else if (Array.isArray(value)) {
      (node as any)[name] = value.map(preprocessAstNodeObject);
    }
  });

  return node;
}