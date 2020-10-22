/**
 * Binds the method to the proper instance of 'this'
 * @param target
 * @param propertyKey
 * @param descriptor
 */
export function bind<T extends Function>(target, propertyKey: string, descriptor: TypedPropertyDescriptor<T>) {

    return {
        configurable: true,
        get(this: T) {
            const bound: T = descriptor.value!.bind(this);
            Object.defineProperty(this, propertyKey, {
                value: bound,
                configurable: true,
                writable: true
            });
            return bound;
        }
    };
}
