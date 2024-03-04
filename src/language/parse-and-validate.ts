import type { AstNode, AstNodeDescription, CstNode, DiagnosticInfo, LangiumDocument, Linker, LinkingError, Reference, ReferenceInfo, ValidationAcceptor, ValidationOptions } from "langium";
import { DefaultLexer, DefaultTokenBuilder, DefaultValueConverter, LangiumParserErrorMessageProvider, ValidationRegistry, createLangiumParser, getDiagnosticRange, toDiagnosticSeverity } from "langium";
import { EligiusValidator, createChecks } from "./eligius-validator.js";
import { preprocessAstNodeObject } from "./preprocess.js";
import type { Diagnostic } from "vscode-languageserver";
//@ts-ignore
import type { IRecognitionException } from "chevrotain"; //Need to reference this in order to infer the result for the parseAndValidate method
import { EligiusGrammar } from "./generated/grammar.js";
import { EligiusAstReflection, Presentation } from "./generated/ast.js";
import { LangiumServices } from "langium/lsp";
import {AstUtils } from "langium";

class EmptyLinker implements Linker {
    link(_document: LangiumDocument, _cancelToken?: any): Promise<void> {
        return Promise.resolve();
    }

    unlink(_document: LangiumDocument): void {
    }

    getCandidate(_refInfo: ReferenceInfo): AstNodeDescription | LinkingError {
        return {} as LinkingError;
    }

    buildReference(_node: AstNode, _property: string, _refNode: CstNode | undefined, _refText: string): Reference {
        return {} as Reference;
    }
}

const grammar = EligiusGrammar();
const tokenBuilder = new DefaultTokenBuilder();
const lexer = new DefaultLexer({
    Grammar: grammar,
    parser: {
        TokenBuilder: tokenBuilder,
    },
    LanguageMetaData: {
        caseInsensitive: false
    }
} as unknown as LangiumServices);

const services = {
    Grammar: grammar,
    parser: {
        TokenBuilder: tokenBuilder,
        Lexer: lexer,
        ParserErrorMessageProvider: new LangiumParserErrorMessageProvider(),
        ValueConverter: new DefaultValueConverter(),
    },
    references: {
        Linker: new EmptyLinker()
    },
    shared: {
        AstReflection: new EligiusAstReflection()
    }
} as unknown as LangiumServices

const parserInstance = createLangiumParser(services);

const validationRegistry = new ValidationRegistry(services);
const validator = new EligiusValidator();
const checks = createChecks(validator);

validationRegistry.register(checks)

export async function parseAndValidate(cnlWfcContent: string) {
    const parseResult = parserInstance.parse<Presentation>(cnlWfcContent);
    const ast = preprocessAstNodeObject(parseResult.value);

    const diagnostics = await validateAst(parseResult.value, {}, cnlWfcContent);

    return { ast, ...parseResult, diagnostics } as const;
}

async function validateAst(rootNode: AstNode, options: ValidationOptions, source: string, cancelToken = {}): Promise<Diagnostic[]> {
    const validationItems: Diagnostic[] = [];
    const acceptor: ValidationAcceptor = <N extends AstNode>(severity: 'error' | 'warning' | 'info' | 'hint', message: string, info: DiagnosticInfo<N>) => {
        validationItems.push(toDiagnostic(severity, message, info, source));
    };

    await Promise.all(AstUtils.streamAst(rootNode).map(async node => {
        const checks = validationRegistry.getChecks(node.$type, options.categories);
        for (const check of checks) {
            await check(node, acceptor, cancelToken as any);
        }
    }));
    return validationItems;
}

function toDiagnostic<N extends AstNode>(severity: 'error' | 'warning' | 'info' | 'hint', message: string, info: DiagnosticInfo<N, string>, source: string) {
    return {
        message,
        range: getDiagnosticRange(info),
        severity: toDiagnosticSeverity(severity),
        code: info.code,
        codeDescription: info.codeDescription,
        tags: info.tags,
        relatedInformation: info.relatedInformation,
        data: info.data,
        source: source
    } as const;
}