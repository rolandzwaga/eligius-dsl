grammar Eligius

entry Presentation:
    (providers+=(AnimationProvider)+)
    ('container:' container=SELECTOR)
    ('language:' language=LANG)
    ('layout:' layout=(NAME|PROPER_NAME))
    ('languages:' (languages+=Language (',' languages+=Language)*)?)
    ('engine:' engine=PROPER_NAME)?
    ('initialisation:' initActions+=(Action)*)?
    ('actions:' actions+=(ActionTemplate)*)?
    ('eventActions:' eventActions+=(EventAction)*)?
    'timelines:' timelines+=(TimeLine)*;

AnimationProvider:
    'animation' 'provider:' systemName=PROPER_NAME;

Language:
    code=LANG label=PROPER_NAME;

TimeLine:
    uri=NAME type=NAME DURATION duration=NUMBER loop?='loops' 'cssSelector' selector=SELECTOR actions+=(TimeLineAction)*;

TimeLineAction:
    name=NAME ':' uri=[TimeLine:NAME] start=NUMBER end=NUMBER? ActionImpl;

ActionTemplate:
    name=PROPER_NAME ':' ActionImpl;

Action:
    name=PROPER_NAME ':' ActionImpl;

fragment ActionImpl:
     'start:' startOperations+=OperationKinds* 'end:' endOperations+=OperationKinds*;

EventAction:
    name=PROPER_NAME ':' 'name' eventName=NAME 'topic'? eventTopic=NAME? startOperations+=OperationKinds*;

OperationKinds:
    ActionOperation|Operation|ForEach|When;

Operation:
    systemName=OPERATION_NAME '(' (arguments+=NamedArgument (',' arguments+=NamedArgument)*)* ')';

ActionOperation:
    systemName=[ActionTemplate:PROPER_NAME] '(' (arguments+=NamedArgument (',' arguments+=NamedArgument)*)* ')';

NamedArgument:
    name=NAME EQUALS value=(STRING|NUMBER|NAME|SELECTOR|BOOL_TRUE|BOOL_FALSE|PROPER_NAME);

ForEach:
    'forEach' collection=NAME operations+=OperationKinds* 'endEach';

When:
    'when' condition=Condition operations+=OperationKinds* otherwise=Otherwise? 'endWhen';

Otherwise:
    'otherwise' operations+=OperationKinds*;

Condition:
    expressions+=BinaryExpression (AND|OR expressions+=BinaryExpression)*;

BinaryExpression:
    left=(NUMBER|SELECTOR|NAME|STRING) operator=(NOT_EQUALS|DOUBLE_EQUALS|GT|LT|GTE|LTE) right=(NUMBER|SELECTOR|NAME|STRING);

hidden terminal WS: /\s+/;
terminal NOT_EQUALS: '!=';
terminal DOUBLE_EQUALS: '==';
terminal EQUALS: '=';
terminal GTE: '>=';
terminal LTE: '<=';
terminal GT: '>';
terminal LT: '<';
terminal LANG: /[a-z]{2}-[A-Z]{2}/;
terminal OPERATION_NAME: /[a-z][a-zA-Z]+/;
terminal BOOL_TRUE returns boolean: /true\b/;
terminal BOOL_FALSE returns boolean: /false\b/;
terminal PROPER_NAME: /[A-Z][a-zA-Z0-9_]+/;
terminal STRING: /\"[^\"]+\"/;
terminal NAME: /[a-zA-Z0-9\-_]+/;
terminal NUMBER returns number: /[0-9]+/;
terminal SELECTOR: /\.|\#[\[\]\-a-zA-Z0-9\=]+/;
terminal DURATION: /duration\b/;
terminal AND: /(and|AND)\b/;
terminal OR: /(or|OR)\b/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
