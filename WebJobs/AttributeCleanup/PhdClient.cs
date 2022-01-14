using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Net;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Simple.OData.Client;

namespace AttributeCleanup
{
    public class PhdClient
    {
        private IConfiguration _configuration { get; }

        public PhdClient(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        private ODataClient CreatePhdClient()
        {
            //var phdClientSettings = new ODataClientSettings(new Uri(_configuration["phdSettings:url"]));
            var phdClientSettings = new ODataClientSettings(new Uri(_configuration["phdSettings:url"]),
                new NetworkCredential(_configuration["phdSettings:user"], _configuration["phdSettings:password"]));
            phdClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {_configuration["phdSettings:apiKey"]}");
            };
            phdClientSettings.OnApplyClientHandler = handler => handler.PreAuthenticate = false;

            var phdClient = new ODataClient(phdClientSettings);

            return phdClient;
        }

        private static List<int> GetAttributeIdsToSearch(List<int> edhUnusedIds, int index)
        {
            List<int> attributeIdsToSearch;
            if (edhUnusedIds.Count < 100)
            {
                // Less than 100 IDs, search for all at once
                attributeIdsToSearch = edhUnusedIds;
            }
            else
            {
                // Get the next batch of 100 to process
                if (index + 100 < edhUnusedIds.Count)
                {
                    attributeIdsToSearch = edhUnusedIds.GetRange(index, 100);
                }
                else
                {
                    // Less than 100 left to process, get remaining ones
                    attributeIdsToSearch = edhUnusedIds.GetRange(index, edhUnusedIds.Count - index);
                }
            }

            return attributeIdsToSearch;
        }


        /// <summary>
        /// Check the specified PHD collection to see if any of the IDs from EDH are present.
        /// </summary>
        /// <param name="collection">Collection in PHD to check for EDH IDs</param>
        /// <param name="collectionId">Name of EDH ID field in PHD collection</param>
        /// <param name="edhUnusedIds">List of EDH IDs to check PHD collection for</param>
        /// <returns>List of EDH IDs found present in the specified PHD collection</returns>
        public async Task<List<int>> GetIdsUsedInPhd(string collection, string collectionId, List<int> edhUnusedIds)
        {
            // Process up to 100 IDs at a time (to avoid URI query from being to long)
            List<int> phdUsedIds = new List<int>();
            for (int i = 0; i < edhUnusedIds.Count; i += 100)
            {
                var attributeIdsToSearch = GetAttributeIdsToSearch(edhUnusedIds, i);

                // Setup PHD Client
                string queryIds = String.Join(',', attributeIdsToSearch);
                string filter = $"{collection}/any(c: c/{collectionId} in ({queryIds}))";
                string expand = $"{collection}";
                string select = $"{collection}";

                var phdClient = CreatePhdClient();
                var phdResults = (await phdClient.For("scenarioChoice")
                    .Filter(filter)
                    .Expand(expand)
                    .Select(select)
                    .FindEntriesAsync()).ToList();

                // Get LocationGroupCommunity IDs used in PHD ScenarioChoiceLocation
                foreach (var result in phdResults)
                {
                    foreach (var scenarioChoice in result)
                    {
                        var scenarioChoiceLocations = (IDictionary<string, object>[])scenarioChoice.Value;
                        for (int j = 0; j < scenarioChoiceLocations.Length; j++)
                        {
                            phdUsedIds.Add(Convert.ToInt32(scenarioChoiceLocations[j][collectionId]));
                        }
                    }
                }
            }

            return phdUsedIds.Distinct<int>().ToList();
        }

        /// <summary>
        /// Check ScenarioChoiceLocationAttribute to see if any of the IDs from EDH are present.
        /// </summary>
        /// <param name="collectionId">Name of EDH ID field in PHD collection</param>
        /// <param name="edhUnusedIds">List of EDH IDs to check</param>
        /// <returns>List of EDH IDs found present in ScenarioChoiceLocationAttribute</returns>
        public async Task<List<int>> GetIdsUsedInLocationAttribute(string collectionId, List<int> edhUnusedIds)
        {
            // Process up to 100 IDs at a time (to avoid URI query from being to long)
            List<int> phdUsedIds = new List<int>();
            for (var index = 0; index < edhUnusedIds.Count; index += 100)
            {
                var attributeIdsToSearch = GetAttributeIdsToSearch(edhUnusedIds, index);

                // Setup PHD Client
                string queryIds = String.Join(',', attributeIdsToSearch);
                string filter = $"scenariochoicelocations/any(c: c/scenariochoicelocationattributes/any(a: a/{collectionId}  in ({queryIds})))";

                var phdClient = CreatePhdClient();
                var phdResults = (await phdClient.For("scenarioChoice")
                    .Filter(filter)
                    .Expand("scenariochoicelocations/scenariochoicelocationattributes")
                    .Select("scenariochoicelocations/scenariochoicelocationattributes")
                    .FindEntriesAsync()).ToList();

                foreach (var result in phdResults)
                {
                    foreach (var scenarioChoice in result)
                    {
                        var scenarioChoiceLocations = (IDictionary<string, object>[])scenarioChoice.Value;
                        foreach (var scenarioChoiceLocation in scenarioChoiceLocations)
                        {
                            foreach (var choiceLocation in scenarioChoiceLocation)
                            {
                                var scenarioChoiceLocationAttributes = (IDictionary<string, object>[])choiceLocation.Value;
                                foreach (var choiceLocationAttribute in scenarioChoiceLocationAttributes)
                                {
                                    phdUsedIds.Add(Convert.ToInt32(choiceLocationAttribute[collectionId]));
                                }
                            }
                        }
                    }
                }
            }

            return phdUsedIds.Distinct().ToList();
        }

        /// <summary>
        /// Check the specified PHD collection to see if any of the IDs from EDH are present.
        /// </summary>
        /// <param name="collection">Collection in PHD to check for EDH IDs</param>
        /// <param name="collectionId">Name of EDH ID field in PHD collection</param>
        /// <param name="edhUnusedIds">List of EDH IDs to check PHD collection for</param>
        /// <returns>List of EDH IDs found present in the specified PHD collection</returns>
        public async Task<List<int>> GetIdsUsedInCollection(string collection, string collectionId, List<int> edhUnusedIds)
        {
            // Process up to 100 IDs at a time (to avoid URI query from being to long)
            List<int> phdUsedIds = new List<int>();
            for (int i = 0; i < edhUnusedIds.Count; i += 100)
            {
                var attributeIdsToSearch = GetAttributeIdsToSearch(edhUnusedIds, i);

                // Setup PHD Client
                string queryIds = String.Join(',', attributeIdsToSearch);
                string filter = $"{collectionId} in ({queryIds})";

                var phdClient = CreatePhdClient();
                var phdResults = (await phdClient.For(collection)
                    .Filter(filter)
                    .Select(collectionId)
                    .FindEntriesAsync()).ToList();

                foreach (var result in phdResults)
                {
                    foreach (var scenarioChoice in result)
                    {
                        phdUsedIds.Add((int)scenarioChoice.Value);
                    }
                }
            }

            return phdUsedIds.Distinct().ToList();
        }

    }
}
