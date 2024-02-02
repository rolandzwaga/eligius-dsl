import { ConfigurationFactory, EndableActionCreator, metadata } from "eligius";
import type {IOperationMetadata} from "eligius/metadata";
import type { ActionCreator, IActionConfiguration, IEndableActionConfiguration, TLanguageCode, TOperationData, TimelineActionCreator, TimelineTypes } from "eligius";
import { Action, ActionOperation, ActionTemplate, AnimationProvider, Condition, EventAction, ForEach, NamedArgument, Operation, OperationKinds, Otherwise, Presentation, TimeLine, TimeLineAction, When, isActionOperation, isForEach, isOperation, isWhen, reflection } from "../language/generated/ast.js";

const PresentationVisitor = (node: Presentation, factory: ConfigurationFactory) => {
  factory.init(node.language.ref!.code as TLanguageCode).setLayoutTemplate(node.layout).setContainerSelector(node.container);

  if (node.engine) {
    factory.setEngine(node.engine);
  }

  node.languages.forEach(lang => factory.addLanguage(lang.code as TLanguageCode, lang.label));

  node.providers.forEach(nd => visitors[`${nd.$type}Visitor`](nd, factory));

  node.initActions.forEach(nd => visitors[`${nd.$type}Visitor`](nd, factory.createInitAction.bind(factory)));
  node.actions.forEach(nd => visitors[`${nd.$type}Visitor`](nd, factory.createAction.bind(factory)));
  node.eventActions.forEach(nd => visitors[`${nd.$type}Visitor`](nd, factory.createEventAction.bind(factory)));

  node.timelines.forEach(nd => visitors[`${nd.$type}Visitor`](nd, factory));
};

const TimeLineVisitor = (node: TimeLine, factory: ConfigurationFactory) => {
  factory.addTimeline(node.uri, node.type as TimelineTypes, node.duration, node.loop, node.selector);
  node.actions.forEach(nd => visitors[`${nd.$type}Visitor`](nd, factory.createTimelineAction.bind(factory)));
}

const AnimationProviderVisitor = (node: AnimationProvider, factory: ConfigurationFactory) => {
  factory.editTimelineProviderSettings().addProvider('animation').setSystemName(node.systemName);
};

type AddTimeLineOperationFactory = (uri: string, name: string) => TimelineActionCreator;

const operationSwitcher = (addOperation: AddSimpleOperationFactory) => (nd: OperationKinds) => {
  if (isOperation(nd)) {
    visitors[`${nd.$type}Visitor`](nd, addOperation);
  } else if (isForEach(nd)) {
    visitors[`${nd.$type}Visitor`](nd, addOperation);
  } else if (isWhen(nd)) {
    visitors[`${nd.$type}Visitor`](nd, addOperation);
  } else if (isActionOperation(nd)) {
    visitors[`${nd.$type}Visitor`](nd, addOperation);
  }
};

const TimeLineActionVisitor = (node: TimeLineAction, factory: AddTimeLineOperationFactory) => {
  const creator = factory(node.uri.ref!.uri, node.name).addDuration(node.start, node.end);
  const { addStartOperation, addEndOperation } = creator;

  node.startOperations.forEach(operationSwitcher(addStartOperation.bind(creator)));
  node.endOperations.forEach(operationSwitcher(addEndOperation.bind(creator)));
}

const EventActionVisitor =  (node: EventAction, factory: (name: string) => ActionCreator<IActionConfiguration>) => {
  const creator = factory(node.name);
  const { addStartOperation } = creator;
  node.startOperations.forEach(operationSwitcher(addStartOperation.bind(creator)));
}

const ActionTemplateVisitor = (node: ActionTemplate, factory: (name: string) => EndableActionCreator<IEndableActionConfiguration>) => {
  const creator = factory(node.name);
  const { addStartOperation, addEndOperation } = creator;
  node.startOperations.forEach(operationSwitcher(addStartOperation.bind(creator)));
  node.endOperations.forEach(operationSwitcher(addEndOperation.bind(creator)));
}

const ActionVisitor = (node: Action, factory: (name: string) => EndableActionCreator<IEndableActionConfiguration>) => {
  const creator = factory(node.name);
  const { addStartOperation, addEndOperation } = creator;
  node.startOperations.forEach(operationSwitcher(addStartOperation.bind(creator)));
  node.endOperations.forEach(operationSwitcher(addEndOperation.bind(creator)));
}

type AddSimpleOperationFactory = ActionCreator<IActionConfiguration>['addStartOperation'];

const OperationVisitor = (node: Operation, factory: AddSimpleOperationFactory) => {
  const operationMetadata = (metadata as any)[node.systemName] as () => IOperationMetadata<unknown>;
  let operationData: TOperationData = {};
  if (node.arguments.length) {
      operationData = node.arguments.reduce((aggr, arg) => {
        Object.assign(aggr, visitors[`${arg.$type}Visitor`](arg, operationMetadata()));
        return aggr;
      }, {});
  }
  factory(node.systemName, operationData);
};

const ActionOperationVisitor = (node: ActionOperation, factory: AddSimpleOperationFactory) => {
  //const actionTemplate = node.systemName.ref!;

}

const NamedArgumentVisitor = (node: NamedArgument, _metadata: IOperationMetadata<unknown>) => {
  return {[node.name]: node.value};
}

const ForEachVisitor = (node: ForEach, factory: AddSimpleOperationFactory) => {
  factory('forEach', {collection: node.collection});
  node.operations.forEach(operationSwitcher(factory));
  factory('endForEach', {});
};

const ConditionVisitor = (node: Condition) => {
  return false;
};

const WhenVisitor = (node: When, factory: AddSimpleOperationFactory) => {
  factory('when', {});
  node.operations.forEach(operationSwitcher(factory));
  if (node.otherwise) {
    OtherwiseVisitor(node.otherwise, factory);
  }
  factory('endWhen', {});
};

const OtherwiseVisitor = (node: Otherwise, factory: AddSimpleOperationFactory) => {
  factory('otherwise', {});
  node.operations.forEach(operationSwitcher(factory));
};

const visitors = {
  PresentationVisitor,
  AnimationProviderVisitor,
  ActionVisitor,
  OperationVisitor,
  ForEachVisitor,
  NamedArgumentVisitor,
  ConditionVisitor,
  WhenVisitor,
  OtherwiseVisitor,
  ActionTemplateVisitor,
  EventActionVisitor,
  TimeLineVisitor,
  TimeLineActionVisitor,
  ActionOperationVisitor
};

export class EpcJsonCompiler {

  constructor() {
    warnOnInconsistentASTTypes();
  }

  compile(ast: Presentation) {
    const factory = new ConfigurationFactory();
    visitors[`${ast.$type}Visitor`](ast, factory);
    return factory.getConfiguration();
  }
}

const warnOnInconsistentASTTypes = () => {
  //Initial Check to see if we are still covering all the types
  const astTypes = new Set(reflection.getAllTypes());
  const visitorTypes = new Set(Object.keys(visitors));
  if (astTypes.size !== visitorTypes.size) {
    console.warn("ast types and visitors count are not he same");
  }
  /*new Set([...astTypes, ...visitorTypes]).forEach((typeName) => {
    if (!astTypes.has(typeName)) {
      console.warn(`Our code defines a visitor for type "${typeName}" but it is not in the AST`);
    }
    if (!visitorTypes.has(typeName)) {
      console.warn(`The AST defines a type "${typeName}" but it is not handled in our visitors`);
    }
  })*/
}