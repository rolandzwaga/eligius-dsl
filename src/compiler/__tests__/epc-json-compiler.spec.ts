import {beforeEach, describe, it} from "vitest";
import { TestContext } from "vitest/index.cjs";
import { Presentation } from "../../language/generated/ast.js";
import { parseAndValidate } from "../../language/parse-and-validate.js";
import { EpcJsonCompiler } from "../epc-json-compiler.js";
import {expect} from "chai";

type AstTestContext = {ast:Presentation, compiler: EpcJsonCompiler} & TestContext

describe('EPC to Json Compiler', () => {

    beforeEach<AstTestContext>(async (context) => {
        const {ast} = await parseAndValidate(config);
        context.ast = ast;
        context.compiler = new EpcJsonCompiler();
    });

    it<AstTestContext>('should produce some json', (context) => {
        const config = context.compiler.compile(context.ast);
        expect(config).to.not.be.undefined;
		console.log('config', config);
    });
});

const config = `animation provider: RequestAnimationFrameTimelineProvider
container: #ct-container
language: en-US
layout: layoutTemplate
languages: en-US English, nl-NL Nederlands
initialisation:
	MainTitleLabel:
		start:
			selectElement(selector=#main-title)
			getControllerInstance(LabelController)
			addControllerToElement()
		end:
			selectElement(#main-title)
			removeControllerFromElement(LabelController)
			forEach items
				selectElement(selector=current)
			endEach
timelines:`;