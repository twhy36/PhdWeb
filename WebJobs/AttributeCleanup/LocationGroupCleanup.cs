using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Simple.OData.Client;
using System.Web;

namespace AttributeCleanup
{
    public class LocationGroupCleanup
    {
        private IConfigurationRoot _configuration { get; }

        public LocationGroupCleanup(IConfigurationRoot configuration)
        {
            _configuration = configuration;
        }

        public async Task Run()
        {
            try
            {
                // Get IDs of unused LocationGroupCommunities
                List<int> unusedEdhLocationIds = await GetUnusedLocationGroupIds();

                // Get a list of LocationGroupCommunity IDs used in PHD ScenarioChoiceLocation
                PhdClient phdClient = new PhdClient(_configuration);

                // [sales].[ScenarioChoiceLocation]
                var taskPhdUsedLocationIds = phdClient.GetIdsUsedInPhd("scenariochoicelocations", "locationGroupCommunityId", unusedEdhLocationIds);
                // [dt].[DPChoice_LocationGroupCommunityAssoc]
                var taskChoiceLocation = phdClient.GetIdsUsedInCollection("dPChoiceLocationGroupCommunityAssocs", "locationGroupCommunityId", unusedEdhLocationIds);

                await Task.WhenAll(taskPhdUsedLocationIds, taskChoiceLocation);

                var phdUsedLocationIds = taskPhdUsedLocationIds.Result;
                var usedIdsInChoiceLocation = taskChoiceLocation.Result;

                phdUsedLocationIds.AddRange(usedIdsInChoiceLocation);

                // Remove LocationGroupCommunity IDs being used in PHD from EDH list
                List<int> locationGroupIdsToDelete = unusedEdhLocationIds.Except(phdUsedLocationIds).ToList();

                // Delete LocationGroupCommunity records
                await DeleteLocationGroups(locationGroupIdsToDelete);
            }
            catch(Exception ex)
            {
                Console.Out.WriteLine(ex.Message, ex.StackTrace);
            }
        }

        /// <summary>
        /// Get a list of LocationGroupCommunity IDs that are orphaned/not used from EDH
        /// </summary>
        /// <returns>List of LocationGroupCommunity IDs</returns>
        private async Task<List<int>> GetUnusedLocationGroupIds()
        {
            // Setup EDH API client
            string filter = "not(locationgroupoptioncommunityassocs/any()) and not(jobchoicelocations/any()) and not(jobplanoptionlocations/any()) and not(jobchangeorderplanoptionlocations/any())  and not(jobchangeorderchoicelocations/any())";
            string expand = "LocationGroupOptionCommunityAssocs,jobchoicelocations,jobplanoptionlocations,jobchangeorderplanoptionlocations,jobchangeorderchoicelocations";
            string select = "id,createdby";

            var edhClientSettings = new ODataClientSettings(new Uri(_configuration["edhSettings:url"]));
            edhClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {_configuration["edhSettings:apiKey"]}");
            };

            // Get IDs of Location Group Communities that are not being used (orphaned)
            ODataClient edhClient = new ODataClient(edhClientSettings);
            var unusedLocations = (await edhClient.For("LocationGroupCommunities")
                .Select(select)
                .Filter(filter)
                .Expand(expand)
                .FindEntriesAsync()).ToList();

            // Add all IDs returned to list
            List<int> unusedLocationIds = new List<int>();
            foreach (var location in unusedLocations)
            {
                if (!location["createdBy"].ToString().Contains("ssis_"))
                {
                    unusedLocationIds.Add(Convert.ToInt32(location["id"]));
                }
            }

            return unusedLocationIds;
        }

        /// <summary>
        /// Delete the LocationGroupCommunity records from EDH database. For each record to be deleted,
        /// delete any records in LocationGroupLocationCommunityAssoc and LocationGroupCommunityTag tables.
        /// </summary>
        /// <param name="locationGroupsToDelete">LocationGroupCommunity IDs of records to delete</param>
        /// <returns></returns>
        private async Task DeleteLocationGroups(List<int> locationGroupsToDelete)
        {
            // Setup EDH Client
            var edhClientSettings = new ODataClientSettings(new Uri(_configuration["edhSettings:url"]));
            edhClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {_configuration["edhSettings:apiKey"]}");
            };
            ODataClient edhClient = new ODataClient(edhClientSettings);
            var batch = new ODataBatch(edhClient);

            foreach (int locationGroupId in locationGroupsToDelete)
            {
                // Get all LocationGroupLocationCommunityAssoications for LocationGroupCommunityId
                var results = (await edhClient.For("locationgrouplocationcommunityassocs")
                    .Filter($"locationgroupcommunityid eq {locationGroupId}")
                    .FindEntriesAsync()).ToList();

                // Delete all LocationCommunity associations found
                string apiVer = _configuration["edhSettings:api-version"];
                foreach (var assoc in results)
                {
                    int locationCommunityId = Convert.ToInt32(assoc["locationCommunityId"]);

                    batch += c => c.For("LocationGroupLocationCommunityAssocs")
                        .Key(locationGroupId, locationCommunityId)
                        .DeleteEntryAsync();
                }

                // Get all LocationGroupCommunityTag associated to LocationGroupCommunityId
                results = (await edhClient.For("LocationGroupCommunityTags")
                    .Filter($"locationgroupcommunityid eq {locationGroupId}")
                    .FindEntriesAsync()).ToList();

                // Delete all tags found
                foreach (var locationGroupTag in results)
                {
                    string tag = locationGroupTag["tag"].ToString();

                    batch += c => c.For("LocationGroupCommunityTags")
                        .Key(locationGroupId, tag)
                        .DeleteEntryAsync();
                }

                // Delete LocationGroupCommunity
                batch += c => c.For("LocationGroupCommunities")
                    .Key(locationGroupId)
                    .DeleteEntryAsync();
            }

            await batch.ExecuteAsync();
        }
    }
}
