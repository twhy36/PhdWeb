interface Array<T> {
    // Gets the last item in an Array
    last(): T;
    // Adds all the numbers together
    sum(): number;
    // Adds all the numbers together by using the specified selector
    sum(selector: (item: T) => number): number;
    // Takes the specified number of items starting at the beginning of the array
    take(count: number): Array<T>;
}

Object.defineProperty(Array.prototype, 'last', {
    // We do the attachment to the array prototype this way so that the 'last' method isn't enumerated
    enumerable: false,
    value: function (this: Array<any>) {
        return this[this.length - 1];
    }
});


Object.defineProperty(Array.prototype, 'sum', {
    // We do the attachment to the array prototype this way so that the 'sum' method isn't enumerated
    enumerable: false,
    value: function (this: Array<any>, selector?: (item: any) => number) {
        return this.reduce((pv, cv) => {
            return pv + (selector != null ? selector(cv) : cv);
    }, 0);
    }
});

Object.defineProperty(Array.prototype, 'take', {
    // We do the attachment to the array prototype this way so that the 'take' method isn't enumerated
    enumerable: false,
    value: function (this: Array<any>, count: number) {
        if (!count) {
            throw new Error('count is required');
        }
        if (count < 0) {
            throw new Error('count must be larger then zero');
        }
        if (count > this.length) {
            throw new Error('count must be less then or equal to the array length');
        }
    return this.slice(0, count);
    }
});
