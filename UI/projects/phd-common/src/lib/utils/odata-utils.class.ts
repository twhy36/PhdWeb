import { newGuid } from './guid.class';

export function getNewGuid(): string {
	return newGuid();
}

export function createBatchHeaders(batchGuid: string, token?: string, scheme: string = 'Bearer '): any {
	let headers: any = {
		'Content-Type': `multipart/mixed; boundary=batch_${batchGuid}`,
		'OData-Version': '4.0;NetFx',
		'OData-MaxVersion': '4.0;NetFx',
		'Accept': 'application/json'
	};

	if (!!token) {
		headers = {
			'Authorization': scheme + token,
			...headers
		};
	}

	return headers;
}

export function createBatchBody(batchGuid: string, requests: Array<string[]>, headers?: {}): string {
	let data: string[] = [];


	// If GET method, needs the header information in the body, so pass the headers in as the optional 3rd param
	if (headers) {
		for (let h in headers) {
			data.push(`${h}: ${headers[h]}`);
		}
		data.push('');
	}

	requests.forEach(b => {
		if (b.length > 0) {
			data.push(`--batch_${batchGuid}`);
			data.push(...b);
		}
	});
	data.push(`--batch_${batchGuid}--`);
	data.push('');

	var body = data.join("\r\n");

	return body;
}

export function createBatch<T>(items: Array<T>, nameOfIdProperty: string, endpoint: string, token?: string, deleted?: boolean): string[] {
	let batchRequests: string[] = [];

	if (items.length > 0) {
		const changeSetGuid = newGuid();

		batchRequests.push(`Content-Type: multipart/mixed; boundary=changeset_${changeSetGuid}`);

		let contentId = 0;

		items.forEach(g => {
			batchRequests.push('');
			batchRequests.push(`--changeset_${changeSetGuid}`);
			batchRequests.push('Content-Type: application/http');
			batchRequests.push('Content-Transfer-Encoding: binary');
			batchRequests.push(`Content-ID: ${contentId++}`);
			batchRequests.push('');

			if (deleted) {
				batchRequests.push(`DELETE ${endpoint}(${g[nameOfIdProperty]}) HTTP/1.1`);
				batchRequests.push('OData-Version: 4.0;NetFx');
				batchRequests.push('OData-MaxVersion: 4.0;NetFx');
				batchRequests.push('Content-Type: application/json;odata.metadata=minimal');
				batchRequests.push('Prefer: return=representation');
				batchRequests.push('Accept: application/json;odata.metadata=minimal');
				batchRequests.push('Accept-Charset: UTF-8');

				if (token) {
					batchRequests.push(`Authorization: Bearer ${token}`);
				}
				batchRequests.push('');
				batchRequests.push('{}');
			}
			else {

				if (g[nameOfIdProperty] === 0) {
					batchRequests.push(`POST ${endpoint} HTTP/1.1`);
					batchRequests.push('OData-Version: 4.0;NetFx');
					batchRequests.push('OData-MaxVersion: 4.0;NetFx');
					batchRequests.push('Content-Type: application/json;odata.metadata=minimal');
					batchRequests.push('Prefer: return=representation');
					batchRequests.push('Accept: application/json;odata.metadata=minimal');
					batchRequests.push('Accept-Charset: UTF-8');

					if (token) {
						batchRequests.push(`Authorization: Bearer ${token}`);
					}

					batchRequests.push('');
					batchRequests.push('{');

					let keycount = 0;
					for (let key in g) {
						keycount++;
						batchRequests.push(`${keycount > 1 ? "," : ""}${getKeyValueString(key, g)}`);
					}
					batchRequests.push('}');
				}
				else {
					batchRequests.push(`PATCH ${endpoint}(${g[nameOfIdProperty]}) HTTP/1.1`);
					batchRequests.push('OData-Version: 4.0;NetFx');
					batchRequests.push('OData-MaxVersion: 4.0;NetFx');
					batchRequests.push('Content-Type: application/json;odata.metadata=minimal');
					batchRequests.push('Prefer: return=representation');
					batchRequests.push('Accept: application/json;odata.metadata=minimal');
					batchRequests.push('Accept-Charset: UTF-8');

					if (token) {
						batchRequests.push(`Authorization: Bearer ${token}`);
					}

					batchRequests.push('');
					batchRequests.push('{');

					let keycount = 0;

					for (let key in g) {
						keycount++;
						batchRequests.push(`${keycount > 1 ? "," : ""}${getKeyValueString(key, g)}`);
					}

					batchRequests.push('}');
				}
			}

		});

		batchRequests.push(`--changeset_${changeSetGuid}--`);
	}

	return batchRequests;
}

export function createBatchGet<T>(endpoint: string): string[] {
	let batchRequests: string[] = [];

	batchRequests.push('Content-Type: application/http');
	batchRequests.push('Content-Transfer-Encoding: binary');

	batchRequests.push('');
	batchRequests.push(`GET ${endpoint} HTTP/1.1`);
	batchRequests.push('OData-Version: 4.0;NetFx');
	batchRequests.push('OData-MaxVersion: 4.0;NetFx');
	batchRequests.push('Accept: application/json;odata.metadata=minimal');
	batchRequests.push('');

	return batchRequests;
}

export function createBatchPatch<T>(items: Array<T>, nameOfIdProperty: string, endpoint: string, ...nameOfPatchProperties: string[]): string[] {
	return createBatchPatchWithAuth(null, items, nameOfIdProperty, endpoint, ...nameOfPatchProperties);
}

export function createBatchPatchWithAuth<T>(token: string, items: Array<T>, nameOfIdProperty: string, endpoint: string, ...nameOfPatchProperties: string[]): string[] {
	let batchRequests: string[] = [];

	if (items.length > 0) {
		const changeSetGuid = newGuid();

		batchRequests.push(`Content-Type: multipart/mixed; boundary=changeset_${changeSetGuid}`);

		let contentId = 0;

		items.forEach(g => {
			batchRequests.push('');
			batchRequests.push(`--changeset_${changeSetGuid}`);
			batchRequests.push('Content-Type: application/http');
			batchRequests.push('Content-Transfer-Encoding: binary');
			batchRequests.push(`Content-ID: ${contentId++}`);
			batchRequests.push('');

			batchRequests.push(`PATCH ${endpoint}(${g[nameOfIdProperty]}) HTTP/1.1`);
			batchRequests.push('OData-Version: 4.0;NetFx');
			batchRequests.push('OData-MaxVersion: 4.0;NetFx');
			batchRequests.push('Content-Type: application/json;odata.metadata=minimal');
			batchRequests.push('Prefer: return=representation');
			batchRequests.push('Accept: application/json;odata.metadata=minimal');
			batchRequests.push('Accept-Charset: UTF-8');

			if (token) {
				batchRequests.push(`Authorization: Bearer ${token}`);
			}

			batchRequests.push('');
			batchRequests.push('{');

			let keycount = 0;

			for (let key in g) {
				if (nameOfPatchProperties.some(p => p === key)) {
					keycount++;
					batchRequests.push(`${keycount > 1 ? "," : ""}${getKeyValueString(key, g)}`);
				}
			}

			batchRequests.push('}');
		});

		batchRequests.push(`--changeset_${changeSetGuid}--`);
	}

	return batchRequests;
}

export function parseBatchResults<T>(results: string): Array<T> {
	let parts = (results as string).split('\r\n');

	const entityArray: Array<T> = [];

	let entityFound = false;
	let entityStartIndex = 0;
	let entityEndIndex = 0;

	for (let i = 1; i < parts.length - 1; i++) {
		// catch 4xx and 5xx errors
		if (parts[i].startsWith("HTTP/1.1 4") || parts[i].startsWith("HTTP/1.1 5")) {
			throw new Error("Error: " + parts[i].substring("HTTP/1.1 ".length));
		}

		if (parts[i] === "{") {
			entityFound = true;
			entityStartIndex = i - 1;
		}
		else {
			if (entityFound === true && parts[i] === "}") {
				entityEndIndex = i;
				const batchEntityArray = [];

				for (let x = entityStartIndex; x <= entityEndIndex; x++) {
					batchEntityArray.push(parts[x]);
				}

				const entityJson = batchEntityArray.join("");
				const entity = JSON.parse(entityJson);

				entityArray.push(entity);

				entityFound = false;
			}
		}
	}

	return entityArray;
}

function getKeyValueString<T>(key: string, obj: T): string {
	const propertyType = typeof obj[key];
	let kvpString = "";

	switch (propertyType) {
		case "string":
			kvpString = `"${key}":"${obj[key]}"`;
			break;
		case "number":
			kvpString = `"${key}":${obj[key]}`;
			break;
		case "boolean":
			kvpString = `"${key}":${obj[key] ? "true" : "false"}`;
			break;
		default:
			kvpString = `"${key}":"${obj[key]}"`;
	}

	return kvpString;
}
