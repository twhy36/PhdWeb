import { Observable } from 'rxjs';

/**
 * Checks the instance it the prototype chain for an existing PropertyDescriptor
 * @param instance Instance to look at
 * @param property Property to check for
 */
export function getDescriptor(instance: object, property: string): PropertyDescriptor {
    let descriptor: PropertyDescriptor;
    let prototype = instance;
    while (!descriptor && prototype) {
        descriptor = Object.getOwnPropertyDescriptor(prototype, property);
        prototype = Object.getPrototypeOf(prototype);
    }
    return descriptor;
}

/**
 * Flattens any nested array to a single level
 * @param arr array to flatten
 */
export function flatten<T>(arr): Array<T> {
    return arr.reduce((pv, cv) => {
        return pv.concat(Array.isArray(cv) ? flatten(cv) : cv);
    }, []);
}

export function loadScript(src: string): Observable<void> {
    return new Observable<void>(sub => {
        let script: any = document.createElement('script');
        let loaded = false;
        script.setAttribute('src', src);

        script.onreadystatechange = script.onload = function () {
            if (!loaded) {
                sub.next();
                sub.complete();
            }
            loaded = true;
        }
        document.getElementsByTagName('head')[0].appendChild(script);
    });
}

export function unloadScript(src: string, ...windowVars: string[]): void {
    let scripts = document.querySelectorAll(`script[src*='${src}']`)
    if (scripts){
        for (let i = 0; i < scripts.length; i++){
            scripts.item(i).remove();
        }
	}
    windowVars.forEach(variable => {
        window[variable] = undefined;
    });
}

export function formatPhoneNumber(str) {
    //Filter numbers
    let numbers = ('' + str).replace(/\D/g, '');

    //Check if input matches the length
    let match = numbers.match(/^(\d{3})(\d{3})(\d{4})$/);

    if (match) {
        return '(' + match[1] + ') ' + match[2] + '-' + match[3]
    };
    return null;
}


export function areSame(a, b) {
    if (Array.isArray(a)) {
        if (Array.isArray(b)) {
            return a.every((a1, i) => areSame(a1, b[i])) && b.every((b1, i) => areSame(b1, a[i]));
        } else return false;
    }
    if (typeof a !== typeof b) {
        return false;
    }
    if (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean' || typeof a === 'undefined')
        return a === b;
    if (a instanceof Date)
        return b instanceof Date && a.getTime() === b.getTime();
    if (a === null)
        return a === b;
    return areSame(Object.keys(a).sort(), Object.keys(b).sort()) && Object.keys(a).every(k => areSame(a[k], b[k]));
}
