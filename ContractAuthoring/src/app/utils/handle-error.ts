import { _throw } from "rxjs/observable/throw";
import { ErrorObservable } from "rxjs/observable/ErrorObservable";

export function handleError(error: Response): ErrorObservable {
    // In the future, we may send the server to some remote logging infrastructure //
    console.error(error);

    return _throw(error || 'Server error');
}
