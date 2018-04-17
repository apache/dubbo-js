import {
  ClassDeclarationStructure,
  InterfaceDeclarationStructure,
  MethodDeclarationStructure,
  ParameterDeclarationStructure,
  PropertyDeclarationStructure,
  TypeParameterDeclarationStructure
} from "ts-simple-ast";
import debug from "debug";
import {toField} from "./to-field";
import {IntepretHandle} from "../../handle";
import {jType2Ts} from "../../util/type-parse";
import {IJClass} from "../../typings";
import {fields2CtrContent, getCtorParaStr} from "./util/transfer";

const log = debug('j2t:core:toBeanClass');


/**
 * java接口转换为ts接口ast
 * @param typeDef
 * @returns {InterfaceDeclarationStructure}
 */
export async function toBeanClass(
  typeDef: IJClass,
  intepretHandle: IntepretHandle,
): Promise<ClassDeclarationStructure> {
  log('调用转换方法 toBeanClass::');
  let typeName = intepretHandle.getTypeInfo(typeDef.name).className;
  let typeParameters: TypeParameterDeclarationStructure[] = [];

  if (typeDef.typeParams) {
    typeDef.typeParams.forEach(typeParamsItem => {
      typeParameters.push({name: typeParamsItem.name});
    });
  }
  //获取 方法定义; 或者获取属性定义
  let methods: Array<MethodDeclarationStructure> = [],
    properties: Array<PropertyDeclarationStructure> = [],
    ctorParams: ParameterDeclarationStructure[] = [];

  //1.1 找到实例中的相关参数及类型
  let fileds = [];
  for (var fieldName in typeDef.fields) {
    //有些字段类型为org.slf4j.Logger等信息;;;我们要转化的应该只是
    let filedType = typeDef.fields[fieldName].name;
    if (typeDef.fields[fieldName].isArray) {
      filedType = typeDef.fields[fieldName].elementType.name;
    }

    if (
      filedType.startsWith("com.qianmi") ||
      filedType.startsWith("java.lang") ||
      filedType.startsWith("java.util") ||
      filedType.startsWith("java.math")
    ) {
      let field = await toField(
        fieldName,
        typeDef.fields[fieldName],
        intepretHandle
      );
      properties.push(field);
      ctorParams.push({name: field.name, type: field.type});


      let filedItem = typeDef.fields[fieldName];
      fileds.push({
        name: fieldName,
        type: await jType2Ts(filedItem, intepretHandle),
        filedAst: filedItem
      });
    }

  }
  //添加构造函数入参interface
  //1.2 生成方法;;
  let {fieldTrans, initContent} = await fields2CtrContent(
    fileds,
    intepretHandle,
    typeDef,
  );

  let bodyText = `${initContent ? initContent + ';' : ''}
      return {
            $class: '${typeDef.name}', 
            $: {${fieldTrans.join(',')}}
      }`;

  try {
    intepretHandle.sourceFile.addInterface({
      typeParameters,
      isExported: true,
      name: 'I' + typeName,
      properties,
    });
  } catch (err) {
    console.error(`为${intepretHandle.classPath}添加Interface出错,${err}`);
  }

  methods.push({name: '__fields2java', bodyText});
  let ctorBody = ctorParams
    .map(({name}) => `this.${name}=params.${name};`)
    .join('\n');

  return {
    name: typeName,
    ctor: {
      parameters: [
        {
          name: `params:${getCtorParaStr(typeName, typeParameters)}`,
        },
      ],
      bodyText: ctorBody,
    },
    typeParameters,
    properties,
    isExported: true,
    methods,
  };
}