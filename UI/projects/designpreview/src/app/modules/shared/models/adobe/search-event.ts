
export class SearchEvent 
{
	event: string = 'Search';
	search: Search = new Search;

	constructor(term: string, results: number) 
	{
		this.search.term = term;
		this.search.results = results.toString();
	}
}

export class Search 
{
	term: string;
	results: string;
}