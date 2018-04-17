import debug from 'debug';
import {FunctionDeclarationStructure} from 'ts-simple-ast';

const log = debug('j2t:core:toBeanClass');

export function toProxyFunc({
                              typeName,
                              typePath,
                              version,
                              group,
                            }: {
  typeName: string;
  typePath: string;
  version: string;
  group?: string;
}): FunctionDeclarationStructure {
  let parameters = [{name: 'dubbo', isReadOnly: true, type: 'Dubbo'}];

  log('调用转换方法 toProxyFunc::');
  return {
    name: `${typeName}`,
    isExported: true,
    returnType: `${'I' + typeName}`,
    parameters,
    bodyText: `return dubbo.proxyService<${'I' + typeName}>({
        dubboInterface: '${typePath}',
        version: '${version}',
        ${group ? "group:'" + group + "'," : ''}
        methods: ${typeName}Wrapper,
      }); `,
  };
}
