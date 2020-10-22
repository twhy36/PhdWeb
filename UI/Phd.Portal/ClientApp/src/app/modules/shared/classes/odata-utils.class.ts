import { newGuid } from './guid.class';

export class BatchResponse<T> {
	responses: { id: string, atomicityGroup: string, status: number, headers: { [key: string]: string }, body: T }[];
}

export function getNewGuid(): string
{
	return newGuid();
}

export function createBatchHeaders(batchGuid: string): any
{
	const headers = {
		'Content-Type': `multipart/mixed; boundary=batch_${batchGuid}`,
		'OData-Version': '4.0;NetFx',
		'OData-MaxVersion': '4.0;NetFx',
		'Accept': 'application/json'
	};

	return headers;
}

export function createBatchBody(batchGuid: string, requests: Array<string[]>, headers?: {}): string
{
  let data: string[] = [];

  // If GET method, needs the header information in the body, so pass the headers in as the optional 3rd param
  if (headers)
  {
    for (let h in headers)
    {
      data.push(`${h}: ${headers[h]}`);
    }
    data.push('');
  }

	requests.forEach(b =>
	{
		if (b.length > 0)
		{
			data.push(`--batch_${batchGuid}`);
			data.push(...b);
		}
	});
	data.push(`--batch_${batchGuid}--`);
	data.push('');

	var body = data.join("\r\n");

	return body;
}

export function createBatch<T>(items: Array<T>, nameOfIdProperty: string, endpoint: string, token?: string): string[]
{
	let batchRequests: string[] = [];

	if (items.length > 0)
	{
		const changeSetGuid = newGuid();

		batchRequests.push(`Content-Type: multipart/mixed; boundary=changeset_${changeSetGuid}`);

		let contentId = 0;

		items.forEach(g =>
		{
			batchRequests.push('');
			batchRequests.push(`--changeset_${changeSetGuid}`);
			batchRequests.push('Content-Type: application/http');
			batchRequests.push('Content-Transfer-Encoding: binary');
			batchRequests.push(`Content-ID: ${contentId++}`);
			batchRequests.push('');

			if (g[nameOfIdProperty] === 0)
			{
				batchRequests.push(`POST ${endpoint} HTTP/1.1`);
				batchRequests.push('OData-Version: 4.0;NetFx');
				batchRequests.push('OData-MaxVersion: 4.0;NetFx');
				batchRequests.push('Content-Type: application/json;odata.metadata=minimal');
				batchRequests.push('Prefer: return=representation');
				batchRequests.push('Accept: application/json;odata.metadata=minimal');
				batchRequests.push('Accept-Charset: UTF-8');

				if (token)
				{
					batchRequests.push(`Authorization: Bearer ${token}`);
				}

				batchRequests.push('');
				batchRequests.push('{');

				let keycount = 0;
				for (let key in g)
				{
					keycount++;
					batchRequests.push(`${keycount > 1 ? "," : ""}${getKeyValueString(key, g)}`);
				}
				batchRequests.push('}');
			}
			else
			{
				batchRequests.push(`PATCH ${endpoint}(${g[nameOfIdProperty]}) HTTP/1.1`);
				batchRequests.push('OData-Version: 4.0;NetFx');
				batchRequests.push('OData-MaxVersion: 4.0;NetFx');
				batchRequests.push('Content-Type: application/json;odata.metadata=minimal');
				batchRequests.push('Prefer: return=representation');
				batchRequests.push('Accept: application/json;odata.metadata=minimal');
				batchRequests.push('Accept-Charset: UTF-8');

				if (token)
				{
					batchRequests.push(`Authorization: Bearer ${token}`);
				}

				batchRequests.push('');
				batchRequests.push('{');

				let keycount = 0;

				for (let key in g)
				{
					keycount++;
					batchRequests.push(`${keycount > 1 ? "," : ""}${getKeyValueString(key, g)}`);
				}

				batchRequests.push('}');
			}
		});

		batchRequests.push(`--changeset_${changeSetGuid}--`);
	}

	return batchRequests;
}

export function createBatchGet<T>(endpoint: string): string[]
{
  let batchRequests: string[] = [];
  batchRequests.push('Content-Type: application/http ');
  batchRequests.push('Content-Transfer-Encoding:binary');
	batchRequests.push('');
  batchRequests.push(`GET ${endpoint} HTTP/1.1`);
	batchRequests.push('');

	return batchRequests;
}

export function createBatchPatch<T>(items: Array<T>, nameOfIdProperty: string, endpoint: string, ...nameOfPatchProperties: string[]): string[]
{
	return createBatchPatchWithAuth(items, nameOfIdProperty, endpoint, ...nameOfPatchProperties);
}

export function createBatchPatchWithAuth<T>(items: Array<T>, nameOfIdProperty: string, endpoint: string, ...nameOfPatchProperties: string[]): string[]
{
	let batchRequests: string[] = [];

	if (items.length > 0)
	{
		const changeSetGuid = newGuid();

		batchRequests.push(`Content-Type: multipart/mixed; boundary=changeset_${changeSetGuid}`);

		let contentId = 0;

		items.forEach(g =>
		{
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

			batchRequests.push('');
			batchRequests.push('{');

			let keycount = 0;

			for (let key in g)
			{
				keycount++;
				batchRequests.push(`${keycount > 1 ? "," : ""}${getKeyValueString(key, g)}`);
			}

			batchRequests.push('}');
		});

		batchRequests.push(`--changeset_${changeSetGuid}--`);
	}

	return batchRequests;
}

export function parseBatchResults<T>(results: any): Array<T>
{
  let parsedResults: BatchResponse<T> = typeof results === 'string' ? JSON.parse(results) : results;
  var errors = parsedResults.responses.filter(r => r.status >= 400);
	if (errors.length) {
		throw new Error("Error: " + errors.map(e => e.body).join('; '));
	}
	return parsedResults.responses.map(r => r.body);
}

function getKeyValueString<T>(key: string, obj: T): string
{
	const propertyType = typeof obj[key];
	let kvpString = "";

	switch (propertyType)
	{
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
