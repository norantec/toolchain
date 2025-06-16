import * as ts from 'typescript';
import { Project, CompilerOptions } from 'ts-morph';

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
    const project = new Project({
        compilerOptions: program.getCompilerOptions() as CompilerOptions,
    });

    return () => {
        return (sourceFile) => {
            const filePath = sourceFile.fileName;
            const patchSourceFile = project.addSourceFileAtPathIfExists(filePath);
            if (!patchSourceFile) return sourceFile;

            const statements: ts.Statement[] = [];

            for (const cls of patchSourceFile.getClasses()) {
                const className = cls.getName();
                if (!className) continue;

                for (const prop of cls.getProperties()) {
                    const name = prop.getName();
                    const type = prop.getType();

                    const callSignature = type.getCallSignatures()[0];
                    if (!callSignature) continue;

                    const returnType = callSignature.getReturnType();

                    // unwrap Promise<...>
                    let actualReturn = returnType;
                    if (returnType.getSymbol()?.getName?.() === 'Promise') {
                        const args = returnType.getTypeArguments();
                        if (args.length > 0) {
                            actualReturn = args[0];
                        }
                    }

                    // 获取返回类型字符串（也可以改为结构体构建 AST）
                    const typeStr = actualReturn.getText();

                    const injectCall = ts.factory.createExpressionStatement(
                        ts.factory.createCallExpression(
                            ts.factory.createIdentifier('Reflect.defineMetadata'),
                            undefined,
                            [
                                ts.factory.createStringLiteral('custom:returntype'),
                                ts.factory.createStringLiteral(typeStr),
                                ts.factory.createPropertyAccessExpression(
                                    ts.factory.createIdentifier(className),
                                    ts.factory.createIdentifier('prototype'),
                                ),
                                ts.factory.createStringLiteral(name),
                            ],
                        ),
                    );

                    statements.push(injectCall);
                }
            }

            return ts.factory.updateSourceFile(sourceFile, [...sourceFile.statements, ...statements]);
        };
    };
}
