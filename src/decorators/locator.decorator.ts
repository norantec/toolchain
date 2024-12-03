type LocatorDecoratorFn = ((alias?: string) => (target: any, propertyKey: string) => void) & { metadataKey: symbol; };

export const Locator: LocatorDecoratorFn = (alias) => (target, propertyKey) => {
    let currentValue: Array<[string, string]> = Reflect.getMetadata(Locator.metadataKey, target);

    if (!Array.isArray(currentValue)) {
        currentValue = [];
    }

    currentValue.push([propertyKey, alias]);
    Reflect.defineMetadata(Locator.metadataKey, currentValue, target);
};

Locator.metadataKey = Symbol('');
