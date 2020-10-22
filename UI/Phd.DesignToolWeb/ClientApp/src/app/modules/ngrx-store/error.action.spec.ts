import { tryCatch, ErrorAction } from './error.action';
import { of, from, throwError } from 'rxjs';
import { map, switchMap, toArray } from 'rxjs/operators';

class TestErrorAction extends ErrorAction {
	readonly type = "Test Error";
}

describe('tryCatch', function () {
	it('catches exception', async (done) => {
		of(null).pipe(
			tryCatch(() => throwError(new Error("test")), TestErrorAction)
		).subscribe(res => {
			expect(res instanceof TestErrorAction).toBeTruthy();
			done();
		});
	});

	it('catches exception and continues', async (done) => {
		from([1, 2]).pipe(
			tryCatch(source => source.pipe(
				map(i => {
					if (i === 1)
						throw new Error("test");
					return i;
				})
			), TestErrorAction)
		).subscribe(res => {
			if (res instanceof TestErrorAction)
				expect(res.error.message).toBe("test");
			else {
				expect(res).toBe(2);
				done();
			}
		})
	});

	it('emits all inner observable values', async (done) => {
		of(null).pipe(
			tryCatch(source => source.pipe(
				switchMap(() => from([1,2,3]))
			), TestErrorAction),
			toArray()
		).subscribe(res => {
			expect(res.length).toBe(3);
			done();
		})
	})
})
